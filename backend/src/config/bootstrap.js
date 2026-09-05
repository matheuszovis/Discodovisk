const User = require('../models/User');

const ensureDefaultAdmin = async () => {
  const email = 'admin@discordovisk.local';
  const existingAdmin = await User.findOne({ email });

  if (existingAdmin) return;

  await User.create({
    username: 'admin',
    email,
    password: '@dmin102030',
    isAdmin: true
  });

  console.log('✅ Usuário administrador padrão criado.');
};

module.exports = { ensureDefaultAdmin };
