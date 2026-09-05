import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Admin.css';

function Admin() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');

  useEffect(() => {
    api.get('/auth/users').then(({ data }) => setUsers(data.users)).catch(() => setMessage('Não foi possível carregar os usuários.'));
  }, []);

  const resetPassword = async () => {
    if (!selectedId) return setMessage('Selecione um usuário.');
    setMessage(''); setTemporaryPassword('');
    try {
      const { data } = await api.post(`/auth/users/${selectedId}/reset-password`);
      setTemporaryPassword(data.temporaryPassword);
      setMessage('Senha temporária criada. Compartilhe-a de forma segura; ela aparece apenas agora.');
      setUsers((current) => current.map((item) => item._id === selectedId ? { ...item, mustChangePassword: true } : item));
    } catch (error) { setMessage(error.response?.data?.error || 'Não foi possível redefinir a senha.'); }
  };

  if (!user?.isAdmin) return <div className="admin-page"><p>Acesso restrito.</p><Link to="/app">Voltar</Link></div>;
  return <main className="admin-page"><Link to="/app">← Voltar ao aplicativo</Link><h1>Administração de usuários</h1><p>Redefina a senha e o usuário será obrigado a criar uma senha nova no próximo acesso.</p>
    <label htmlFor="user-select">Usuário</label>
    <select id="user-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}><option value="">Selecione um usuário</option>{users.map((item) => <option key={item._id} value={item._id}>{item.username} — {item.email}{item.isAdmin ? ' (admin)' : ''}</option>)}</select>
    <button onClick={resetPassword}>Redefinir senha</button>
    {message && <p className="admin-message">{message}</p>}
    {temporaryPassword && <div className="temporary-password"><strong>Senha temporária:</strong><code>{temporaryPassword}</code></div>}
  </main>;
}

export default Admin;
