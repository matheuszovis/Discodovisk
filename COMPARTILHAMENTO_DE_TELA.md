# 📺 Compartilhamento de Tela - Guia de Uso

## 🎯 Funcionalidade Implementada

Agora o Discordovisk possui suporte completo para **chamadas de voz/vídeo** e **compartilhamento de tela** usando WebRTC!

## 🚀 Como Usar

### 1️⃣ Criar um Canal de Voz/Vídeo

1. Entre em um servidor
2. Clique no botão **+** ao lado de "CANAIS DE VOZ"
3. Escolha o tipo:
   - **Voz** 🔊 - Apenas áudio
   - **Vídeo** 📹 - Áudio e vídeo
4. Dê um nome ao canal (ex: "sala-de-reunião")
5. Clique em "Criar Canal"

### 2️⃣ Entrar em uma Chamada

1. Clique no canal de voz/vídeo que você criou
2. Uma tela aparecerá mostrando "Entrar na chamada"
3. Clique no botão **"Entrar na Chamada"**
4. Permita o acesso à câmera e microfone quando solicitado

### 3️⃣ Compartilhar sua Tela

Durante uma chamada ativa:

1. Clique no botão **💻** (Compartilhar tela) nos controles
2. Escolha o que deseja compartilhar:
   - **Tela inteira** - Compartilha todo o seu monitor
   - **Janela específica** - Compartilha apenas uma janela
   - **Aba do navegador** - Compartilha apenas uma aba

3. Clique em "Compartilhar"
4. Sua tela será transmitida em tempo real para todos na chamada!
5. O botão ficará verde 🖥️ indicando que está compartilhando

### 4️⃣ Parar o Compartilhamento

- Clique novamente no botão **🖥️** (agora verde)
- Ou clique em "Parar compartilhamento" na barra do navegador
- A câmera voltará a ser exibida automaticamente

## 🎮 Controles da Chamada

Durante a chamada, você tem os seguintes controles:

| Botão | Função | Atalho |
|-------|--------|--------|
| 🎤 | Mutar/desmutar microfone | - |
| 📹 | Ligar/desligar câmera | - |
| 💻 | Compartilhar/parar tela | - |
| 📞 | Desligar chamada | - |

### Indicadores Visuais

- **Botão vermelho** = Função desativada (ex: microfone mutado)
- **Botão verde pulsando** = Compartilhamento de tela ativo
- **Botão cinza** = Função ativa normalmente

## 🌟 Recursos Avançados

### Compartilhamento com Áudio

Ao compartilhar uma aba do navegador, você pode marcar a opção "Compartilhar áudio da aba" para transmitir também o som.

### Múltiplos Participantes

- Várias pessoas podem entrar na mesma chamada
- Cada participante aparece em um quadro separado
- O layout se adapta automaticamente ao número de pessoas

### Qualidade Adaptativa

O WebRTC automaticamente ajusta a qualidade do vídeo baseado na sua conexão para manter a chamada estável.

## 🔧 Requisitos Técnicos

### Navegadores Suportados

✅ Google Chrome (recomendado)
✅ Microsoft Edge
✅ Firefox
✅ Opera
✅ Safari (limitações em algumas funcionalidades)

### Permissões Necessárias

- **Câmera** 📷 - Para vídeo
- **Microfone** 🎤 - Para áudio
- **Compartilhamento de tela** 🖥️ - Para transmitir a tela

### Conexão de Internet

Recomendado:
- **Upload**: 3 Mbps ou mais
- **Download**: 3 Mbps ou mais
- **Latência**: Menos de 100ms

## 💡 Dicas de Uso

### Para Melhor Qualidade

1. **Feche programas pesados** enquanto compartilha a tela
2. **Use conexão com fio** (Ethernet) se possível
3. **Tenha boa iluminação** para chamadas com vídeo
4. **Use fones de ouvido** para evitar eco

### Para Privacidade

1. **Feche abas/janelas sensíveis** antes de compartilhar
2. **Compartilhe apenas a janela específica** ao invés da tela inteira
3. **Desative notificações** para não aparecerem na transmissão
4. **Verifique o que está visível** antes de compartilhar

### Solução de Problemas Comuns

**Problema**: Não consigo compartilhar a tela
- **Solução**: Verifique se deu permissão ao navegador
- Tente recarregar a página e entrar na chamada novamente

**Problema**: Outros não me veem/ouvem
- **Solução**: Clique nos botões 🎤 e 📹 para garantir que estão ativos
- Verifique as configurações de privacidade do navegador

**Problema**: Vídeo travando
- **Solução**: Sua conexão pode estar lenta
- Tente desligar o vídeo e usar apenas voz
- Ou compartilhe em resolução menor

**Problema**: Eco durante a chamada
- **Solução**: Peça para todos usarem fones de ouvido
- Ou ative o microfone apenas quando for falar

## 🎓 Casos de Uso

### Para Trabalho

- 💼 Reuniões de equipe
- 📊 Apresentações de slides
- 👨💻 Programação em par (pair programming)
- 🎓 Treinamentos e workshops

### Para Estudo

- 📚 Grupos de estudo
- 🧮 Resolução de exercícios em conjunto
- 🎯 Projetos em grupo
- 📖 Revisão de conteúdo

### Para Lazer

- 🎮 Transmitir gameplay
- 🎬 Assistir vídeos juntos
- 🎨 Mostrar criações artísticas
- 🎵 Sessões de música

## 🔐 Segurança e Privacidade

### Criptografia

- Todas as chamadas usam WebRTC com criptografia DTLS-SRTP
- A comunicação é peer-to-peer (direta entre usuários)
- O servidor apenas facilita a conexão inicial (signaling)

### Dados

- O vídeo e áudio NÃO são gravados
- O compartilhamento de tela NÃO é salvo
- Tudo é transmitido em tempo real e descartado

### Controle

- Você pode sair da chamada a qualquer momento
- Você controla quando compartilha a tela
- Você pode mutar/desmutar instantaneamente

## 📱 Limitações Conhecidas

1. **Não funciona em navegadores muito antigos**
2. **Requer HTTPS em produção** (localhost funciona normalmente)
3. **Limite teórico de participantes** depende da capacidade do hardware
4. **Conexões lentas** podem degradar a qualidade

## 🚀 Melhorias Futuras

Funcionalidades planejadas para futuras versões:

- [ ] Gravação de chamadas (com permissão)
- [ ] Efeitos de fundo virtual
- [ ] Modo "apresentador" com destaque
- [ ] Reações durante a chamada (👍 ❤️ 😂)
- [ ] Legendas automáticas
- [ ] Estatísticas de qualidade da chamada
- [ ] Controle de ruído de fundo
- [ ] Compartilhamento de quadro branco

---

## 🆘 Precisa de Ajuda?

Se encontrar algum problema ou tiver dúvidas:

1. Verifique as permissões do navegador
2. Teste sua conexão de internet
3. Tente usar outro navegador
4. Reinicie o navegador e tente novamente

---

**Desenvolvido com 💙 para o Discordovisk**

*Última atualização: 04/09/2026*
