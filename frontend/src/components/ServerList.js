import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import './ServerList.css';

/**
 * Componente que exibe a lista de servidores do usuário
 */
function ServerList({ selectedServer, onSelectServer, updatedServer }) {
  const [servers, setServers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadServers();
  }, []);

  useEffect(() => {
    if (!updatedServer) return;
    setServers((currentServers) => currentServers.map((server) => (
      server._id === updatedServer._id ? updatedServer : server
    )));
  }, [updatedServer]);

  const loadServers = async () => {
    try {
      const response = await api.get('/servers');
      setServers(response.data.servers);
      
      // Seleciona o primeiro servidor automaticamente
      if (response.data.servers.length > 0 && !selectedServer) {
        onSelectServer(response.data.servers[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar servidores:', error);
    }
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/servers', {
        name: newServerName
      });

      const newServer = response.data.server;
      setServers([...servers, newServer]);
      setNewServerName('');
      setShowCreateModal(false);
      onSelectServer(newServer);

      // Entra no servidor via Socket.io
      const socket = getSocket();
      if (socket) {
        socket.emit('join:server', newServer._id);
      }
    } catch (error) {
      console.error('Erro ao criar servidor:', error);
      alert('Erro ao criar servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinServer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setJoinError('');

    try {
      const response = await api.post('/servers/join', {
        inviteCode: inviteCode.trim()
      });
      const joinedServer = response.data.server;
      const updatedServers = [...servers, joinedServer];
      setServers(updatedServers);
      setInviteCode('');
      setShowJoinModal(false);
      onSelectServer(joinedServer);

      const socket = getSocket();
      if (socket) socket.emit('join:server', joinedServer._id);
    } catch (error) {
      setJoinError(error.response?.data?.error || 'Não foi possível entrar no servidor.');
    } finally {
      setLoading(false);
    }
  };

  const copyInviteCode = async () => {
    if (!selectedServer?.inviteCode) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(selectedServer.inviteCode);
    } else {
      const input = document.createElement('textarea');
      input.value = selectedServer.inviteCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }

    alert('Código de convite copiado!');
  };

  return (
    <div className="server-list">
      {/* Botão Home */}
      <div className="server-icon home-icon" title="Home">
        🏠
      </div>

      <div className="server-separator"></div>

      {/* Lista de servidores */}
      {servers.map((server) => (
        <div
          key={server._id}
          className={`server-icon ${selectedServer?._id === server._id ? 'active' : ''}`}
          onClick={() => onSelectServer(server)}
          title={server.name}
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} />
          ) : (
            <span>{server.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
      ))}

      {/* Botão para criar servidor */}
      <div 
        className="server-icon add-server"
        onClick={() => setShowCreateModal(true)}
        title="Adicionar servidor"
      >
        +
      </div>

      <div
        className="server-icon join-server"
        onClick={() => {
          setJoinError('');
          setShowJoinModal(true);
        }}
        title="Entrar com código de convite"
      >
        🔗
      </div>

      {selectedServer && (
        <div
          className="server-icon invite-server"
          onClick={() => setShowInviteModal(true)}
          title="Compartilhar convite do servidor selecionado"
        >
          📩
        </div>
      )}

      {/* Modal de criar servidor */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Criar Servidor</h2>
            <form onSubmit={handleCreateServer}>
              <div className="form-group">
                <label>Nome do servidor</label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  placeholder="Meu servidor incrível"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="modal-buttons">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Entrar em um servidor</h2>
            <form onSubmit={handleJoinServer}>
              <div className="form-group">
                <label>Código de convite</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Cole o código aqui"
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>
              {joinError && <p className="server-error">{joinError}</p>}
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && selectedServer && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Convidar para {selectedServer.name}</h2>
            <p className="invite-description">Envie este código para a outra pessoa entrar no servidor:</p>
            <div className="invite-code">{selectedServer.inviteCode}</div>
            <div className="modal-buttons">
              <button type="button" onClick={() => setShowInviteModal(false)} className="btn-secondary">
                Fechar
              </button>
              <button type="button" onClick={copyInviteCode} className="btn-primary">
                Copiar código
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerList;
