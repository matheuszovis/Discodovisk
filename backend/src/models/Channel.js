const mongoose = require('mongoose');

/**
 * Schema do Canal
 * Canais são onde as mensagens são enviadas dentro de um servidor
 */
const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do canal é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'video'],
    default: 'text'
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  description: {
    type: String,
    maxlength: [300, 'Descrição deve ter no máximo 300 caracteres']
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  allowedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Channel', channelSchema);
