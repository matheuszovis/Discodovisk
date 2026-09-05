const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware de autenticação
 * Verifica se o usuário tem um token JWT válido
 * JWT (JSON Web Token) é usado para manter o usuário logado
 */
const auth = async (req, res, next) => {
  try {
    // Pega o token do header da requisição
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Busca o usuário no banco de dados
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

    // Adiciona o usuário na requisição para usar em outras rotas
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

module.exports = auth;

module.exports.adminOnly = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Apenas administradores podem executar esta ação.' });
  }
  next();
};
