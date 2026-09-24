import React, { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { getSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import './VideoCall.css';
import CallAudioSettings, { readAudioSettings, microphoneConstraints, routeAudio, configurePlayback } from './CallAudioSettings';
import Jukebox from './Jukebox';

/**
 * Componente de chamada de vídeo/voz com compartilhamento de tela
 * Usa WebRTC (simple-peer) para comunicação P2P
 */
function VideoCall({ channel, onClose, onParticipantsChange }) {
  const [inCall, setInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState({});
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const [screenSources, setScreenSources] = useState([]);
  const [participantVolumes, setParticipantVolumes] = useState({});
  const [screenShareVolumes, setScreenShareVolumes] = useState({});
  const [mediaContextMenu, setMediaContextMenu] = useState(null);
  const [callNotice, setCallNotice] = useState('');
  const [audioSettings, setAudioSettings] = useState(readAudioSettings);
  
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peersRef = useRef({});
  // A tela usa uma conexão WebRTC própria. Isso evita que a renegociação da voz
  // descarte o vídeo quando alguém sai e entra novamente na call.
  const screenPeersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenAudioContextRef = useRef(null);
  const screenAudioNodeRef = useRef(null);
  const screenAudioQueueRef = useRef([]);
  const screenAudioInputRef = useRef(null);
  const isScreenSharingRef = useRef(false);
  const selectingScreenRef = useRef(false);
  const currentUserId = String(user?.id || user?._id || '');

  const changeAudioSettings = async (next) => {
    const stream = localStreamRef.current;
    if (stream && next.input === audioSettings.input && next.noiseSuppression !== audioSettings.noiseSuppression) {
      const currentTrack = stream.getAudioTracks()[0];
      // Change processing on the existing microphone instead of opening the
      // same device twice (some Windows drivers abort concurrent capture).
      await currentTrack.applyConstraints(microphoneConstraints(next));
    }
    if (stream && next.input !== audioSettings.input) {
      const replacement = await navigator.mediaDevices.getUserMedia({ video: false, audio: microphoneConstraints(next) });
      const track = replacement.getAudioTracks()[0];
      const old = stream.getAudioTracks()[0];
      const changed = [];
      track.enabled = old?.enabled ?? true;
      try {
        for (const peer of Object.values(peersRef.current)) {
          if (peer.destroyed) continue;
          peer.replaceTrack(old, track, stream);
          changed.push(peer);
        }
      } catch (error) {
        changed.forEach(peer => { if (!peer.destroyed) peer.replaceTrack(track, old, stream); });
        replacement.getTracks().forEach(t => t.stop());
        throw error;
      }
      if (old) stream.removeTrack(old);
      stream.addTrack(track);
      old?.stop();
    }
    if (next.output !== audioSettings.output) {
      const elements = [...document.querySelectorAll('.video-call-container audio')];
      try {
        for (const element of elements) await routeAudio(element, next.output);
      } catch (error) {
        await Promise.allSettled(elements.map(element => routeAudio(element, audioSettings.output)));
        throw error;
      }
    }
    setAudioSettings(next);
  };

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    onParticipantsChange?.([
      { userId: currentUserId, username: user.username, avatar: user.avatar },
      ...participants.filter((participant) => participant.username)
    ]);
  }, [participants, currentUserId, user.username, user.avatar, onParticipantsChange]);

  useEffect(() => {
    if (isScreenSharing && screenShareRef.current && screenStreamRef.current) {
      screenShareRef.current.srcObject = screenStreamRef.current;
      screenShareRef.current.play().catch(() => {});
    }
  }, [isScreenSharing]);

  useEffect(() => {
    if (!mediaContextMenu) return undefined;

    const closeContextMenu = () => setMediaContextMenu(null);
    document.addEventListener('click', closeContextMenu);
    return () => {
      document.removeEventListener('click', closeContextMenu);
    };
  }, [mediaContextMenu]);

  useEffect(() => {
    if (!window.electronAPI?.onScreenAudioChunk) return undefined;
    return window.electronAPI.onScreenAudioChunk((chunk) => {
      screenAudioInputRef.current?.(chunk);
    });
  }, []);

  // Log quando o componente é montado
  useEffect(() => {
    console.log('🎥 VideoCall montado! Canal:', channel.name);
    console.log('   Channel ID:', channel._id);
    console.log('   User:', user.username);
    return () => {
      console.log('🎥 VideoCall desmontado!');
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Escuta ofertas de chamada
    socket.on('call:signal', handleCallSignal);
    socket.on('call:participants', handleCallParticipants);
    socket.on('call:screen-share', handleScreenShareState);
    socket.on('call:video-state', handleVideoState);
    socket.on('call:end', handleCallEnd);
    socket.on('call:user-joined', handleUserJoined);
    socket.on('call:user-left', handleUserLeft);

    return () => {
      socket.off('call:signal', handleCallSignal);
      socket.off('call:participants', handleCallParticipants);
      socket.off('call:screen-share', handleScreenShareState);
      socket.off('call:video-state', handleVideoState);
      socket.off('call:end', handleCallEnd);
      socket.off('call:user-joined', handleUserJoined);
      socket.off('call:user-left', handleUserLeft);
      
      endCall(false);
    };
  }, []);

  useEffect(() => {
    if (!inCall) return undefined;

    const streams = [
      { userId: currentUserId, stream: localStreamRef.current },
      ...participants.map((participant) => ({
        userId: participant.userId,
        stream: participant.micStream
      }))
    ].filter(({ stream }) => stream?.getAudioTracks().length);

    const audioContext = new AudioContext();
    const analysers = streams.map(({ userId, stream }) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      return { userId, analyser, data: new Uint8Array(analyser.fftSize) };
    });

    const interval = window.setInterval(() => {
      const nextSpeakingUsers = {};
      analysers.forEach(({ userId, analyser, data }) => {
        analyser.getByteTimeDomainData(data);
        const volume = Math.sqrt(
          data.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / data.length
        );
        if (volume > 0.045) nextSpeakingUsers[userId] = true;
      });
      setSpeakingUsers(nextSpeakingUsers);
    }, 100);

    return () => {
      window.clearInterval(interval);
      audioContext.close();
    };
  }, [inCall, participants, currentUserId]);

  /**
   * Inicia a chamada
   */
  const startCall = async () => {
    console.log('🎬 Iniciando chamada...');
    try {
      console.log('🎥 Solicitando acesso à câmera e microfone...');

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Câmera e microfone estão bloqueados porque o acesso pela rede está em HTTP. ' +
          'Abra o Discordovisk em HTTPS ou permita a origem insegura no Brave para testes.'
        );
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: microphoneConstraints(audioSettings)
      });

      console.log('✅ Acesso concedido! Stream:', stream);
      console.log('   Vídeo tracks:', stream.getVideoTracks().length);
      console.log('   Áudio tracks:', stream.getAudioTracks().length);

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('✅ Vídeo local configurado');
      }

      setIsVideoOff(true);
      setInCall(true);
      console.log('✅ Estado inCall definido como true');

      // Notifica que entrou na chamada
      const socket = getSocket();
      console.log('🔌 Socket:', socket ? 'Conectado' : 'Desconectado');
      
      if (socket) {
        socket.emit('call:join', {
          channelId: channel._id,
          serverId: channel.server,
          userId: currentUserId,
          username: user.username,
          avatar: user.avatar
        });
        socket.emit('call:video-state', {
          channelId: channel._id,
          isVideoOff: true
        });
        console.log('✅ Evento call:join emitido');
      } else {
        console.error('❌ Socket não está conectado!');
      }

    } catch (error) {
      console.error('❌ Erro ao acessar mídia:', error);
      console.error('   Nome do erro:', error.name);
      console.error('   Mensagem:', error.message);
      alert(`Erro ao acessar câmera/microfone: ${error.name}\n${error.message}\n\nVerifique as permissões no Brave.`);
    }
  };

  /**
   * Encerra a chamada
   */
  const endCall = (shouldClose = true) => {
    stopProcessAudioCapture();

    // Para todos os streams
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Fecha todas as conexões peer
    Object.values(peersRef.current).forEach(peer => {
      if (peer) peer.destroy();
    });
    peersRef.current = {};
    Object.values(screenPeersRef.current).forEach(peer => {
      if (peer) peer.destroy();
    });
    screenPeersRef.current = {};

    setInCall(false);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
    setParticipants([]);

    // Notifica que saiu da chamada
    const socket = getSocket();
    socket?.emit('call:leave', {
      channelId: channel._id,
      serverId: channel.server,
      userId: currentUserId
    });

    if (shouldClose && onClose) onClose();
  };

  /**
   * Alterna mute do microfone
   */
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  /**
   * Alterna vídeo da câmera
   */
  const toggleVideo = () => {
    if (!localStreamRef.current) return;

    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      const videoOff = !videoTrack.enabled;
      setIsVideoOff(videoOff);
      getSocket()?.emit('call:video-state', {
        channelId: channel._id,
        isVideoOff: videoOff
      });
      return;
    }

    navigator.mediaDevices.getUserMedia({ video: true }).then((cameraStream) => {
      const cameraTrack = cameraStream.getVideoTracks()[0];
      localStreamRef.current.addTrack(cameraTrack);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }

      Object.values(peersRef.current).forEach((peer) => {
        peer.addTrack(cameraTrack, localStreamRef.current);
      });

      setIsVideoOff(false);
      getSocket()?.emit('call:video-state', {
        channelId: channel._id,
        isVideoOff: false
      });
    }).catch((error) => {
      console.error('Erro ao ligar a câmera:', error);
      alert('Não foi possível ligar a câmera. Verifique a permissão do navegador.');
    });
  };

  /**
   * Inicia/para compartilhamento de tela
   */
  const toggleScreenShare = async () => {
    if (isScreenSharingRef.current) {
      // Para o compartilhamento de tela
      const previousScreenStream = screenStreamRef.current;
      stopProcessAudioCapture();
      if (previousScreenStream) {
        previousScreenStream.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Volta para a câmera
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);

      isScreenSharingRef.current = false;
      Object.entries(screenPeersRef.current).forEach(([key, peer]) => {
        if (key.startsWith('send:')) {
          delete screenPeersRef.current[key];
          peer?.destroy();
        }
      });

      getSocket()?.emit('call:screen-share', {
        channelId: channel._id,
        isSharing: false
      });

    } else {
      // Inicia o compartilhamento de tela
      try {
        if (window.electronAPI?.getScreenSources) {
          const sources = await window.electronAPI.getScreenSources();
          if (!sources.length) {
            alert('Nenhuma tela ou janela disponível para compartilhar.');
            return;
          }
          setScreenSources(sources);
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: true
        });

        await startScreenShare(screenStream);
      } catch (error) {
        console.error('Erro ao compartilhar tela:', error);
        alert('Erro ao compartilhar tela. Verifique as permissões.');
      }
    }
  };

  const stopProcessAudioCapture = () => {
    screenAudioInputRef.current = null;
    screenAudioQueueRef.current = [];
    screenAudioNodeRef.current?.disconnect();
    screenAudioNodeRef.current = null;
    const audioContext = screenAudioContextRef.current;
    screenAudioContextRef.current = null;
    audioContext?.close().catch(() => {});
    window.electronAPI?.stopScreenAudioCapture?.().catch(() => {});
  };

  const startProcessAudioCapture = async (processId) => {
    if (!window.electronAPI?.startScreenAudioCapture || !processId) return null;

    const audioContext = new AudioContext({ sampleRate: 48000 });
    const destination = audioContext.createMediaStreamDestination();
    const processor = audioContext.createScriptProcessor(2048, 0, 2);
    screenAudioContextRef.current = audioContext;
    screenAudioNodeRef.current = processor;
    screenAudioQueueRef.current = [];

    processor.onaudioprocess = ({ outputBuffer }) => {
      const left = outputBuffer.getChannelData(0);
      const right = outputBuffer.getChannelData(1);
      left.fill(0);
      right.fill(0);
      let offset = 0;
      const queue = screenAudioQueueRef.current;

      while (offset < left.length && queue.length) {
        const current = queue[0];
        const available = current.left.length - current.offset;
        const count = Math.min(left.length - offset, available);
        left.set(current.left.subarray(current.offset, current.offset + count), offset);
        right.set(current.right.subarray(current.offset, current.offset + count), offset);
        current.offset += count;
        offset += count;
        if (current.offset === current.left.length) queue.shift();
      }
    };
    processor.connect(destination);

    screenAudioInputRef.current = (chunk) => {
      const bytes = chunk?.type === 'Buffer' && Array.isArray(chunk.data)
        ? Uint8Array.from(chunk.data)
        : new Uint8Array(chunk.buffer, chunk.byteOffset || 0, chunk.byteLength);
      const frameCount = Math.floor(bytes.byteLength / 4);
      if (!frameCount) return;

      const samples = new Int16Array(bytes.buffer, bytes.byteOffset, frameCount * 2);
      const left = new Float32Array(frameCount);
      const right = new Float32Array(frameCount);
      for (let index = 0; index < frameCount; index += 1) {
        left[index] = samples[index * 2] / 32768;
        right[index] = samples[index * 2 + 1] / 32768;
      }

      const queue = screenAudioQueueRef.current;
      queue.push({ left, right, offset: 0 });
      if (queue.length > 25) queue.splice(0, queue.length - 25);
    };

    const result = await window.electronAPI.startScreenAudioCapture(processId);
    if (!result?.ok) {
      stopProcessAudioCapture();
      throw new Error(result?.message || 'Não foi possível capturar o áudio da janela.');
    }

    await audioContext.resume();
    return destination.stream.getAudioTracks()[0] || null;
  };

  const startScreenShare = async (screenStream, processId = null) => {
    try {
        // O Electron fornece o áudio do sistema junto com getDisplayMedia quando
        // solicitado. A captura por processo é somente uma reserva para casos
        // em que o Windows não tenha criado uma faixa de áudio nativa.
        if (!screenStream.getAudioTracks().length && window.electronAPI?.startScreenAudioCapture) {
          if (processId) {
            try {
              const processAudioTrack = await startProcessAudioCapture(processId);
              if (processAudioTrack) screenStream.addTrack(processAudioTrack);
            } catch (error) {
              stopProcessAudioCapture();
              setCallNotice(`A imagem será transmitida sem áudio: ${error.message}`);
            }
          } else {
            console.warn('Telas inteiras não possuem um único processo para capturar o áudio exclusivo.');
          }
        }

        if (!screenStream.getVideoTracks().some(track => track.readyState === 'live')) {
          throw new Error('A janela foi fechada ou não forneceu uma faixa de vídeo. Selecione novamente.');
        }
        screenStreamRef.current = screenStream;
        isScreenSharingRef.current = true;

        // O elemento de vídeo será renderizado após esta mudança de estado.
        setIsScreenSharing(true);

        getSocket()?.emit('call:screen-share', {
          channelId: channel._id,
          isSharing: true
        });

        // Quando o usuário para de compartilhar pela interface do navegador
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };

        // A tela é enviada somente pela conexão dedicada, uma por espectador.
        Object.keys(peersRef.current).forEach((userId) => {
          createScreenPeer(userId, true);
        });

    } catch (error) {
      console.error('Erro ao iniciar compartilhamento:', error);
      screenStream.getTracks().forEach(track => { track.onended = null; track.stop(); });
      screenStreamRef.current = null;
      isScreenSharingRef.current = false;
      setIsScreenSharing(false);
      stopProcessAudioCapture();
      setCallNotice(`Não foi possível iniciar o compartilhamento: ${error.message}`);
    }
  };

  const selectScreenSource = async (source) => {
    if (selectingScreenRef.current) return;
    selectingScreenRef.current = true;
    setCallNotice('');
    try {
      const selection = await window.electronAPI?.selectScreenSource?.(source.id);
      if (!selection) {
        throw new Error('O aplicativo não confirmou a fonte de tela selecionada.');
      }
      let screenStream;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: true });
      } catch (error) {
        if (!['NotReadableError', 'NotSupportedError'].includes(error.name)) throw error;
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
        setCallNotice('O Windows não forneceu áudio da tela. A imagem pode ser compartilhada; confira o som da transmissão.');
      }
      setScreenSources([]);
      await startScreenShare(screenStream, selection?.processId);
    } catch (error) {
      console.error('Erro ao capturar a fonte escolhida:', error);
      setCallNotice(`Não foi possível compartilhar essa tela ou janela: ${error.name}: ${error.message}`);
    } finally {
      selectingScreenRef.current = false;
    }
  };

  /**
   * Cria uma conexão peer
   */
  const createPeer = (userId, initiator = false, participantAvatar, participantUsername, participantIsScreenSharing = false) => {
    setParticipants(prev => {
      const exists = prev.find(participant => participant.userId === userId);
      if (exists) {
        return prev.map(participant => participant.userId === userId
          ? {
            ...participant,
            avatar: participant.avatar || participantAvatar,
            username: participant.username || participantUsername
          }
          : participant
        );
      }
      return [...prev, {
        userId,
        stream: null,
        avatar: participantAvatar,
        username: participantUsername,
        isVideoOff: true,
        isScreenSharing: participantIsScreenSharing
      }];
    });

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    // Cada track é adicionada vinculada ao seu stream de origem real (voz ou tela),
    // para que o lado remoto consiga diferenciar os dois streams pelo id.
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });
    }
    const handleIncomingStream = (stream) => {
      setParticipants(prev => prev.map(participant => {
        if (participant.userId !== userId) return participant;

        const voiceStreamId = participant.voiceStreamId || stream.id;
        const isVoiceStream = stream.id === voiceStreamId;

        if (isVoiceStream) {
          return {
            ...participant,
            voiceStreamId,
            micStream: new MediaStream(stream.getAudioTracks()),
            cameraStream: new MediaStream(stream.getVideoTracks())
          };
        }

        return participant;
      }));
    };

    peer.on('signal', (signal) => {
      const socket = getSocket();
      if (!socket?.connected || peer.destroyed) return;
      socket.emit('call:signal', {
        signal,
        recipientId: userId,
        channelId: channel._id,
        senderAvatar: user.avatar,
        senderUsername: user.username
      });
    });

    peer.on('stream', handleIncomingStream);
    peer.on('track', (track, stream) => {
      if (stream) handleIncomingStream(stream);
    });

    peer.on('error', (error) => {
      console.error('Erro no peer:', error);
    });

    peersRef.current[userId] = peer;
    return peer;
  };

  const createScreenPeer = (userId, initiator = false, participantAvatar, participantUsername, incomingSession) => {
    const key = `${initiator ? 'send' : 'receive'}:${userId}`;
    const existingPeer = screenPeersRef.current[key];
    if (existingPeer && !existingPeer.destroyed) return existingPeer;
    const sessionId = incomingSession || `${currentUserId}-${Date.now()}-${Math.random()}`;

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    // Só quem está compartilhando anexa as tracks. Quem voltou para a call
    // inicia a conexão vazia e recebe a tela do outro lado.
    if (initiator && screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        peer.addTrack(track, screenStreamRef.current);
      });
    }

    const receiveScreenStream = (stream) => {
      if (initiator || screenPeersRef.current[key] !== peer) return;
      setParticipants((previousParticipants) => {
        const currentParticipant = previousParticipants.find((participant) => participant.userId === userId) || {
          userId,
          avatar: participantAvatar,
          username: participantUsername,
          isVideoOff: true
        };
        const updatedParticipant = {
          ...currentParticipant,
          avatar: currentParticipant.avatar || participantAvatar,
          username: currentParticipant.username || participantUsername,
          isScreenSharing: true,
          screenVideoStream: stream.getVideoTracks().length
            ? new MediaStream(stream.getVideoTracks())
            : currentParticipant.screenVideoStream,
          screenAudioStream: stream.getAudioTracks().length
            ? new MediaStream(stream.getAudioTracks())
            : currentParticipant.screenAudioStream
        };

        return previousParticipants.some((participant) => participant.userId === userId)
          ? previousParticipants.map((participant) => participant.userId === userId ? updatedParticipant : participant)
          : [...previousParticipants, updatedParticipant];
      });
    };

    peer.on('signal', (peerSignal) => {
      const socket = getSocket();
      if (!socket?.connected || peer.destroyed) return;
      socket.emit('call:signal', {
        // O servidor apenas repassa "signal"; este envelope permite separar a
        // tela da conexão normal de voz sem mudança no protocolo do servidor.
        signal: { _discordoviskMedia: 'screen', payload: peerSignal,
          screenOwner: initiator ? currentUserId : userId, sessionId },
        recipientId: userId,
        channelId: channel._id,
        senderAvatar: user.avatar,
        senderUsername: user.username
      });
    });

    peer.on('stream', receiveScreenStream);
    peer.on('track', (track, stream) => {
      if (stream) receiveScreenStream(stream);
    });
    peer.on('error', (error) => {
      console.error('Erro no peer de compartilhamento:', error);
    });
    peer.on('close', () => {
      if (screenPeersRef.current[key] === peer) delete screenPeersRef.current[key];
    });

    peer.screenSessionId = sessionId;
    screenPeersRef.current[key] = peer;
    return peer;
  };

  const handleCallSignal = ({ signal, senderId, senderAvatar, senderUsername, channelId }) => {
    if (channelId !== channel._id || String(senderId) === currentUserId || !localStreamRef.current) return;

    if (signal?._discordoviskMedia === 'screen') {
      const isSender = signal.screenOwner === currentUserId;
      const key = `${isSender ? 'send' : 'receive'}:${senderId}`;
      let screenPeer = screenPeersRef.current[key];
      if (signal.payload?.type === 'offer' && !isSender && screenPeer
          && screenPeer.screenSessionId !== signal.sessionId) {
        delete screenPeersRef.current[key];
        screenPeer.destroy();
        screenPeer = null;
      }
      if (!screenPeer || screenPeer.destroyed) {
        if (isSender || signal.payload?.type !== 'offer') return;
        screenPeer = createScreenPeer(senderId, false, senderAvatar, senderUsername, signal.sessionId);
      }
      if (signal.sessionId && screenPeer.screenSessionId !== signal.sessionId) return;
      try {
        screenPeer.signal(signal.payload);
      } catch (error) {
        if (!error.message?.includes('peer is destroyed')) {
          console.error('Erro ao processar sinal da tela:', error);
        }
      }
      return;
    }

    setParticipants(prev => prev.map(participant => participant.userId === senderId
      ? {
        ...participant,
        username: participant.username || senderUsername,
        avatar: participant.avatar || senderAvatar
      }
      : participant
    ));

    let peer = peersRef.current[senderId];
    if (!peer) {
      peer = createPeer(senderId, false, senderAvatar, senderUsername);
    }

    if (peer.destroyed) return;

    try {
      peer.signal(signal);
    } catch (error) {
      if (!error.message?.includes('peer is destroyed')) {
        console.error('Erro ao processar sinal da chamada:', error);
      }
    }
  };

  const handleCallEnd = ({ userId }) => {
    const peer = peersRef.current[userId];
    if (peer) {
      peer.destroy();
      delete peersRef.current[userId];
    }
    ['send', 'receive'].forEach(direction => {
      const key = `${direction}:${userId}`;
      const screenPeer = screenPeersRef.current[key];
      delete screenPeersRef.current[key];
      screenPeer?.destroy();
    });
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const handleCallParticipants = (participantsInCall) => {
    participantsInCall.forEach(({ userId, username, avatar, isScreenSharing }) => {
      if (userId !== currentUserId && !peersRef.current[userId]) {
        createPeer(userId, true, avatar, username, isScreenSharing);
      }

      setParticipants(prev => prev.map(participant => participant.userId === userId
        ? {
          ...participant,
          username: participant.username || username,
          avatar: participant.avatar || avatar,
          isScreenSharing: Boolean(isScreenSharing)
        }
        : participant
      ));
    });
  };

  const handleUserJoined = ({ userId, username, avatar, channelId }) => {
    if (channelId && channelId !== channel._id) return;
    if (!localStreamRef.current || String(userId) === currentUserId) return;
    playCallJoinSound();
    setParticipants(prev => {
      const exists = prev.find(participant => participant.userId === userId);
      if (exists) {
        return prev.map(participant => participant.userId === userId
          ? { ...participant, username, avatar: avatar || participant.avatar }
          : participant
        );
      }

      return [...prev, {
        userId,
        stream: null,
        username,
        avatar,
        isVideoOff: true
      }];
    });

    // A pessoa que voltou recebe uma conexão de tela nova imediatamente. Isso
    // independe do estado da conexão de voz que ela acabou de reconstruir.
    if (screenStreamRef.current) {
      const key = `send:${userId}`;
      const previous = screenPeersRef.current[key];
      delete screenPeersRef.current[key];
      previous?.destroy();
      createScreenPeer(userId, true, avatar, username);
    }
  };

  const playCallJoinSound = () => {
    const audioContext = new AudioContext();
    const now = audioContext.currentTime;
    const gain = audioContext.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    gain.connect(audioContext.destination);

    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + 0.45);
    });

    window.setTimeout(() => audioContext.close(), 600);
  };

  const handleUserLeft = ({ userId, channelId }) => {
    if (channelId && channelId !== channel._id) return;
    handleCallEnd({ userId });
  };

  const handleScreenShareState = ({ userId, isSharing }) => {
    if (!isSharing && screenPeersRef.current[`receive:${userId}`]) {
      screenPeersRef.current[`receive:${userId}`].destroy();
      delete screenPeersRef.current[`receive:${userId}`];
    }
    setParticipants(prev => prev.map((participant) => (
      participant.userId === userId
        ? { ...participant, isScreenSharing: isSharing,
          ...(!isSharing ? { screenVideoStream: null, screenAudioStream: null } : {}) }
        : participant
    )));
  };

  const handleVideoState = ({ userId, isVideoOff: remoteVideoOff }) => {
    setParticipants(prev => prev.map((participant) => (
      participant.userId === userId
        ? { ...participant, isVideoOff: remoteVideoOff }
        : participant
    )));
  };

  const setParticipantVolume = (userId, volume, isScreenSharing) => {
    const setVolumes = isScreenSharing ? setScreenShareVolumes : setParticipantVolumes;
    setVolumes((currentVolumes) => ({
      ...currentVolumes,
      [userId]: Number(volume)
    }));
  };

  const openMediaContextMenu = (event) => {
    event.preventDefault();
    setMediaContextMenu({
      x: event.clientX,
      y: event.clientY,
      video: event.currentTarget
    });
  };

  const openPictureInPicture = async () => {
    const video = mediaContextMenu?.video;
    setMediaContextMenu(null);
    if (!video || !document.pictureInPictureEnabled || !video.requestPictureInPicture) return;

    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Não foi possível abrir Picture in Picture:', error);
    }
  };

  return (
    <div className="video-call-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999 }}>
      <div className="video-call-container">
        <div className="call-header">
          <h3>📞 {channel.name}</h3>
          <button onClick={endCall} className="btn-close-call">
            ✕
          </button>
        </div>

        <CallAudioSettings settings={audioSettings} onChange={changeAudioSettings} inCall={inCall} />
        {callNotice && <div className="call-notice" role="alert">{callNotice}
          <button onClick={() => setCallNotice('')} aria-label="Fechar aviso">✕</button>
        </div>}
        {!inCall ? (
          <div className="call-start">
            <div className="call-info">
              <div className="call-icon">🎧</div>
              <h2>Entrar na chamada</h2>
              <p>Canal de voz: {channel.name}</p>
            </div>
            <button onClick={startCall} className="btn-join-call">
              Entrar na Chamada
            </button>
          </div>
        ) : (
          <>
            <Jukebox channelId={channel._id} active={inCall} />
            <div className="videos-grid">
              {/* Vídeo local */}
              <div
                className={`video-wrapper ${speakingUsers[currentUserId] ? 'speaking' : ''} ${expandedParticipantId === 'local' ? 'screen-expanded' : ''}`}
                onClick={() => isScreenSharing && setExpandedParticipantId(expandedParticipantId === 'local' ? null : 'local')}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="video-element"
                  style={{ display: isScreenSharing ? 'none' : 'block' }}
                />
                {isScreenSharing && (
                  <video
                    ref={screenShareRef}
                    autoPlay
                    muted
                    playsInline
                    className="video-element screen-share-element"
                    onContextMenu={openMediaContextMenu}
                    onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})}
                  />
                )}
                <div className="video-label">
                  {user.username} {isScreenSharing && '(Compartilhando)'}
                </div>
                {isVideoOff && !isScreenSharing && (
                  <div className="video-off-overlay">
                    <img
                      src={user.avatar || 'https://via.placeholder.com/160'}
                      alt={user.username}
                      className="avatar-large"
                    />
                  </div>
                )}
              </div>

              {/* Vídeos dos participantes */}
              {participants.map((participant) => (
                <ParticipantVideo
                  key={participant.userId}
                  participant={participant}
                  outputDevice={audioSettings.output}
                  onAudioError={setCallNotice}
                  isSpeaking={Boolean(speakingUsers[participant.userId])}
                  isExpanded={expandedParticipantId === participant.userId}
                  voiceVolume={participantVolumes[participant.userId] ?? 1}
                  screenShareVolume={screenShareVolumes[participant.userId] ?? 1}
                  onVolumeChange={(volume, isScreenAudio) => setParticipantVolume(
                    participant.userId,
                    volume,
                    isScreenAudio
                  )}
                  onExpand={() => setExpandedParticipantId(expandedParticipantId === participant.userId ? null : participant.userId)}
                />
              ))}
            </div>

            {mediaContextMenu && (
              <div
                className="media-context-menu"
                style={{ top: mediaContextMenu.y, left: mediaContextMenu.x }}
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" onClick={openPictureInPicture}>
                  {document.pictureInPictureElement === mediaContextMenu.video
                    ? 'Sair do Picture in Picture'
                    : 'Abrir em Picture in Picture'}
                </button>
              </div>
            )}

            {screenSources.length > 0 && (
              <div className="screen-source-overlay">
                <div className="screen-source-dialog">
                  <div className="screen-source-header">
                    <h2>Escolha o que compartilhar</h2>
                    <button type="button" onClick={() => setScreenSources([])} title="Cancelar">✕</button>
                  </div>
                  <p>Escolha uma janela ou tela. O áudio continua tocando normalmente no seu computador durante a transmissão.</p>
                  <div className="screen-source-grid">
                    {screenSources.map((source) => (
                      <button
                        type="button"
                        className="screen-source-option"
                        key={source.id}
                        onClick={() => selectScreenSource(source)}
                      >
                        <img src={source.thumbnail} alt="" />
                        <span>{source.name}</span>
                        <small>{source.isWindow ? 'Imagem e áudio da transmissão' : 'Tela com áudio da transmissão'}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Controles da chamada */}
            <div className="call-controls">
              <button
                onClick={toggleMute}
                className={`control-btn ${isMuted ? 'active' : ''}`}
                title={isMuted ? 'Ativar microfone' : 'Mutar microfone'}
              >
                {isMuted ? '🔇' : '🎤'}
              </button>

              <button
                onClick={toggleVideo}
                className={`control-btn ${isVideoOff ? 'active' : ''}`}
                title={isVideoOff ? 'Ativar câmera' : 'Desligar câmera'}
              >
                {isVideoOff ? '📷' : '📹'}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                title={isScreenSharing ? 'Parar compartilhamento' : 'Compartilhar tela'}
              >
                {isScreenSharing ? '🖥️' : '💻'}
              </button>

              <button
                onClick={endCall}
                className="control-btn disconnect"
                title="Desligar"
              >
                📞
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Componente para exibir vídeo de um participante
 */
function ParticipantVideo({
  participant,
  outputDevice,
  onAudioError,
  isSpeaking,
  isExpanded,
  voiceVolume,
  screenShareVolume,
  onVolumeChange,
  onExpand
}) {
  const videoRef = useRef(null);
  const voiceAudioRef = useRef(null);
  const screenAudioRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [mediaContextMenu, setMediaContextMenu] = useState(null);

  useEffect(() => {
    setIsVideoPlaying(false);
    const displayStream = participant.isScreenSharing && participant.screenVideoStream
      ? participant.screenVideoStream
      : participant.cameraStream;
    if (videoRef.current && displayStream) {
      videoRef.current.srcObject = displayStream;
      videoRef.current.play().catch(() => {});
    }
  }, [participant.cameraStream, participant.screenVideoStream, participant.isScreenSharing]);

  useEffect(() => {
    configurePlayback(voiceAudioRef.current, participant.micStream, voiceVolume, outputDevice)
      .catch(error => onAudioError(`Não foi possível usar a saída da voz: ${error.message}`));
  }, [participant.micStream, voiceVolume, outputDevice, onAudioError]);

  useEffect(() => {
    configurePlayback(screenAudioRef.current, participant.screenAudioStream, screenShareVolume, outputDevice)
      .catch(error => onAudioError(`Não foi possível usar a saída da transmissão: ${error.message}`));
  }, [participant.screenAudioStream, screenShareVolume, outputDevice, onAudioError]);

  useEffect(() => {
    if (!mediaContextMenu) return undefined;

    const closeContextMenu = () => setMediaContextMenu(null);
    document.addEventListener('click', closeContextMenu);
    return () => {
      document.removeEventListener('click', closeContextMenu);
    };
  }, [mediaContextMenu]);

  const openMediaContextMenu = (event) => {
    event.preventDefault();
    setMediaContextMenu({ x: event.clientX, y: event.clientY });
  };

  const openPictureInPicture = async () => {
    setMediaContextMenu(null);
    if (!videoRef.current || !document.pictureInPictureEnabled || !videoRef.current.requestPictureInPicture) return;

    try {
      if (document.pictureInPictureElement === videoRef.current) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Não foi possível abrir Picture in Picture:', error);
    }
  };

  return (
    <div
      className={`video-wrapper ${isSpeaking ? 'speaking' : ''} ${isExpanded ? 'screen-expanded' : ''}`}
      onClick={participant.isScreenSharing ? onExpand : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`video-element ${participant.isScreenSharing ? 'screen-share-element' : ''}`}
        onContextMenu={openMediaContextMenu}
        onPlaying={() => setIsVideoPlaying(true)}
      />
      <audio ref={voiceAudioRef} autoPlay playsInline />
      {!participant.isScreenSharing && (participant.isVideoOff || !isVideoPlaying) && (
        <div className="video-off-overlay">
          <img
            src={participant.avatar || 'https://via.placeholder.com/160'}
            alt="Avatar do participante"
            className="avatar-large"
          />
        </div>
      )}
      <div className="video-label">
        {participant.isScreenSharing ? '🖥️ Compartilhando tela' : (participant.username || `Participante ${participant.userId.substring(0, 8)}`)}
      </div>
      <label className="volume-control" onClick={(event) => event.stopPropagation()}>
        <span aria-hidden="true">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={voiceVolume}
          aria-label={`Volume da voz de ${participant.username || 'participante'}`}
          onChange={(event) => onVolumeChange(event.target.value, false)}
        />
      </label>
      {participant.isScreenSharing && (
        <label className="volume-control volume-control-screen" onClick={(event) => event.stopPropagation()}>
          <span aria-hidden="true">🖥️</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={screenShareVolume}
            aria-label={`Volume do compartilhamento de ${participant.username || 'participante'}`}
            onChange={(event) => onVolumeChange(event.target.value, true)}
          />
        </label>
      )}
      <audio ref={screenAudioRef} autoPlay playsInline />
      {mediaContextMenu && (
        <div
          className="media-context-menu"
          style={{ top: mediaContextMenu.y, left: mediaContextMenu.x }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={openPictureInPicture}>
            {document.pictureInPictureElement === videoRef.current
              ? 'Sair do Picture in Picture'
              : 'Abrir em Picture in Picture'}
          </button>
        </div>
      )}
    </div>
  );
}

export default VideoCall;
