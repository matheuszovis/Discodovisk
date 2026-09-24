import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';
import siteLogo from '../assets/logo-do-site.png';

/**
 * Página de Login
 * Permite que o usuário faça login na aplicação
 */
function Login() {
  const [savedCredentials] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('savedCredentials') || 'null');
    } catch {
      return null;
    }
  });
  const [email, setEmail] = useState(savedCredentials?.email || '');
  const [password, setPassword] = useState(savedCredentials?.password || '');
  const [rememberLogin, setRememberLogin] = useState(Boolean(savedCredentials));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (rememberLogin) {
        localStorage.setItem('savedCredentials', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('savedCredentials');
      }
      navigate(result.mustChangePassword ? '/alterar-senha' : '/app');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src={siteLogo} alt="Discordovisk" className="login-logo" />
          <p>Bem-vindo de volta!</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">E-mail ou usuário</label>
            <input
              type="text"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com ou seu_usuario"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <label className="remember-login">
            <input
              type="checkbox"
              checked={rememberLogin}
              onChange={(e) => setRememberLogin(e.target.checked)}
              disabled={loading}
            />
            <span>Salvar login e senha neste dispositivo</span>
          </label>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div className="login-footer">
            <p>
              Não tem uma conta? <Link to="/register">Registrar-se</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
