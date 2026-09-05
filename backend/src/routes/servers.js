const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const auth = require('../middleware/auth');

/**
 * Rotas de servidores
 * Todas as rotas requerem autenticação
 */

// POST /api/servers - Criar novo servidor
router.post('/', auth, serverController.createServer);

// GET /api/servers - Listar todos os servidores do usuário
router.get('/', auth, serverController.getMyServers);

// GET /api/servers/:serverId - Buscar detalhes de um servidor
router.get('/:serverId', auth, serverController.getServer);

// PUT /api/servers/:serverId - Atualizar servidor
router.put('/:serverId', auth, serverController.updateServer);

// POST /api/servers/join - Entrar em um servidor usando código de convite
router.post('/join', auth, serverController.joinServer);

// DELETE /api/servers/:serverId/leave - Sair de um servidor
router.delete('/:serverId/leave', auth, serverController.leaveServer);

module.exports = router;
