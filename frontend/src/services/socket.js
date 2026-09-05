import { io } from 'socket.io-client';

/**
 * Configuração do Socket.io para comunicação em tempo real
 */
let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) {
    return socket;
  }

  const socketUrl = process.env.REACT_APP_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
  socket = io(socketUrl, {
    auth: {
      token
    },
    transports: ['websocket'], // Força usar WebSocket diretamente
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    upgrade: false, // Não tenta fazer upgrade de polling para websocket
    forceNew: false
  });

  socket.on('connect', () => {
    console.log('✅ Conectado ao servidor Socket.io');
    window.dispatchEvent(new Event('discordovisk:socket-ready'));
  });

  socket.on('disconnect', () => {
    console.log('❌ Desconectado do servidor Socket.io');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Erro de conexão:', error.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  return socket;
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket
};
