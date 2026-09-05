const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

/**
 * Gera um token JWT para o usuário
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d' // Token expira em 7 dias
  });
};

/**
 * Registra um novo usuário
 */
exports.register = async (req, res) => {
  try {
    // Valida os dados recebidos
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Verifica se o usuário já existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'Usuário ou email já está em uso.' 
      });
    }

    // Cria o novo usuário (a senha será criptografada automaticamente)
    const user = new User({
      username,
      email,
      password
    });

    await user.save();

    // Gera o token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isAdmin: user.isAdmin,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('username email avatar status isAdmin mustChangePassword')
      .sort({ username: 1 });
    res.json({ users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    const temporaryPassword = `Dv!${crypto.randomBytes(6).toString('base64url')}`;
    user.password = temporaryPassword;
    user.mustChangePassword = true;
    await user.save();

    res.json({
      message: 'Senha temporária criada. O usuário precisará definir uma nova senha ao entrar.',
      temporaryPassword
    });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres.' });
    }

    const user = await User.findById(req.user._id);
    user.password = password;
    user.mustChangePassword = false;
    await user.save();

    res.json({
      message: 'Senha atualizada com sucesso.',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isAdmin: user.isAdmin,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
};

/**
 * Faz login do usuário
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const identifier = email?.trim().toLowerCase();

    // Aceita e-mail ou nome de usuário no campo de acesso.
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Verifica a senha
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Atualiza o status para online
    user.status = 'online';
    await user.save();

    // Gera o token
    const token = generateToken(user._id);

    res.json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        isAdmin: user.isAdmin,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
};

/**
 * Retorna informações do usuário atual
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('servers')
      .populate('friends', 'username avatar status');

    res.json({ user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar informações do usuário.' });
  }
};

/**
 * Atualiza o perfil do usuário
 */
exports.updateProfile = async (req, res) => {
  try {
    const { username, avatar, status } = req.body;
    const updates = {};

    if (username) updates.username = username;
    if (avatar) updates.avatar = avatar;
    if (status) updates.status = status;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ user });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
};

/**
 * Faz logout do usuário (atualiza status para offline)
 */
exports.logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { status: 'offline' });
    res.json({ message: 'Logout realizado com sucesso.' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro ao fazer logout.' });
  }
};
