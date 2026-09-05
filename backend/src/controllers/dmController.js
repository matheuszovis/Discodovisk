const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Envia uma mensagem direta (DM)
 */
exports.sendDM = async (req, res) => {
  try {
    const { content, recipientId } = req.body;

    const recipient = await User.findById(recipientId);

    if (!recipient) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const message = new Message({
      content,
      author: req.user._id,
      recipient: recipientId,
      isDM: true
    });

    await message.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('author', 'username avatar status')
      .populate('recipient', 'username avatar status');

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Erro ao enviar DM:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem.' });
  }
};

/**
 * Busca histórico de DMs com um usuário
 */
exports.getDMs = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({
      isDM: true,
      $or: [
        { author: req.user._id, recipient: userId },
        { author: userId, recipient: req.user._id }
      ]
    })
    .populate('author', 'username avatar status')
    .populate('recipient', 'username avatar status')
    .sort({ createdAt: -1 })
    .limit(limit);

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Erro ao buscar DMs:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens.' });
  }
};

/**
 * Lista todas as conversas DM do usuário
 */
exports.getConversations = async (req, res) => {
  try {
    // Busca as últimas mensagens DM do usuário
    const messages = await Message.aggregate([
      {
        $match: {
          isDM: true,
          $or: [
            { author: req.user._id },
            { recipient: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$author', req.user._id] },
              '$recipient',
              '$author'
            ]
          },
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // Popula os dados dos usuários
    await User.populate(messages, {
      path: '_id',
      select: 'username avatar status'
    });

    await Message.populate(messages, {
      path: 'lastMessage.author lastMessage.recipient',
      select: 'username avatar status'
    });

    res.json({ conversations: messages });
  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({ error: 'Erro ao buscar conversas.' });
  }
};
