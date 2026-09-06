import React, { useState, useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import { getSocket } from '../services/socket';
import { useAuth } from '../contexts/AuthContext';
import './VideoCall.css';

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
  
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const currentUserId = String(user?.id || user?._id || '');

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
        stream: participant.stream
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
        audio: true
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

    setInCall(false);
    setIsScreenSharing(false);

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
    if (isScreenSharing) {
      // Para o compartilhamento de tela
      const previousScreenStream = screenStreamRef.current;
      if (previousScreenStream) {
        previousScreenStream.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      // Volta para a câmera
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setIsScreenSharing(false);

      const cameraTrack = localStreamRef.current?.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(peer => {
        if (peer && previousScreenStream) {
          const screenTrack = previousScreenStream.getVideoTracks()[0];
          const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender && cameraTrack) {
            sender.replaceTrack(cameraTrack);
          } else if (screenTrack) {
            peer.removeTrack(screenTrack, previousScreenStream);
          }
        }
      });

      getSocket()?.emit('call:screen-share', {
        channelId: channel._id,
        isSharing: false
      });

    } else {
      // Inicia o compartilhamento de tela
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always'
          },
          audio: false
        });

        screenStreamRef.current = screenStream;

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

        // Substitui a track de vídeo em todos os peers
        Object.values(peersRef.current).forEach(peer => {
          if (peer) {
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = peer._pc.getSenders().find(s => s.track?.kind === 'video');
            if (sender && videoTrack) {
              sender.replaceTrack(videoTrack);
            } else if (videoTrack) {
              peer.addTrack(videoTrack, screenStream);
            }
          }
        });

      } catch (error) {
        console.error('Erro ao compartilhar tela:', error);
        alert('Erro ao compartilhar tela. Verifique as permissões.');
      }
    }
  };

  /**
   * Cria uma conexão peer
   */
  const createPeer = (userId, initiator = false, participantAvatar, participantUsername) => {
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
        isVideoOff: true
      }];
    });

    const peer = new SimplePeer({
      initiator,
      trickle: true,
      stream: localStreamRef.current
    });

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

    peer.on('stream', (stream) => {
      setParticipants(prev => {
        return prev.map(participant => participant.userId === userId
          ? { ...participant, stream }
          : participant
        );
      });
    });

    peer.on('track', (track, stream) => {
      setParticipants(prev => prev.map(participant => participant.userId === userId
        ? { ...participant, stream }
        : participant
      ));
    });

    peer.on('error', (error) => {
      console.error('Erro no peer:', error);
    });

    peersRef.current[userId] = peer;
    return peer;
  };

  const handleCallSignal = ({ signal, senderId, senderAvatar, senderUsername }) => {
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
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const handleCallParticipants = (participantsInCall) => {
    participantsInCall.forEach(({ userId, username, avatar }) => {
      if (userId !== currentUserId && !peersRef.current[userId]) {
        createPeer(userId, true, avatar, username);
      }

      setParticipants(prev => prev.map(participant => participant.userId === userId
        ? {
          ...participant,
          username: participant.username || username,
          avatar: participant.avatar || avatar
        }
        : participant
      ));
    });
  };

  const handleUserJoined = ({ userId, username, avatar }) => {
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

  const handleUserLeft = ({ userId }) => {
    handleCallEnd({ userId });
  };

  const handleScreenShareState = ({ userId, isSharing }) => {
    setParticipants(prev => prev.map((participant) => (
      participant.userId === userId
        ? { ...participant, isScreenSharing: isSharing }
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

  return (
    <div className="video-call-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 9999 }}>
      <div className="video-call-container">
        <div className="call-header">
          <h3>📞 {channel.name}</h3>
          <button onClick={endCall} className="btn-close-call">
            ✕
          </button>
        </div>

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
                  isSpeaking={Boolean(speakingUsers[participant.userId])}
                  isExpanded={expandedParticipantId === participant.userId}
                  onExpand={() => setExpandedParticipantId(expandedParticipantId === participant.userId ? null : participant.userId)}
                />
              ))}
            </div>

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
function ParticipantVideo({ participant, isSpeaking, isExpanded, onExpand }) {
  const videoRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    setIsVideoPlaying(false);
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [participant.stream]);

  return (
    <div
      className={`video-wrapper ${isSpeaking ? 'speaking' : ''} ${isExpanded ? 'screen-expanded' : ''}`}
      onClick={participant.isScreenSharing ? onExpand : undefined}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`video-element ${participant.isScreenSharing ? 'screen-share-element' : ''}`}
        onPlaying={() => setIsVideoPlaying(true)}
      />
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
    </div>
  );
}

export default VideoCall;
