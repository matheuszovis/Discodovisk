require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');
const { ensureDefaultAdmin } = require('./config/bootstrap');
const setupSocket = require('./socket');

// Importa as rotas
const authRoutes = require('./routes/auth');
const serverRoutes = require('./routes/servers');
const channelRoutes = require('./routes/channels');
const dmRoutes = require('./routes/dm');
const jukeboxRoutes = require('./routes/jukebox');

const app = express();
const server = http.createServer(app);
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const frontendOrigins = [
  ...new Set([...configuredOrigins, 'http://localhost:3000', 'http://localhost:3001'])
];

const isAllowedOrigin = (origin, callback) => {
  const allowed = !origin
    || frontendOrigins.includes(origin)
    || origin === 'null';
  callback(null, allowed);
};

/**
 * Configuração do Socket.io
 * Permite comunicação em tempo real entre cliente e servidor
 */
const io = new Server(server, {
  cors: {
    origin: isAllowedOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/**
 * Middlewares
 */
app.use(cors({
  origin: isAllowedOrigin,
  credentials: true
}));

app.use(express.json()); // Parse JSON no body das requisições
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded data

/**
 * Rotas da API REST
 */
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/jukebox', jukeboxRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 Bem-vindo ao Discordovisk API!',
    version: '1.0.0',
    status: 'online'
  });
});

// Rota para verificar saúde da aplicação
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

/**
 * Middleware de erro 404
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

/**
 * Middleware de tratamento de erros
 */
app.use((error, req, res, next) => {
  console.error('Erro:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Erro interno do servidor'
  });
});

/**
 * Configura os eventos do Socket.io
 */
setupSocket(io);

const PORT = process.env.PORT || 5000;

/**
 * Abre a porta antes da conexão com o banco para o Render detectar o serviço.
 */
const startServer = async () => {
  server.listen(PORT, '0.0.0.0', async () => {
    try {
      console.log('');
      console.log('🚀 ========================================');
      console.log('   Discordovisk Server está rodando!');
      console.log(`   Porta: ${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   URL local: http://localhost:${PORT}`);
      console.log('🚀 ========================================');
      console.log('');
      await connectDB();
      await ensureDefaultAdmin();
    } catch {
      process.exit(1);
    }
  });
};

startServer();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

module.exports = { app, server, io };
