# 🎮 Discordovisk

Uma plataforma de comunicação em tempo real inspirada no Discord, construída com Node.js, React e Socket.io.

## 📋 Funcionalidades

- ✅ Autenticação de usuários (registro e login)
- ✅ Criação e gerenciamento de servidores
- ✅ Canais de texto em tempo real
- ✅ Mensagens diretas (DMs)
- ✅ Sistema de convites para servidores
- ✅ Status de usuário (online, offline, away, busy)
- ✅ Indicador "está digitando"
- ✅ Chamadas de voz/vídeo (WebRTC)

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Ambiente de execução JavaScript
- **Express** - Framework web
- **Socket.io** - Comunicação em tempo real
- **MongoDB** - Banco de dados NoSQL
- **JWT** - Autenticação com tokens
- **bcrypt** - Criptografia de senhas

### Frontend
- **React** - Biblioteca para criar interfaces
- **Socket.io-client** - Cliente para comunicação em tempo real
- **Axios** - Requisições HTTP
- **React Router** - Navegação entre páginas
- **CSS Modules** - Estilização

## 📦 Instalação

### Pré-requisitos
- Node.js (v14 ou superior)
- MongoDB (local ou MongoDB Atlas)

### Passo 1: Clone o repositório
```bash
git clone <seu-repositorio>
cd Discordovisk
```

### Passo 2: Configurar o Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` baseado no `.env.example`:
```bash
cp .env.example .env
```

Edite o arquivo `.env` e configure suas variáveis:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/discordovisk
JWT_SECRET=seu_secret_super_seguro_aqui
FRONTEND_URL=http://localhost:3000
```

### Passo 3: Configurar o Frontend

```bash
cd ../frontend
npm install
```

### Passo 4: Iniciar o MongoDB

Se você tem MongoDB instalado localmente:
```bash
mongod
```

Ou use MongoDB Atlas (gratuito) e atualize a `MONGODB_URI` no `.env`.

### Passo 5: Iniciar a aplicação

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

A aplicação estará disponível em:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## 📚 Como Usar

### 1. Criar uma conta
- Acesse http://localhost:3000
- Clique em "Registrar"
- Preencha username, email e senha

### 2. Criar um servidor
- Após fazer login, clique no botão "+"
- Digite o nome do servidor
- Clique em "Criar"

### 3. Criar canais
- Dentro do servidor, clique em "Criar Canal"
- Digite o nome e tipo do canal (texto, voz, vídeo)

### 4. Convidar amigos
- Clique nas configurações do servidor
- Copie o código de convite
- Compartilhe com seus amigos

### 5. Enviar mensagens
- Entre em um canal
- Digite sua mensagem na caixa de texto
- Pressione Enter para enviar

### 6. Mensagens diretas (DM)
- Clique no nome de um usuário
- Selecione "Enviar mensagem"
- Converse diretamente

## 📂 Estrutura do Projeto

```
Discordovisk/
├── backend/
│   ├── src/
│   │   ├── config/         # Configurações (banco de dados)
│   │   ├── controllers/    # Lógica das rotas
│   │   ├── middleware/     # Middlewares (autenticação)
│   │   ├── models/         # Schemas do MongoDB
│   │   ├── routes/         # Rotas da API
│   │   ├── socket/         # Configuração do Socket.io
│   │   └── server.js       # Arquivo principal
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/     # Componentes React
    │   ├── contexts/       # Context API (estado global)
    │   ├── pages/          # Páginas da aplicação
    │   ├── services/       # Serviços (API, Socket)
    │   ├── utils/          # Funções auxiliares
    │   ├── App.js
    │   └── index.js
    └── package.json
```

## 🔌 API Endpoints

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/me` - Obter dados do usuário atual
- `PUT /api/auth/profile` - Atualizar perfil
- `POST /api/auth/logout` - Fazer logout

### Servidores
- `POST /api/servers` - Criar servidor
- `GET /api/servers` - Listar servidores do usuário
- `GET /api/servers/:id` - Buscar servidor específico
- `PUT /api/servers/:id` - Atualizar servidor
- `POST /api/servers/join` - Entrar em servidor (código convite)
- `DELETE /api/servers/:id/leave` - Sair do servidor

### Canais
- `POST /api/channels/:serverId` - Criar canal
- `GET /api/channels/:serverId` - Listar canais
- `GET /api/channels/:channelId/messages` - Buscar mensagens
- `POST /api/channels/:channelId/messages` - Enviar mensagem
- `DELETE /api/channels/:serverId/:channelId` - Deletar canal

### Mensagens Diretas
- `POST /api/dm` - Enviar DM
- `GET /api/dm/:userId` - Buscar histórico de DMs
- `GET /api/dm` - Listar conversas

## 🔐 Como Funciona a Autenticação

1. **Registro**: O usuário cria uma conta com username, email e senha
2. **Hash da senha**: A senha é criptografada com bcrypt antes de salvar
3. **Login**: O usuário envia email e senha
4. **Token JWT**: Se as credenciais estiverem corretas, o servidor gera um token JWT
5. **Autenticação**: O cliente envia o token em todas as requisições protegidas
6. **Verificação**: O servidor verifica o token antes de processar a requisição

## 💬 Como Funciona o Chat em Tempo Real

1. **Conexão**: Cliente se conecta ao servidor Socket.io com token JWT
2. **Salas**: Usuário entra em "salas" (rooms) dos servidores e canais
3. **Envio**: Usuário envia mensagem via Socket.io
4. **Salvamento**: Servidor salva a mensagem no MongoDB
5. **Broadcast**: Servidor envia a mensagem para todos na sala
6. **Recebimento**: Todos os usuários conectados recebem a mensagem instantaneamente

## 🎥 Como Funciona Voz/Vídeo

O Discordovisk usa **WebRTC** (Web Real-Time Communication) para chamadas:

1. **Signaling**: Socket.io é usado para trocar informações de conexão
2. **Offer/Answer**: Os peers trocam ofertas e respostas SDP
3. **ICE Candidates**: Trocam candidatos ICE para estabelecer conexão
4. **P2P Connection**: Conexão peer-to-peer direta é estabelecida
5. **Stream**: Áudio e vídeo fluem diretamente entre os usuários

## 🚀 Próximos Passos

- [ ] Sistema de roles e permissões
- [ ] Upload de arquivos e imagens
- [ ] Emojis e reações personalizadas
- [ ] Sistema de amizades
- [ ] Notificações push
- [ ] Temas claro/escuro
- [ ] Busca de mensagens
- [ ] Bot API
- [ ] App mobile (React Native)

## 🐛 Problemas Comuns

### MongoDB não conecta
- Verifique se o MongoDB está rodando: `mongod`
- Verifique a MONGODB_URI no arquivo `.env`

### Socket.io não conecta
- Verifique se o backend está rodando na porta correta
- Verifique as configurações de CORS

### Erro de autenticação
- Verifique se o JWT_SECRET está configurado
- Verifique se o token está sendo enviado corretamente

## 📄 Licença

Este projeto é livre para uso educacional e pessoal.

## 👨💻 Desenvolvido com 💙

Projeto criado para aprendizado de desenvolvimento full-stack com Node.js e React.
