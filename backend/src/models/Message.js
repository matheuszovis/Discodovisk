const mongoose = require('mongoose');

/**
 * Schema da Mensagem
 * Armazena todas as mensagens enviadas nos canais ou DMs
 */
const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Conteúdo da mensagem é obrigatório'],
    maxlength: [2000, 'Mensagem deve ter no máximo 2000 caracteres']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  },
  // Para mensagens diretas (DMs)
  isDM: {
    type: Boolean,
    default: false
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    url: String,
    type: String
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);
