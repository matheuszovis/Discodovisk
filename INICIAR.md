# 🚀 Guia Rápido de Inicialização

## Passos para rodar o Discordovisk

### 1️⃣ Instalar o MongoDB

Se você ainda não tem o MongoDB instalado:

**Opção A - MongoDB local:**
- Baixe em: https://www.mongodb.com/try/download/community
- Instale e inicie o serviço

**Opção B - MongoDB Atlas (nuvem grátis):**
- Crie uma conta em: https://www.mongodb.com/cloud/atlas
- Crie um cluster gratuito
- Copie a string de conexão

### 2️⃣ Configurar o Backend

Abra um terminal e execute:

```bash
cd backend
npm install
```

Crie o arquivo `.env` (copie do `.env.example`):
```bash
copy .env.example .env
```

Edite o arquivo `.env` e configure:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/discordovisk
JWT_SECRET=mude_isso_para_algo_super_secreto_123456
FRONTEND_URL=http://localhost:3000
```

### 3️⃣ Configurar o Frontend

Abra outro terminal e execute:

```bash
cd frontend
npm install
```

### 4️⃣ Iniciar a Aplicação

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Você deve ver:
```
🚀 ========================================
   Discordovisk Server está rodando!
   Porta: 5000
   ...
🚀 ========================================
✅ MongoDB conectado: localhost
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

O navegador abrirá automaticamente em http://localhost:3000

### 5️⃣ Usar o Aplicativo

1. **Criar conta:** Clique em "Registrar-se"
2. **Fazer login:** Use suas credenciais
3. **Criar servidor:** Clique no botão "+" na barra lateral
4. **Criar canais:** Clique no "+" ao lado de "CANAIS DE TEXTO"
5. **Conversar:** Digite e envie mensagens em tempo real!

---

## 🐛 Problemas Comuns

### Erro: MongoDB não conecta
- Verifique se o MongoDB está rodando: `mongod`
- Verifique a MONGODB_URI no `.env`

### Erro: Porta já em uso
- Mude a PORT no `.env` para outra porta (ex: 5001)

### Erro: módulos não encontrados
- Execute `npm install` novamente nas pastas backend e frontend

---

## 📱 Funcionalidades Implementadas

✅ Autenticação (registro e login)
✅ Criação de servidores
✅ Criação de canais (texto, voz, vídeo)
✅ Chat em tempo real
✅ Mensagens diretas (DMs)
✅ Indicador "está digitando"
✅ Status de usuário
✅ Suporte WebRTC para voz/vídeo

---

## 🎯 Próximos Passos Sugeridos

- [ ] Sistema de roles e permissões
- [ ] Upload de imagens e arquivos
- [ ] Emojis e reações
- [ ] Sistema de amizades
- [ ] Notificações
- [ ] Busca de mensagens
- [ ] Temas claro/escuro

---

**Desenvolvido com 💙 para aprendizado de desenvolvimento full-stack**
