const mongoose = require('mongoose');

/**
 * Schema do Servidor
 * Um servidor é como uma comunidade/guild que contém canais
 */
const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do servidor é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  description: {
    type: String,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  icon: {
    type: String,
    default: 'https://via.placeholder.com/100'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  inviteCode: {
    type: String,
    unique: true,
    default: () => Math.random().toString(36).substring(2, 10)
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Server', serverSchema);
