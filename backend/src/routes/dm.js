const express = require('express');
const router = express.Router();
const dmController = require('../controllers/dmController');
const auth = require('../middleware/auth');

/**
 * Rotas de mensagens diretas (DM)
 * Todas as rotas requerem autenticação
 */

// POST /api/dm - Enviar mensagem direta
router.post('/', auth, dmController.sendDM);

// GET /api/dm/:userId - Buscar histórico de DMs com um usuário
router.get('/:userId', auth, dmController.getDMs);

// GET /api/dm - Listar todas as conversas DM
router.get('/', auth, dmController.getConversations);

module.exports = router;
