import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import './ChannelList.css';

/**
 * Componente que exibe os canais de um servidor
 */
function ChannelList({
  server,
  selectedChannel,
  onSelectChannel,
  onOpenCall,
  activeCallChannel,
  activeCallParticipants
}) {
  const [channels, setChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [channelType, setChannelType] = useState('text');
  const [loading, setLoading] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState({});

  useEffect(() => {
    if (server) {
      loadChannels();
      
      // Entra no servidor via Socket.io
      const socket = getSocket();
      if (socket) {
        socket.emit('join:server', server._id);
      }
    }
  }, [server]);

  useEffect(() => {
    let cleanupSocket = () => {};
    let socketBound = false;
    let retryTimer;

    const setupSocket = () => {
      const socket = getSocket();
      if (!socket || !channels.length) return;

      const voiceChannels = channels.filter(
        (channel) => channel.type === 'voice' || channel.type === 'video'
      );
      const requestParticipants = () => {
        socket.emit('join:server', server._id);
        voiceChannels.forEach((channel) => {
          socket.emit('call:get-participants', { channelId: channel._id });
        });
      };
      const updateParticipants = ({ channelId, participants }) => {
        setVoiceParticipants((current) => ({ ...current, [channelId]: participants }));
      };
      const addParticipant = ({ channelId, userId, username, avatar }) => {
        setVoiceParticipants((current) => {
          const currentParticipants = current[channelId] || [];
          if (currentParticipants.some((participant) => participant.userId === userId)) return current;
          return { ...current, [channelId]: [...currentParticipants, { userId, username, avatar }] };
        });
      };
      const removeParticipant = ({ channelId, userId }) => {
        setVoiceParticipants((current) => ({
          ...current,
          [channelId]: (current[channelId] || []).filter((participant) => participant.userId !== userId)
        }));
      };

      socket.on('call:channel-participants', updateParticipants);
      socket.on('call:user-joined', addParticipant);
      socket.on('call:user-left', removeParticipant);
      socket.on('connect', requestParticipants);
      socketBound = true;
      requestParticipants();
      cleanupSocket = () => {
        socket.off('call:channel-participants', updateParticipants);
        socket.off('call:user-joined', addParticipant);
        socket.off('call:user-left', removeParticipant);
        socket.off('connect', requestParticipants);
        socketBound = false;
      };
    };

    const handleSocketReady = () => {
      cleanupSocket();
      setupSocket();
    };
    window.addEventListener('discordovisk:socket-ready', handleSocketReady);
    setupSocket();
    retryTimer = window.setInterval(() => {
      if (getSocket() && !socketBound) {
        setupSocket();
      } else if (getSocket()?.connected) {
        channels
          .filter((channel) => channel.type === 'voice' || channel.type === 'video')
          .forEach((channel) => getSocket().emit('call:get-participants', {
            channelId: channel._id
          }));
      }
    }, 2000);

    return () => {
      window.clearInterval(retryTimer);
      cleanupSocket();
      window.removeEventListener('discordovisk:socket-ready', handleSocketReady);
    };
  }, [channels, server]);

  const loadChannels = async () => {
    try {
      const response = await api.get(`/channels/${server._id}`);
      setChannels(response.data.channels);

      const socket = getSocket();
      response.data.channels
        .filter((channel) => channel.type === 'voice' || channel.type === 'video')
        .forEach((channel) => socket?.emit('call:get-participants', { channelId: channel._id }));
      
      // Seleciona o primeiro canal automaticamente
      if (response.data.channels.length > 0 && !selectedChannel) {
        onSelectChannel(response.data.channels[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post(`/channels/${server._id}`, {
        name: newChannelName,
        type: channelType
      });

      const newChannel = response.data.channel;
      setChannels([...channels, newChannel]);
      setNewChannelName('');
      setShowCreateModal(false);
      onSelectChannel(newChannel);
    } catch (error) {
      console.error('Erro ao criar canal:', error);
      alert('Erro ao criar canal');
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (type) => {
    switch (type) {
      case 'voice': return '🔊';
      case 'video': return '📹';
      default: return '#';
    }
  };

  const handleChannelClick = (channel) => {
    console.log('🖱️ Canal clicado:', channel.name, 'Tipo:', channel.type);
    
    if (channel.type === 'text') {
      console.log('📝 Canal de texto - chamando onSelectChannel');
      onSelectChannel(channel);
    } else if (channel.type === 'voice' || channel.type === 'video') {
      console.log('🎤 Canal de voz/vídeo - abrindo chamada');
      onOpenCall(channel);
    }
  };

  return (
    <div className="channel-list">
      <div className="server-header">
        <h3>{server?.name}</h3>
      </div>

      <div className="channels-container">
        {/* Canais de texto */}
        <div className="channel-category">
          <div className="category-header">
            <span>CANAIS DE TEXTO</span>
            <button 
              className="btn-add-channel"
              onClick={() => {
                setChannelType('text');
                setShowCreateModal(true);
              }}
              title="Criar canal"
            >
              +
            </button>
          </div>
          {channels
            .filter(ch => ch.type === 'text')
            .map((channel) => (
              <div key={channel._id} className="voice-channel-group">
                <div
                  className={`channel-item ${selectedChannel?._id === channel._id ? 'active' : ''}`}
                  onClick={() => handleChannelClick(channel)}
                >
                  <span className="channel-icon">{getChannelIcon(channel.type)}</span>
                  <span className="channel-name">{channel.name}</span>
                </div>
              </div>
            ))}
        </div>

        {/* Canais de voz */}
        <div className="channel-category">
          <div className="category-header">
            <span>CANAIS DE VOZ</span>
            <button 
              className="btn-add-channel"
              onClick={() => {
                setChannelType('voice');
                setShowCreateModal(true);
              }}
              title="Criar canal"
            >
              +
            </button>
          </div>
          {channels
            .filter(ch => ch.type === 'voice' || ch.type === 'video')
            .map((channel) => (
              <div key={channel._id} className="voice-channel-group">
                <div
                  className={`channel-item ${selectedChannel?._id === channel._id ? 'active' : ''}`}
                  onClick={() => handleChannelClick(channel)}
                >
                  <span className="channel-icon">{getChannelIcon(channel.type)}</span>
                  <span className="channel-name">{channel.name}</span>
                </div>
                {(channel._id === activeCallChannel?._id && activeCallParticipants?.length
                  ? activeCallParticipants
                  : voiceParticipants[channel._id] || []
                ).map((participant) => (
                  <div className="voice-participant" key={participant.userId} title={`${participant.username} está na chamada`}>
                    <img src={participant.avatar || 'https://via.placeholder.com/32'} alt="" />
                    <span>{participant.username}</span>
                    <span className="voice-status" aria-label="Em chamada">🔊</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      {/* Modal de criar canal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Criar Canal</h2>
            <form onSubmit={handleCreateChannel}>
              <div className="form-group">
                <label>Tipo do canal</label>
                <select 
                  value={channelType} 
                  onChange={(e) => setChannelType(e.target.value)}
                  disabled={loading}
                >
                  <option value="text">Texto</option>
                  <option value="voice">Voz</option>
                  <option value="video">Vídeo</option>
                </select>
              </div>
              <div className="form-group">
                <label>Nome do canal</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="novo-canal"
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
                  {loading ? 'Criando...' : 'Criar Canal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChannelList;
