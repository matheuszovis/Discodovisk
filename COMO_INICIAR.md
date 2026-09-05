# 🚀 Guia Rápido - Iniciar o Discordovisk

## ✅ Status: Dependências Instaladas!

Backend: ✅ 191 pacotes instalados
Frontend: ✅ 1310 pacotes instalados

---

## 📋 Opções para Testar

### **Opção 1: MongoDB Local (Recomendado se você já tem MongoDB)**

#### Passo 1: Verificar se MongoDB está instalado
```powershell
mongod --version
```

Se aparecer a versão, você tem MongoDB! Pule para o Passo 3.

#### Passo 2: Instalar MongoDB (se necessário)
1. Baixe: https://www.mongodb.com/try/download/community
2. Instale com as opções padrão
3. MongoDB será instalado como serviço do Windows

#### Passo 3: Iniciar MongoDB
O MongoDB geralmente inicia automaticamente no Windows. Para verificar:
```powershell
# Verificar se está rodando
Get-Service -Name MongoDB

# Se não estiver rodando, inicie:
Start-Service -Name MongoDB
```

#### Passo 4: Iniciar o Backend
Abra um terminal e execute:
```powershell
cd D:\Discordovisk\backend
npm run dev
```

Você deve ver:
```
✅ MongoDB conectado: localhost
🚀 Discordovisk Server está rodando!
```

#### Passo 5: Iniciar o Frontend
Abra OUTRO terminal e execute:
```powershell
cd D:\Discordovisk\frontend
npm start
```

O navegador abrirá automaticamente em http://localhost:3000

---

### **Opção 2: MongoDB Atlas (Online - MAIS FÁCIL)** ⭐

Se você não quer instalar MongoDB no seu PC, use a versão online gratuita:

#### Passo 1: Criar conta MongoDB Atlas
1. Acesse: https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita
3. Crie um cluster (escolha a opção FREE M0)

#### Passo 2: Configurar acesso
1. Crie um usuário do banco de dados
   - Username: `discordovisk`
   - Password: `senha123` (escolha uma senha)
2. Adicionar IP à whitelist:
   - Clique em "Network Access"
   - Clique em "Add IP Address"
   - Clique em "Allow Access from Anywhere" (0.0.0.0/0)

#### Passo 3: Copiar String de Conexão
1. Clique em "Connect"
2. Escolha "Connect your application"
3. Copie a string (será algo como):
```
mongodb+srv://discordovisk:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

#### Passo 4: Atualizar o .env
Edite o arquivo `D:\Discordovisk\backend\.env` e substitua a linha MONGODB_URI:
```env
MONGODB_URI=mongodb+srv://discordovisk:senha123@cluster0.xxxxx.mongodb.net/discordovisk?retryWrites=true&w=majority
```
(Lembre de substituir `senha123` pela sua senha e o endereço pelo seu cluster)

#### Passo 5: Iniciar o Backend
```powershell
cd D:\Discordovisk\backend
npm run dev
```

#### Passo 6: Iniciar o Frontend
```powershell
cd D:\Discordovisk\frontend
npm start
```

---

## 🎮 Como Usar o Discordovisk

1. **Registrar:** Crie sua conta
2. **Login:** Entre com suas credenciais
3. **Criar Servidor:** Clique no botão "+"
4. **Criar Canais:** Adicione canais de texto ou voz
5. **Conversar:** Envie mensagens em tempo real!
6. **Chamadas:** Clique em canais de voz para iniciar chamadas com vídeo e compartilhamento de tela

---

## 🐛 Problemas Comuns

### Erro: "MongooseServerSelectionError"
**Causa:** MongoDB não está rodando ou URL de conexão incorreta

**Solução:**
- MongoDB Local: Execute `Start-Service -Name MongoDB`
- MongoDB Atlas: Verifique se a string de conexão está correta no .env

### Erro: "Port 5000 already in use"
**Causa:** Outra aplicação está usando a porta 5000

**Solução:** Edite o arquivo `.env` e mude a PORT:
```env
PORT=5001
```

### Erro: "Cannot GET /"
**Causa:** Backend não está rodando

**Solução:** Certifique-se que o backend está rodando em outro terminal

---

## 📊 Onde os Dados Ficam Salvos?

### MongoDB Local:
```
C:\Program Files\MongoDB\Server\7.0\data\
```
(ou onde você instalou o MongoDB)

### MongoDB Atlas:
Na nuvem, acessível de qualquer lugar!

---

## 🎯 Comandos Úteis

### Verificar MongoDB (Local):
```powershell
# Ver status do serviço
Get-Service -Name MongoDB

# Iniciar
Start-Service -Name MongoDB

# Parar
Stop-Service -Name MongoDB
```

### Ver dados do banco (Local):
```powershell
# Abrir MongoDB Shell
mongosh

# Listar bancos de dados
show dbs

# Usar o banco do Discordovisk
use discordovisk

# Ver coleções (tabelas)
show collections

# Ver usuários
db.users.find()

# Ver servidores
db.servers.find()

# Sair
exit
```

---

## 📝 Checklist de Instalação

- [x] Dependências do backend instaladas
- [x] Dependências do frontend instaladas
- [x] Arquivo .env criado
- [ ] MongoDB instalado/configurado
- [ ] Backend iniciado (porta 5000)
- [ ] Frontend iniciado (porta 3000)
- [ ] Primeiro usuário criado
- [ ] Primeiro servidor criado
- [ ] Primeira mensagem enviada!

---

## 🆘 Precisa de Ajuda?

Estou aqui para ajudar! Me avise se:
- MongoDB não está conectando
- Aparecer algum erro
- Quiser ajuda para criar o cluster no MongoDB Atlas
- Precisar de ajuda com qualquer passo

---

**Dica:** Use MongoDB Atlas se você quer algo rápido e sem instalação. É gratuito e funciona perfeitamente! ⭐

**Próximo passo:** Escolha a Opção 1 ou 2 e vamos testar! 🚀
