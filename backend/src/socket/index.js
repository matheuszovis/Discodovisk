const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

const activeCalls = new Map();

/**
 * Configuração do Socket.io para comunicação em tempo real
 * Socket.io permite enviar e receber mensagens instantaneamente
 */
module.exports = (io) => {
  // Middleware de autenticação para Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      // Verifica o token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('Usuário não encontrado'));
      }

      // Adiciona o usuário ao socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Autenticação falhou'));
    }
  });

  // Quando um usuário se conecta
  io.on('connection', (socket) => {
    console.log(`✅ Usuário conectado: ${socket.user.username} (${socket.user._id})`);

    // Adiciona o usuário à sua sala pessoal
    socket.join(`user:${socket.user._id}`);

    // Atualiza status para online
    updateUserStatus(socket.user._id, 'online');

    /**
     * Entrar em um servidor
     * Isso permite receber mensagens de todos os canais do servidor
     */
    socket.on('join:server', (serverId) => {
      socket.join(`server:${serverId}`);
      console.log(`${socket.user.username} entrou no servidor ${serverId}`);
    });

    /**
     * Sair de um servidor
     */
    socket.on('leave:server', (serverId) => {
      socket.leave(`server:${serverId}`);
      console.log(`${socket.user.username} saiu do servidor ${serverId}`);
    });

    /**
     * Entrar em um canal
     */
    socket.on('join:channel', (channelId) => {
      socket.join(`channel:${channelId}`);
      console.log(`${socket.user.username} entrou no canal ${channelId}`);
    });

    /**
     * Sair de um canal
     */
    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel:${channelId}`);
      console.log(`${socket.user.username} saiu do canal ${channelId}`);
    });

    /**
     * Enviar mensagem em um canal
     */
    socket.on('message:send', async (data) => {
      try {
        const { content, channelId } = data;

        // Salva a mensagem no banco de dados
        const message = new Message({
          content,
          author: socket.user._id,
          channel: channelId,
          isDM: false
        });

        await message.save();

        // Popula os dados do autor
        await message.populate('author', 'username avatar status');

        // Envia a mensagem para todos no canal
        io.to(`channel:${channelId}`).emit('message:new', message);
      } catch (error) {
        console.error('Erro ao enviar mensagem:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem' });
      }
    });

    /**
     * Enviar mensagem direta (DM)
     */
    socket.on('dm:send', async (data) => {
      try {
        const { content, recipientId } = data;

        // Salva a mensagem no banco de dados
        const message = new Message({
          content,
          author: socket.user._id,
          recipient: recipientId,
          isDM: true
        });

        await message.save();

        // Popula os dados
        await message.populate('author', 'username avatar status');
        await message.populate('recipient', 'username avatar status');

        // Envia para o remetente e destinatário
        io.to(`user:${socket.user._id}`).emit('dm:new', message);
        io.to(`user:${recipientId}`).emit('dm:new', message);
      } catch (error) {
        console.error('Erro ao enviar DM:', error);
        socket.emit('error', { message: 'Erro ao enviar mensagem direta' });
      }
    });

    /**
     * Usuário está digitando
     */
    socket.on('typing:start', (data) => {
      const { channelId } = data;
      socket.to(`channel:${channelId}`).emit('typing:start', {
        userId: socket.user._id,
        username: socket.user.username,
        channelId
      });
    });

    /**
     * Usuário parou de digitar
     */
    socket.on('typing:stop', (data) => {
      const { channelId } = data;
      socket.to(`channel:${channelId}`).emit('typing:stop', {
        userId: socket.user._id,
        channelId
      });
    });

    /**
     * Chamada de voz/vídeo - WebRTC signaling
     */
    socket.on('call:join', (data) => {
      const { channelId, serverId, userId, username, avatar } = data;
      const room = `call:${channelId}`;
      const serverRoom = serverId ? `server:${serverId}` : room;

      io.in(room).fetchSockets().then((existingSockets) => {
        socket.join(room);
        activeCalls.set(channelId, [
          ...existingSockets.map((participantSocket) => ({
            userId: participantSocket.user._id.toString(),
            username: participantSocket.user.username,
            avatar: participantSocket.user.avatar
          })),
          {
            userId: socket.user._id.toString(),
            username: socket.user.username,
            avatar: socket.user.avatar
          }
        ]);

        socket.emit('call:participants', existingSockets.map((participantSocket) => ({
          userId: participantSocket.user._id.toString(),
          username: participantSocket.user.username,
          avatar: participantSocket.user.avatar
        })));

        socket.to(serverRoom).emit('call:user-joined', {
          userId,
          username,
          avatar,
          channelId
        });

        broadcastCallParticipants(io, room, channelId, serverRoom);
      }).catch((error) => {
        console.error('Erro ao entrar na chamada:', error);
      });
    });

    socket.on('call:leave', (data) => {
      const { channelId, serverId, userId } = data;
      const serverRoom = serverId ? `server:${serverId}` : `call:${channelId}`;
      // Sai da sala do canal
      socket.leave(`call:${channelId}`);
      // Notifica outros participantes
      socket.to(serverRoom).emit('call:user-left', {
        userId,
        channelId
      });
      broadcastCallParticipants(io, `call:${channelId}`, channelId, serverRoom);
    });

    socket.on('call:get-participants', async ({ channelId }) => {
      const room = `call:${channelId}`;
      const participants = activeCalls.get(channelId) || await getCallParticipants(io, room);
      socket.emit('call:channel-participants', { channelId, participants });
    });

    socket.on('call:signal', (data) => {
      const { signal, recipientId, channelId, senderAvatar, senderUsername } = data;
      io.to(`user:${recipientId}`).emit('call:signal', {
        signal,
        senderId: socket.user._id,
        senderAvatar,
        senderUsername,
        channelId
      });
    });

    socket.on('call:screen-share', (data) => {
      const { channelId, isSharing } = data;
      socket.to(`call:${channelId}`).emit('call:screen-share', {
        userId: socket.user._id.toString(),
        isSharing
      });
    });

    socket.on('call:video-state', ({ channelId, isVideoOff }) => {
      socket.to(`call:${channelId}`).emit('call:video-state', {
        userId: socket.user._id.toString(),
        isVideoOff
      });
    });

    socket.on('call:end', (data) => {
      const { recipientId, channelId } = data;
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('call:end', {
          userId: socket.user._id
        });
      }
      if (channelId) {
        socket.leave(`call:${channelId}`);
      }
    });

    /**
     * Atualizar status do usuário
     */
    socket.on('status:update', async (status) => {
      try {
        await updateUserStatus(socket.user._id, status);
        
        // Notifica todos os amigos sobre a mudança de status
        const user = await User.findById(socket.user._id).populate('friends');
        user.friends.forEach(friend => {
          io.to(`user:${friend._id}`).emit('status:update', {
            userId: socket.user._id,
            status
          });
        });
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
      }
    });

    /**
     * Quando o usuário desconecta
     */
    socket.on('disconnect', () => {
      const callRooms = [...socket.rooms].filter((room) => room.startsWith('call:'));
      console.log(`❌ Usuário desconectado: ${socket.user.username}`);
      updateUserStatus(socket.user._id, 'offline');
      callRooms.forEach((room) => {
        const channelId = room.replace('call:', '');
        setTimeout(() => broadcastCallParticipants(io, room, channelId), 0);
      });
    });
  });
};

/**
 * Função auxiliar para atualizar o status do usuário
 */
async function updateUserStatus(userId, status) {
  try {
    await User.findByIdAndUpdate(userId, { status });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
  }
}

async function getCallParticipants(io, room) {
  const sockets = await io.in(room).fetchSockets();
  return sockets.map((participantSocket) => ({
    userId: participantSocket.user._id.toString(),
    username: participantSocket.user.username,
    avatar: participantSocket.user.avatar
  }));
}

async function broadcastCallParticipants(io, room, channelId, audienceRoom = room) {
  try {
    const participants = await getCallParticipants(io, room);
    if (participants.length) {
      activeCalls.set(channelId, participants);
    } else {
      activeCalls.delete(channelId);
    }
    const presence = { channelId, participants };
    io.to(audienceRoom).emit('call:channel-participants', presence);
    io.emit('call:channel-participants', presence);
  } catch (error) {
    console.error('Erro ao atualizar participantes da chamada:', error);
  }
}
