# 💾 Requisitos de Espaço e Hospedagem

## 📊 Espaço em Disco Necessário

### Desenvolvimento Local (seu computador)

**Backend:**
- Código fonte: ~5 MB
- node_modules: ~150-200 MB
- Logs: ~1-10 MB
- **Total Backend: ~200-250 MB**

**Frontend:**
- Código fonte: ~2 MB
- node_modules: ~300-400 MB
- Build de produção: ~2-5 MB
- **Total Frontend: ~400-450 MB**

**MongoDB (Banco de Dados):**
- Instalação: ~500 MB
- Dados iniciais: ~10-50 MB
- Crescimento estimado: 
  - 100 usuários: ~50 MB
  - 1.000 usuários: ~500 MB
  - 10.000 usuários: ~5 GB
  - 100.000 usuários: ~50 GB

**Total para Desenvolvimento:**
```
Backend:     ~250 MB
Frontend:    ~450 MB
MongoDB:     ~500 MB (instalação) + dados
─────────────────────────────
Total Base:  ~1.2 GB
Com dados:   ~2-5 GB (uso moderado)
```

### Produção (Servidor Online)

**Versão Compilada (mais eficiente):**
- Backend Node.js: ~50 MB
- Frontend (build): ~5 MB
- MongoDB: ~200 MB + dados
- Logs e cache: ~100 MB
- **Total Produção: ~500 MB + crescimento de dados**

---

## ☁️ Opções de Hospedagem

### 1️⃣ **Hospedar no seu Computador (Localhost)**

✅ **Vantagens:**
- Gratuito
- Controle total
- Sem limites de tráfego
- Ideal para testes e desenvolvimento

❌ **Desvantagens:**
- Só funciona enquanto seu PC estiver ligado
- Apenas você e pessoas na sua rede local podem acessar
- Precisa configurar port forwarding para acesso externo
- IP muda se você não tiver IP fixo
- Consome recursos do seu computador

**Recomendado para:**
- Desenvolvimento e testes
- Uso pessoal/familiar
- Aprendizado

---

### 2️⃣ **Hospedar no Google Drive** ❌

**Infelizmente NÃO é possível** hospedar aplicações Node.js no Google Drive porque:
- Google Drive é apenas para **armazenamento de arquivos**
- Não executa código de servidor (Node.js)
- Não tem banco de dados
- Não oferece processamento backend

**O que você PODE fazer no Google Drive:**
- Armazenar backups do código
- Compartilhar arquivos do projeto
- Sincronizar código entre computadores

---

### 3️⃣ **Hospedagem Gratuita (Recomendado para Projetos Pessoais)**

#### **A) Render.com** ⭐ (Recomendado)
- ✅ **Gratuito** (plano free)
- ✅ 512 MB RAM
- ✅ 100 GB transferência/mês
- ✅ Deploy automático do GitHub
- ✅ MongoDB gratuito (via MongoDB Atlas)
- ❌ Servidor "dorme" após 15 min sem uso (demora ~30s para "acordar")

**Espaço:** 512 MB suficiente
**Custo:** Gratuito

#### **B) Railway.app** 
- ✅ $5 de crédito grátis/mês
- ✅ 512 MB RAM
- ✅ 100 GB transferência/mês
- ✅ Muito fácil de usar
- ❌ Depois do crédito, precisa pagar

**Espaço:** 512 MB suficiente
**Custo:** Gratuito com créditos, depois ~$5/mês

#### **C) Vercel (Frontend) + Render (Backend)**
- ✅ Vercel gratuito para frontend React
- ✅ Render gratuito para backend
- ✅ Separação de responsabilidades
- ✅ Melhor performance

**Espaço:** Ilimitado no Vercel, 512 MB no Render
**Custo:** Gratuito

#### **D) Heroku**
- ⚠️ Não oferece mais plano gratuito
- Plano inicial: $7/mês

---

### 4️⃣ **MongoDB - Banco de Dados**

#### **MongoDB Atlas** ⭐ (Recomendado)
- ✅ **512 MB gratuito** para sempre
- ✅ Backup automático
- ✅ Segurança profissional
- ✅ Escalável conforme necessário
- ✅ Suporta ~500-1000 usuários no plano grátis

**Como usar:**
1. Criar conta em https://www.mongodb.com/cloud/atlas
2. Criar cluster gratuito (M0)
3. Copiar string de conexão
4. Colar no `.env` do backend

---

### 5️⃣ **VPS (Servidor Privado Virtual)** - Para Projetos Sérios

Se o projeto crescer, considere um VPS:

#### **DigitalOcean**
- Plano básico: $6/mês
- 1 GB RAM, 25 GB SSD
- 1 TB transferência

#### **Contabo**
- Plano básico: €3.99/mês (~R$22)
- 4 GB RAM, 50 GB SSD
- 32 TB transferência

#### **AWS EC2 / Google Cloud**
- Plano gratuito por 12 meses
- Depois: ~$10-20/mês

---

## 📈 Estimativa de Crescimento de Dados

### Fórmula Aproximada:

**Por Usuário:**
- Dados do perfil: ~5 KB
- Mensagens (média 100/dia): ~10 KB/dia
- Avatares/imagens: ~100 KB

**Crescimento mensal por usuário ativo:** ~300-500 KB/mês

**Exemplos:**
- 10 usuários: ~5 MB/mês
- 100 usuários: ~50 MB/mês
- 1.000 usuários: ~500 MB/mês
- 10.000 usuários: ~5 GB/mês

---

## 🎯 Recomendação para Você

### **Fase 1: Desenvolvimento e Testes**
```
✅ Rodar no seu computador (localhost)
✅ MongoDB local ou MongoDB Atlas gratuito
✅ Custo: R$ 0,00
```

### **Fase 2: Compartilhar com Amigos**
```
Opção A - Seu PC + ngrok:
  - Mantém servidor no seu PC
  - Usa ngrok para criar URL pública
  - Gratuito, mas PC precisa ficar ligado

Opção B - Render.com (Backend) + Vercel (Frontend):
  - Backend: Render.com (gratuito)
  - Frontend: Vercel (gratuito)
  - MongoDB: Atlas (512 MB gratuito)
  - Custo: R$ 0,00
  - Limite: ~100-500 usuários ativos
```

### **Fase 3: Projeto Crescendo**
```
VPS (DigitalOcean ou Contabo):
  - Servidor dedicado
  - Controle total
  - ~R$ 30-50/mês
  - Suporta milhares de usuários
```

---

## 🚀 Tutorial: Deploy Gratuito (Render + Vercel)

### **1. Backend no Render.com**

1. Criar conta no Render.com
2. Conectar seu GitHub
3. Criar novo "Web Service"
4. Configurar:
   ```
   Build Command: cd backend && npm install
   Start Command: cd backend && npm start
   ```
5. Adicionar variáveis de ambiente (.env)
6. Deploy!

### **2. Frontend no Vercel**

1. Criar conta no Vercel
2. Conectar GitHub
3. Selecionar pasta `frontend`
4. Vercel detecta React automaticamente
5. Deploy!

### **3. MongoDB Atlas**

1. Criar conta no MongoDB Atlas
2. Criar cluster gratuito (M0 - 512MB)
3. Criar usuário do banco
4. Whitelist de IP (permitir todos: 0.0.0.0/0)
5. Copiar string de conexão
6. Adicionar no Render como variável de ambiente

**Custo Total: R$ 0,00/mês**
**Capacidade: ~500-1000 usuários simultâneos**

---

## 💰 Comparação de Custos

| Solução | Espaço | Custo/Mês | Usuários | Melhor Para |
|---------|--------|-----------|----------|-------------|
| Localhost | Ilimitado | R$ 0 | Você | Desenvolvimento |
| Render + Vercel + Atlas | 512 MB | R$ 0 | 100-500 | Projetos pessoais |
| Railway | 512 MB | R$ 0-25 | 500-1000 | Projetos pequenos |
| VPS Contabo | 50 GB | R$ 22 | 5000+ | Projetos médios |
| DigitalOcean | 25 GB | R$ 35 | 3000+ | Projetos médios |
| AWS/Azure | Escalável | R$ 50+ | Ilimitado | Empresas |

---

## ⚡ Dica: Começar Grátis e Escalar

1. **Comece** rodando no seu PC (localhost)
2. **Aprenda** e desenvolva as funcionalidades
3. **Publique** gratuitamente (Render + Vercel)
4. **Monitore** o uso e crescimento
5. **Escale** para VPS quando necessário (~500+ usuários ativos)

---

## 📝 Checklist de Deploy

- [ ] Criar conta no MongoDB Atlas
- [ ] Criar cluster gratuito (M0)
- [ ] Configurar usuário e senha
- [ ] Copiar string de conexão
- [ ] Criar conta no Render.com
- [ ] Criar conta no Vercel
- [ ] Fazer push do código no GitHub
- [ ] Conectar Render ao repositório
- [ ] Conectar Vercel ao repositório
- [ ] Configurar variáveis de ambiente
- [ ] Testar a aplicação online!

---

## 🆘 Precisa de Ajuda?

Se quiser fazer deploy gratuito agora, posso te ajudar passo a passo com:
- Configuração do MongoDB Atlas
- Deploy no Render.com
- Deploy no Vercel
- Configuração de variáveis de ambiente

É só me avisar! 🚀

---

**Resposta Rápida:**
- ✅ Espaço necessário: ~2-5 GB no seu PC para desenvolvimento
- ❌ Não dá para hospedar no Google Drive (ele não executa código)
- ✅ Melhor opção grátis: Render.com + Vercel + MongoDB Atlas
- 💰 Custo: R$ 0,00 para começar, escala conforme cresce

**Última atualização:** 04/09/2026
