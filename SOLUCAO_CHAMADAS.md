# 🎤 Solução de Problemas - Chamadas de Voz/Vídeo

## ❌ Problema: Não consigo entrar em chamada

### 🔍 Causas Comuns:

#### 1. **Permissões do Navegador**
O navegador precisa de permissão para acessar câmera e microfone.

**Solução:**
1. Quando clicar em um canal de voz, o navegador vai pedir permissão
2. Clique em **"Permitir"** ou **"Allow"**
3. Se bloqueou por acidente:
   - No Chrome: Clique no **cadeado** 🔒 ao lado da URL
   - Procure "Câmera" e "Microfone"
   - Mude para **"Permitir"**
   - Recarregue a página (F5)

#### 2. **Navegador Não Suportado**
Alguns navegadores não suportam WebRTC completamente.

**Navegadores Recomendados:**
- ✅ Google Chrome (RECOMENDADO)
- ✅ Microsoft Edge
- ✅ Firefox
- ✅ Opera
- ⚠️ Safari (funciona, mas pode ter limitações)
- ❌ Internet Explorer (não funciona)

#### 3. **Conexão HTTPS**
WebRTC requer conexão segura em produção.

**Localhost funciona normalmente!**
- ✅ http://localhost:3000 (OK para testes)
- ❌ http://192.168.x.x (não funciona sem HTTPS)

#### 4. **Microfone/Câmera em Uso**
Outro aplicativo pode estar usando.

**Solução:**
1. Feche outros programas que usam câmera/microfone
2. Exemplos: Zoom, Teams, Discord, OBS, Skype
3. Tente novamente

---

## 🧪 Como Testar Se Está Funcionando

### Teste 1: Verificar Permissões

```javascript
// Abra o Console do Navegador (F12)
// Cole este código:

navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  .then(() => console.log('✅ Permissões OK!'))
  .catch((error) => console.error('❌ Erro:', error.message));
```

**Resultado esperado:**
- ✅ `Permissões OK!` - Tudo certo!
- ❌ `NotAllowedError` - Você negou as permissões
- ❌ `NotFoundError` - Câmera/microfone não encontrado
- ❌ `NotReadableError` - Dispositivo já está em uso

### Teste 2: Verificar Dispositivos

```javascript
// Console do Navegador (F12):

navigator.mediaDevices.enumerateDevices()
  .then(devices => {
    console.log('🎤 Microfones:', devices.filter(d => d.kind === 'audioinput'));
    console.log('📹 Câmeras:', devices.filter(d => d.kind === 'videoinput'));
  });
```

---

## 🔧 Soluções Específicas

### Se aparecer: "getUserMedia is not defined"

**Causa:** Navegador muito antigo ou não suporta WebRTC

**Solução:**
1. Atualize seu navegador para a versão mais recente
2. Ou use Google Chrome atualizado

### Se aparecer: "NotAllowedError"

**Causa:** Você bloqueou as permissões

**Solução:**
1. Clique no **ícone de cadeado** 🔒 na barra de endereço
2. Permissões → Câmera: **Permitir**
3. Permissões → Microfone: **Permitir**
4. Recarregue a página (F5)

### Se aparecer: "NotFoundError"

**Causa:** Nenhum dispositivo de áudio/vídeo encontrado

**Solução:**
1. Conecte um microfone ou webcam
2. Verifique se está conectado no Gerenciador de Dispositivos do Windows
3. Teste em outro programa (ex: configurações do Windows → Som)

### Se aparecer: "NotReadableError"

**Causa:** Dispositivo já está sendo usado por outro programa

**Solução:**
1. Feche todos os programas que usam câmera/microfone
2. Exemplos: Zoom, Teams, Discord, Skype, OBS
3. Reinicie o navegador
4. Tente novamente

---

## 🎯 Passo a Passo Completo

### Para Entrar em uma Chamada:

1. **Criar um Canal de Voz:**
   - Entre em um servidor
   - Clique no **"+"** ao lado de "CANAIS DE VOZ"
   - Escolha tipo: **Voz** 🔊 ou **Vídeo** 📹
   - Dê um nome (ex: "sala-geral")
   - Clique em **"Criar Canal"**

2. **Entrar na Chamada:**
   - Clique no canal de voz que você criou
   - Uma tela em modo fullscreen vai aparecer
   - Clique em **"Entrar na Chamada"**
   - **IMPORTANTE:** Permita o acesso quando o navegador pedir!

3. **Verificar Permissões:**
   - Uma caixa de diálogo do navegador vai aparecer
   - Clique em **"Permitir"** ou **"Allow"**
   - Se não aparecer, verifique o ícone 🔒 na barra de endereço

4. **Testar:**
   - Você deve ver seu próprio vídeo
   - Teste os botões:
     - 🎤 = Mutar/desmutar
     - 📹 = Câmera on/off
     - 💻 = Compartilhar tela
     - 📞 = Sair da chamada

---

## 🌐 Testar com Outra Pessoa

Para testar chamadas com outra pessoa:

1. **Ambos precisam:**
   - Estar no mesmo servidor
   - Entrar no mesmo canal de voz
   - Ter permitido câmera/microfone

2. **Abra em duas abas (para testar sozinho):**
   - Aba 1: Seu usuário principal
   - Aba 2: Crie outra conta e entre no mesmo servidor
   - Entre no mesmo canal de voz nas duas abas
   - Você deve se ver nas duas telas!

---

## 🆘 Ainda Não Funciona?

### Checklist Final:

- [ ] Navegador atualizado (Chrome, Edge, Firefox)
- [ ] Permissões de câmera/microfone concedidas
- [ ] Nenhum outro app usando câmera/microfone
- [ ] Testou em http://localhost:3000 (não http://127.0.0.1)
- [ ] Microfone/câmera funcionam em outros apps
- [ ] Backend está rodando (porta 5000)
- [ ] Frontend está rodando (porta 3000)
- [ ] MongoDB conectado

### Logs Úteis:

Abra o Console do Navegador (F12 → Console) e procure por:
- ❌ Erros em vermelho
- ⚠️ Avisos em amarelo
- 🔌 Mensagens do Socket.io

**Me envie os erros que aparecerem!**

---

## 💡 Dica: Teste Rápido

1. Abra: http://localhost:3000
2. Faça login
3. Crie um servidor
4. Crie um canal de voz
5. Clique no canal
6. Permita câmera/microfone
7. Você deve ver seu próprio vídeo!

Se funcionar até aqui, está tudo OK! ✅

---

## 📞 Recursos Adicionais

### Testar WebRTC do Navegador:
- https://test.webrtc.org/

### Verificar Permissões:
1. Chrome: chrome://settings/content
2. Procure por "Câmera" e "Microfone"
3. Certifique-se que http://localhost:3000 está na lista de permitidos

---

**Última atualização:** 04/09/2026

**Dúvidas?** Me avise qual erro específico está aparecendo! 🚀
