const Server = require('../models/Server');
const Channel = require('../models/Channel');
const User = require('../models/User');

/**
 * Cria um novo servidor
 */
exports.createServer = async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    // Cria o servidor
    const server = new Server({
      name,
      description,
      icon,
      owner: req.user._id,
      members: [{
        user: req.user._id,
        role: 'owner'
      }]
    });

    await server.save();

    // Cria um canal padrão "geral"
    const generalChannel = new Channel({
      name: 'geral',
      type: 'text',
      server: server._id,
      description: 'Canal geral do servidor'
    });

    await generalChannel.save();

    // Adiciona o canal ao servidor
    server.channels.push(generalChannel._id);
    await server.save();

    // Adiciona o servidor à lista do usuário
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });

    res.status(201).json({ 
      message: 'Servidor criado com sucesso!',
      server 
    });
  } catch (error) {
    console.error('Erro ao criar servidor:', error);
    res.status(500).json({ error: 'Erro ao criar servidor.' });
  }
};

/**
 * Lista todos os servidores do usuário
 */
exports.getMyServers = async (req, res) => {
  try {
    const servers = await Server.find({
      'members.user': req.user._id
    })
    .populate('owner', 'username avatar')
    .populate('channels');

    res.json({ servers });
  } catch (error) {
    console.error('Erro ao buscar servidores:', error);
    res.status(500).json({ error: 'Erro ao buscar servidores.' });
  }
};

/**
 * Busca detalhes de um servidor específico
 */
exports.getServer = async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId)
      .populate('owner', 'username avatar')
      .populate('channels')
      .populate('members.user', 'username avatar status');

    if (!server) {
      return res.status(404).json({ error: 'Servidor não encontrado.' });
    }

    // Verifica se o usuário é membro
    const isMember = server.members.some(
      member => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ error: 'Você não é membro deste servidor.' });
    }

    res.json({ server });
  } catch (error) {
    console.error('Erro ao buscar servidor:', error);
    res.status(500).json({ error: 'Erro ao buscar servidor.' });
  }
};

/**
 * Atualiza um servidor
 */
exports.updateServer = async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const server = await Server.findById(req.params.serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor não encontrado.' });
    }

    // Verifica se o usuário é owner ou admin
    const member = server.members.find(
      m => m.user.toString() === req.user._id.toString()
    );

    if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
      return res.status(403).json({ error: 'Sem permissão.' });
    }

    if (name) server.name = name;
    if (description) server.description = description;
    if (icon) server.icon = icon;

    await server.save();

    res.json({ 
      message: 'Servidor atualizado com sucesso!',
      server 
    });
  } catch (error) {
    console.error('Erro ao atualizar servidor:', error);
    res.status(500).json({ error: 'Erro ao atualizar servidor.' });
  }
};

/**
 * Entra em um servidor usando código de convite
 */
exports.joinServer = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const server = await Server.findOne({ inviteCode });

    if (!server) {
      return res.status(404).json({ error: 'Código de convite inválido.' });
    }

    // Verifica se já é membro
    const isMember = server.members.some(
      m => m.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({ error: 'Você já é membro deste servidor.' });
    }

    // Adiciona o usuário ao servidor
    server.members.push({
      user: req.user._id,
      role: 'member'
    });

    await server.save();

    // Adiciona o servidor à lista do usuário
    await User.findByIdAndUpdate(req.user._id, {
      $push: { servers: server._id }
    });

    res.json({ 
      message: 'Você entrou no servidor com sucesso!',
      server 
    });
  } catch (error) {
    console.error('Erro ao entrar no servidor:', error);
    res.status(500).json({ error: 'Erro ao entrar no servidor.' });
  }
};

/**
 * Sai de um servidor
 */
exports.leaveServer = async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);

    if (!server) {
      return res.status(404).json({ error: 'Servidor não encontrado.' });
    }

    // Verifica se é o owner
    if (server.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ 
        error: 'Você é o dono do servidor. Transfira a propriedade antes de sair.' 
      });
    }

    // Remove o usuário dos membros
    server.members = server.members.filter(
      m => m.user.toString() !== req.user._id.toString()
    );

    await server.save();

    // Remove o servidor da lista do usuário
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { servers: server._id }
    });

    res.json({ message: 'Você saiu do servidor.' });
  } catch (error) {
    console.error('Erro ao sair do servidor:', error);
    res.status(500).json({ error: 'Erro ao sair do servidor.' });
  }
};
