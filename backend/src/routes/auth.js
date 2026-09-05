const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { adminOnly } = auth;

/**
 * Rotas de autenticação
 */

// POST /api/auth/register - Registrar novo usuário
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Nome de usuário deve ter entre 3 e 30 caracteres'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Senha deve ter no mínimo 6 caracteres')
  ],
  authController.register
);

// POST /api/auth/login - Fazer login
router.post('/login', authController.login);

router.get('/users', auth, adminOnly, authController.listUsers);
router.post('/users/:userId/reset-password', auth, adminOnly, authController.resetUserPassword);
router.post('/change-password', auth, authController.changePassword);

// GET /api/auth/me - Obter informações do usuário atual (requer autenticação)
router.get('/me', auth, authController.getMe);

// PUT /api/auth/profile - Atualizar perfil do usuário
router.put('/profile', auth, authController.updateProfile);

// POST /api/auth/logout - Fazer logout
router.post('/logout', auth, authController.logout);

module.exports = router;
