# 🎯 MongoDB Atlas - Configuração Rápida (5 minutos)

## Passo a Passo para Configurar o Banco de Dados GRATUITO

### 1️⃣ Criar Conta (2 minutos)

1. Acesse: **https://www.mongodb.com/cloud/atlas/register**
2. Preencha:
   - Email
   - Senha
3. Clique em **"Create your Atlas account"**

### 2️⃣ Criar Cluster Gratuito (1 minuto)

1. Escolha o plano **FREE** (M0)
2. Escolha a região mais próxima (ex: **São Paulo** ou **Virginia**)
3. Nome do cluster: deixe o padrão ou coloque **"Discordovisk"**
4. Clique em **"Create Deployment"**

### 3️⃣ Criar Usuário do Banco (30 segundos)

Aparecerá uma tela pedindo para criar usuário:
1. **Username:** `discordovisk`
2. **Password:** Crie uma senha (anote ela!) - ex: `senha123`
3. Clique em **"Create Database User"**

### 4️⃣ Liberar Acesso (30 segundos)

1. Em "Where would you like to connect from?"
2. Escolha **"My Local Environment"**
3. Clique em **"Add My Current IP Address"**
4. OU clique em **"Add Entry"** e digite:
   - IP: `0.0.0.0/0` (permite de qualquer lugar)
5. Clique em **"Finish and Close"**

### 5️⃣ Pegar String de Conexão (1 minuto)

1. Clique em **"Connect"**
2. Escolha **"Drivers"**
3. Copie a string que aparece (será algo como):
```
mongodb+srv://discordovisk:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 6️⃣ Configurar no Projeto (30 segundos)

1. Abra o arquivo: `D:\Discordovisk\backend\.env`
2. Substitua a linha `MONGODB_URI=` pela sua string
3. **IMPORTANTE:** Troque `<password>` pela senha que você criou!

Exemplo:
```env
MONGODB_URI=mongodb+srv://discordovisk:senha123@cluster0.xxxxx.mongodb.net/discordovisk?retryWrites=true&w=majority
```

### 7️⃣ Testar! 🚀

Agora execute:
```powershell
cd D:\Discordovisk\backend
npm run dev
```

Você deve ver:
```
✅ MongoDB conectado: cluster0-shard-00-00.xxxxx.mongodb.net
🚀 Discordovisk Server está rodando!
```

---

## 🎬 Vídeo Tutorial (se preferir)

Se você preferir assistir, tem vários tutoriais no YouTube sobre "como criar conta MongoDB Atlas gratuito"

---

## 🆘 Me avise quando terminar!

Depois que você:
1. Criar a conta no MongoDB Atlas
2. Copiar a string de conexão
3. Colar no arquivo `.env`

**Me avise aqui no chat** e eu inicio o servidor para você testar! 🚀

---

## 💡 Dica

A string de conexão fica assim:
```
mongodb+srv://USUARIO:SENHA@cluster0.xxxxx.mongodb.net/discordovisk
```

Certifique-se de:
- ✅ Substituir `<password>` pela sua senha
- ✅ Manter `discordovisk` no final (nome do banco)
- ✅ Não deixar espaços

---

**Próximo passo:** Crie a conta e me avise! Eu te ajudo com o resto! 💙
