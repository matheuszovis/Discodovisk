import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

function ChangePassword() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) return setError('As senhas não coincidem.');
    setSaving(true);
    const result = await changePassword(password);
    setSaving(false);
    if (result.success) navigate('/app');
    else setError(result.message);
  };

  return <div className="login-container"><div className="login-box">
    <div className="login-header"><h1>Crie uma nova senha</h1><p>Por segurança, sua senha foi redefinida pelo administrador.</p></div>
    <form className="login-form" onSubmit={submit}>
      {error && <div className="error-message">{error}</div>}
      <div className="form-group"><label>Nova senha</label><input type="password" minLength="6" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={saving} /></div>
      <div className="form-group"><label>Confirmar nova senha</label><input type="password" minLength="6" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required disabled={saving} /></div>
      <button className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar nova senha'}</button>
    </form>
  </div></div>;
}

export default ChangePassword;
