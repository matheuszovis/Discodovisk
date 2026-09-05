const express = require('express');
const router = express.Router();
const channelController = require('../controllers/channelController');
const auth = require('../middleware/auth');

/**
 * Rotas de canais
 * Todas as rotas requerem autenticação
 */

// POST /api/channels/:serverId - Criar novo canal
router.post('/:serverId', auth, channelController.createChannel);

// GET /api/channels/:serverId - Listar canais de um servidor
router.get('/:serverId', auth, channelController.getChannels);

// GET /api/channels/:channelId/messages - Buscar mensagens de um canal
router.get('/:channelId/messages', auth, channelController.getMessages);

// POST /api/channels/:channelId/messages - Enviar mensagem em um canal
router.post('/:channelId/messages', auth, channelController.sendMessage);

// DELETE /api/channels/:serverId/:channelId - Deletar canal
router.delete('/:serverId/:channelId', auth, channelController.deleteChannel);

module.exports = router;
