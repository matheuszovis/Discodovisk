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

const app = express();
const server = http.createServer(app);
const frontendOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

/**
 * Configuração do Socket.io
 * Permite comunicação em tempo real entre cliente e servidor
 */
const io = new Server(server, {
  cors: {
    origin: frontendOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/**
 * Middlewares
 */
app.use(cors({
  origin: frontendOrigins,
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
 * Inicia o servidor somente depois que o banco estiver disponível.
 * Assim, requisições de login nunca chegam a uma API sem banco conectado.
 */
const startServer = async () => {
  try {
    await connectDB();
    await ensureDefaultAdmin();

    // Sem host explícito, o Node aceita conexões IPv4 e IPv6. Isso permite
    // que navegadores que resolvem localhost como ::1 acessem a API.
    server.listen(PORT, () => {
      console.log('');
      console.log('🚀 ========================================');
      console.log('   Discordovisk Server está rodando!');
      console.log(`   Porta: ${PORT}`);
      console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   URL local: http://localhost:${PORT}`);
      console.log('🚀 ========================================');
      console.log('');
    });
  } catch {
    process.exit(1);
  }
};

startServer();

// Tratamento de erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
});

module.exports = { app, server, io };
