import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ServerList from '../components/ServerList';
import ChannelList from '../components/ChannelList';
import ChatArea from '../components/ChatArea';
import VideoCall from '../components/VideoCall';
import './Home.css';

/**
 * Página principal do aplicativo
 * Exibe servidores, canais e área de chat
 */
function Home() {
  const { user, logout } = useAuth();
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [callChannel, setCallChannel] = useState(null);
  const [activeCallParticipants, setActiveCallParticipants] = useState([]);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const { updateProfile } = useAuth();

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
  };

  const handleOpenCall = (channel) => {
    setCallChannel(channel);
  };

  const handleOpenProfileSettings = () => {
    setAvatarUrl(user?.avatar || '');
    setProfileError('');
    setShowProfileSettings(true);
  };

  const handleAvatarFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Escolha um arquivo de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileError('A imagem deve ter no máximo 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;

        const context = canvas.getContext('2d');
        const cropSize = Math.min(image.width, image.height);
        const sourceX = (image.width - cropSize) / 2;
        const sourceY = (image.height - cropSize) / 2;
        context.drawImage(
          image,
          sourceX,
          sourceY,
          cropSize,
          cropSize,
          0,
          0,
          size,
          size
        );

        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.82));
        setProfileError('');
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setSavingProfile(true);

    const result = await updateProfile({ avatar: avatarUrl.trim() });
    if (result.success) {
      setShowProfileSettings(false);
    } else {
      setProfileError(result.message);
    }

    setSavingProfile(false);
  };

  return (
    <div className="home-container">
      {/* Barra lateral com lista de servidores */}
      <ServerList 
        selectedServer={selectedServer}
        onSelectServer={setSelectedServer}
      />

      {/* Lista de canais do servidor selecionado */}
      {selectedServer && (
        <ChannelList 
          server={selectedServer}
          selectedChannel={selectedChannel}
          onSelectChannel={handleSelectChannel}
          onOpenCall={handleOpenCall}
          activeCallChannel={callChannel}
          activeCallParticipants={activeCallParticipants}
        />
      )}

      {/* Área de chat */}
      <div className="main-content">
        {selectedChannel ? (
          <ChatArea 
            channel={selectedChannel}
            server={selectedServer}
          />
        ) : (
          <div className="no-channel-selected">
            <h2>Bem-vindo ao Discordovisk, {user?.username}!</h2>
            <p>Selecione um servidor e um canal para começar a conversar</p>
          </div>
        )}
      </div>

      {/* Barra de usuário */}
      <div className="user-bar">
        <div className="user-info">
          <img 
            src={user?.avatar || 'https://via.placeholder.com/40'} 
            alt="Avatar" 
            className="user-avatar"
          />
          <div className="user-details">
            <span className="username">{user?.username}</span>
            <span className={`status status-${user?.status}`}>
              {user?.status}
            </span>
          </div>
        </div>
        <div className="user-actions">
          {user?.isAdmin && <Link to="/admin" className="btn-user-action" title="Administração">🛡️</Link>}
          <button
            onClick={handleOpenProfileSettings}
            className="btn-user-action"
            title="Configurações do perfil"
          >
            ⚙️
          </button>
          <button onClick={logout} className="btn-logout" title="Sair">
            🚪
          </button>
        </div>
      </div>

      {showProfileSettings && (
        <div
          className="modal-overlay"
          onClick={() => setShowProfileSettings(false)}
        >
          <div
            className="profile-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="profile-modal-header">
              <h2>Configurações do perfil</h2>
              <button
                type="button"
                className="profile-close"
                onClick={() => setShowProfileSettings(false)}
                title="Fechar"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="profile-form">
              <img
                src={avatarUrl || 'https://via.placeholder.com/96'}
                alt="Pré-visualização do avatar"
                className="profile-preview"
                onError={(event) => {
                  event.currentTarget.src = 'https://via.placeholder.com/96';
                }}
              />
              <label htmlFor="avatar-file">Foto de perfil</label>
              <input
                id="avatar-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarFile}
                disabled={savingProfile}
              />
              <label htmlFor="avatar-url">Ou use uma URL</label>
              <input
                id="avatar-url"
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://exemplo.com/minha-foto.jpg"
                disabled={savingProfile}
              />
              {profileError && <p className="profile-error">{profileError}</p>}
              <div className="profile-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowProfileSettings(false)}
                  disabled={savingProfile}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={savingProfile}
                >
                  {savingProfile ? 'Salvando...' : 'Salvar foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Componente de chamada de vídeo */}
      {callChannel && (
        <VideoCall 
          channel={callChannel}
          onParticipantsChange={setActiveCallParticipants}
          onClose={() => {
            console.log('🔒 Fechando chamada, limpando callChannel');
            setCallChannel(null);
            setActiveCallParticipants([]);
          }}
        />
      )}
    </div>
  );
}

export default Home;
