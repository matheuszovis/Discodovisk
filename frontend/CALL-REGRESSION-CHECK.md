# Verificação da chamada — 1.0.26

`npm run dist` e `npm run release` executam `npm run test:call` antes de compilar.
Falhas nos testes interrompem o processo. Não publicar substituindo o instalador
de uma versão já lançada; cada correção recebe uma versão superior.

Os 12 testes do componente cobrem início/parada/reinício da tela, retorno de um
espectador (inclusive quando o evento de saída é perdido), duas transmissões
simultâneas, descarte de sinais antigos, falha de áudio sem perder a imagem,
supressão de ruído na faixa existente mantendo mute, seleção de saída,
recuperação de AbortError, ordenação de reprodução/troca de saída e abertura
do painel pela engrenagem.

`scripts/verify-audio-settings.cjs` renderiza o componente no Electron e testa
as saídas enumeradas com um stream sintético silencioso. A verificação local
passou na saída padrão e em quatro IDs de dispositivo. O resultado não prova
audibilidade nem a compatibilidade com dispositivos de outras máquinas.

`scripts/verify-call-webrtc.cjs` também verifica três conexões reais no Electron
com vídeo de canvas e áudio sintético. Ele não captura tela nem microfone reais.
Executar com Electron, sem a variável ELECTRON_RUN_AS_NODE.

## Confirmação em duas máquinas antes de distribuir

Ambos os lados precisam estar na 1.0.25 ou superior, que usa conexões direcionais da tela.
Não foi validada interoperabilidade de compartilhamento com versões anteriores.

1. A compartilha jogo/janela; B confirma imagem e som. A continua ouvindo o PC.
2. B sai e volta três vezes; A mantém a mesma transmissão durante todo o teste.
3. A para e reinicia três vezes; voz e câmera continuam funcionando.
4. A e B compartilham simultaneamente. A para: ainda deve ver e ouvir a tela de B.
5. Na engrenagem acima do botão de atualizar, trocar microfone, alternar supressão de ruído e
   selecionar o fone. Repetir a troca com mute ligado: a voz não pode vazar.
6. Reiniciar o aplicativo e confirmar as preferências salvas.
7. Desconectar um dispositivo selecionado: verificar o aviso e escolher outro.

A supressão usa o processamento nativo do navegador/Windows. Não promete remover
todo ruído. O compartilhamento nativo de áudio envia o som do sistema, não apenas
o aplicativo escolhido. Os testes sintéticos não comprovam a captura de todos os
jogos, drivers, dispositivos ou redes; registrar qualquer erro exibido na call.
