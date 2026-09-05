const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * Schema do Usuário
 * Define como os dados do usuário são estruturados no banco de dados
 */
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Nome de usuário é obrigatório'],
    unique: true,
    trim: true,
    minlength: [3, 'Nome deve ter no mínimo 3 caracteres'],
    maxlength: [30, 'Nome deve ter no máximo 30 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter no mínimo 6 caracteres']
  },
  avatar: {
    type: String,
    default: 'https://via.placeholder.com/150' // Avatar padrão
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away', 'busy'],
    default: 'offline'
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  servers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server' // Referência aos servidores que o usuário participa
  }],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Lista de amigos
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    }
  }]
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Middleware para criptografar a senha antes de salvar
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar senhas no login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
