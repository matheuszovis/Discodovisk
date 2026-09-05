const Channel = require('../models/Channel');
const Message = require('../models/Message');
const Server = require('../models/Server');

/**
 * Cria um novo canal em um servidor
 */
exports.createChannel = async (req, res) => {
  try {
    const { name, type, description, isPrivate } = req.body;
    const { serverId } = req.params;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor não encontrado.' });
    }

    // Verifica permissões
    const member = server.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Sem permissão para criar canais.' });
    }

    const channel = new Channel({
      name,
      type: type || 'text',
      description,
      server: serverId,
      isPrivate: isPrivate || false
    });

    await channel.save();

    // Adiciona o canal ao servidor
    server.channels.push(channel._id);
    await server.save();

    res.status(201).json({ 
      message: 'Canal criado com sucesso!',
      channel 
    });
  } catch (error) {
    console.error('Erro ao criar canal:', error);
    res.status(500).json({ error: 'Erro ao criar canal.' });
  }
};

/**
 * Lista canais de um servidor
 */
exports.getChannels = async (req, res) => {
  try {
    const { serverId } = req.params;

    const channels = await Channel.find({ server: serverId });

    res.json({ channels });
  } catch (error) {
    console.error('Erro ao buscar canais:', error);
    res.status(500).json({ error: 'Erro ao buscar canais.' });
  }
};

/**
 * Busca mensagens de um canal
 */
exports.getMessages = async (req, res) => {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const messages = await Message.find({ 
      channel: channelId,
      isDM: false 
    })
    .populate('author', 'username avatar status')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
};

/**
 * Envia uma mensagem em um canal
 */
exports.sendMessage = async (req, res) => {
  try {
    const { content, attachments } = req.body;
    const { channelId } = req.params;

    const message = new Message({
      content,
      author: req.user._id,
      channel: channelId,
      attachments: attachments || []
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username avatar status');

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
};

/**
 * Deleta um canal
 */
exports.deleteChannel = async (req, res) => {
  try {
    const { serverId, channelId } = req.params;

    const server = await Server.findById(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor não encontrado.' });
    }

    // Verifica permissões
    const member = server.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    await Channel.findByIdAndDelete(channelId);
    
    // Remove o canal do servidor
    server.channels = server.channels.filter(
      c => c.toString() !== channelId
    );
    await server.save();

    res.json({ message: 'Canal deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar canal:', error);
    res.status(500).json({ error: 'Erro ao deletar canal.' });
  }
};
