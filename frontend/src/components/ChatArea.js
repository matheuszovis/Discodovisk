import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import './ChatArea.css';

/**
 * Componente principal de chat
 * Exibe mensagens e permite enviar novas mensagens em tempo real
 */
function ChatArea({ channel, server }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (channel) {
      loadMessages();
      joinChannel();
    }

    return () => {
      if (channel) {
        leaveChannel();
      }
    };
  }, [channel]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Escuta por novas mensagens
    socket.on('message:new', handleNewMessage);
    
    // Escuta quando alguém está digitando
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [channel]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const response = await api.get(`/channels/${channel._id}/messages`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const joinChannel = () => {
    const socket = getSocket();
    if (socket && channel) {
      socket.emit('join:channel', channel._id);
    }
  };

  const leaveChannel = () => {
    const socket = getSocket();
    if (socket && channel) {
      socket.emit('leave:channel', channel._id);
    }
  };

  const handleNewMessage = (message) => {
    if (message.channel === channel._id) {
      setMessages((prev) => [...prev, message]);
    }
  };

  const handleTypingStart = ({ userId, username, channelId }) => {
    if (channelId === channel._id && userId !== user._id) {
      setTypingUsers((prev) => {
        if (!prev.some(u => u.userId === userId)) {
          return [...prev, { userId, username }];
        }
        return prev;
      });
    }
  };

  const handleTypingStop = ({ userId, channelId }) => {
    if (channelId === channel._id) {
      setTypingUsers((prev) => prev.filter(u => u.userId !== userId));
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const socket = getSocket();
    if (socket) {
      socket.emit('message:send', {
        content: newMessage,
        channelId: channel._id
      });

      setNewMessage('');
      stopTyping();
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    const socket = getSocket();
    if (!socket) return;

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
      socket.emit('typing:start', { channelId: channel._id });
    }

    // Limpa o timeout anterior
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Define um novo timeout para parar de digitar
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  };

  const stopTyping = () => {
    const socket = getSocket();
    if (socket && isTyping) {
      socket.emit('typing:stop', { channelId: channel._id });
      setIsTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    
    const currentDate = new Date(currentMsg.createdAt).toDateString();
    const prevDate = new Date(prevMsg.createdAt).toDateString();
    
    return currentDate !== prevDate;
  };

  return (
    <div className="chat-area">
      {/* Header do canal */}
      <div className="chat-header">
        <div className="channel-info">
          <span className="channel-icon">
            {channel.type === 'voice' ? '🔊' : channel.type === 'video' ? '📹' : '#'}
          </span>
          <h2>{channel.name}</h2>
        </div>
        {channel.description && (
          <p className="channel-description">{channel.description}</p>
        )}
      </div>

      {/* Lista de mensagens */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <h3>Bem-vindo ao #{channel.name}!</h3>
            <p>Este é o início do canal #{channel.name}.</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <React.Fragment key={message._id}>
              {shouldShowDateSeparator(message, messages[index - 1]) && (
                <div className="date-separator">
                  <span>{formatDate(message.createdAt)}</span>
                </div>
              )}
              <div className="message">
                <img 
                  src={message.author.avatar} 
                  alt={message.author.username}
                  className="message-avatar"
                />
                <div className="message-content">
                  <div className="message-header">
                    <span className="message-author">
                      {message.author.username}
                    </span>
                    <span className="message-time">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <div className="message-text">
                    {message.content}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))
        )}
        
        {/* Indicador de digitação */}
        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">
              {typingUsers.map(u => u.username).join(', ')} 
              {typingUsers.length === 1 ? ' está' : ' estão'} digitando...
            </span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Formulário de envio de mensagem */}
      <div className="message-input-container">
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={`Enviar mensagem em #${channel.name}`}
            className="message-input"
            maxLength={2000}
          />
          <button 
            type="submit" 
            className="send-button"
            disabled={!newMessage.trim()}
          >
            📤
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatArea;
