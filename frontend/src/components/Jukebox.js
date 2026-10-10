import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import './Jukebox.css';

const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com';
const clampVolume = (value) => Math.max(0, Math.min(100, Number(value) || 0));

function Jukebox({ channelId, active }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [jukebox, setJukebox] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [playerEnabled, setPlayerEnabled] = useState(false);
  const [volume, setVolume] = useState(() => {
    try {
      return clampVolume(window.localStorage.getItem('discordovisk-jukebox-volume') ?? 100);
    } catch {
      return 100;
    }
  });
  const playerRef = useRef(null);

  const sendPlayerCommand = useCallback((func, args = []) => {
    const playerWindow = playerRef.current?.contentWindow;
    if (!playerWindow) return;
    playerWindow.postMessage(JSON.stringify({ event: 'command', func, args }), PLAYER_ORIGIN);
  }, []);

  const applyPlayerVolume = useCallback((nextVolume) => {
    sendPlayerCommand('setVolume', [clampVolume(nextVolume)]);
  }, [sendPlayerCommand]);

  useEffect(() => {
    if (!active || !channelId) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const onState = (nextState) => setJukebox(nextState);
    const onError = ({ message }) => setError(message || 'Não foi possível atualizar a Jukebox.');
    const requestCurrentState = () => socket.emit('jukebox:state', { channelId });
    socket.on('jukebox:state', onState);
    socket.on('jukebox:error', onError);
    socket.on('connect', requestCurrentState);
    // A entrada no canal de voz chega ao servidor imediatamente antes deste
    // componente montar. Um pequeno atraso evita pedir o estado antes do join.
    const requestState = window.setTimeout(() => socket.emit('jukebox:state', { channelId }), 250);

    return () => {
      window.clearTimeout(requestState);
      socket.off('jukebox:state', onState);
      socket.off('jukebox:error', onError);
      socket.off('connect', requestCurrentState);
    };
  }, [active, channelId]);

  useEffect(() => {
    try {
      window.localStorage.setItem('discordovisk-jukebox-volume', String(volume));
    } catch { /* armazenamento pode estar indisponível */ }
    applyPlayerVolume(volume);
  }, [volume, applyPlayerVolume]);

  useEffect(() => {
    const videoId = jukebox?.current?.videoId;
    const changedAt = jukebox?.changedAt;
    if (!active || !videoId || !changedAt) return undefined;

    const onPlayerMessage = (event) => {
      if (!['https://www.youtube.com', PLAYER_ORIGIN].includes(event.origin)) return;
      if (event.source !== playerRef.current?.contentWindow) return;
      let message;
      try {
        message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }
      if (message?.event === 'onReady') {
        applyPlayerVolume(volume);
        return;
      }
      if (message?.event !== 'onStateChange' || Number(message.info) !== 0) return;
      getSocket()?.emit('jukebox:control', { channelId, action: 'ended', videoId, changedAt });
    };

    window.addEventListener('message', onPlayerMessage);
    return () => window.removeEventListener('message', onPlayerMessage);
  }, [active, channelId, jukebox?.current?.videoId, jukebox?.changedAt, applyPlayerVolume, volume]);

  useEffect(() => {
    const current = jukebox?.current;
    const durationSeconds = Number(current?.durationSeconds);
    const changedAt = jukebox?.changedAt;
    if (!active || jukebox?.status !== 'playing' || !current?.videoId || !changedAt || !durationSeconds) return undefined;

    // O evento do YouTube é o caminho principal. Este alarme é um reforço para
    // casos em que o iframe não entrega o evento de fim (por exemplo, uma aba
    // que ficou em segundo plano). O servidor aceita somente a faixa atual.
    const remainingMs = Math.max(1000, (durationSeconds - Number(jukebox.position || 0)) * 1000 + 2000);
    const timer = window.setTimeout(() => {
      getSocket()?.emit('jukebox:control', {
        channelId,
        action: 'ended',
        videoId: current.videoId,
        changedAt
      });
    }, remainingMs);
    return () => window.clearTimeout(timer);
  }, [active, channelId, jukebox?.status, jukebox?.current?.videoId, jukebox?.current?.durationSeconds, jukebox?.changedAt, jukebox?.position]);

  const playerUrl = useMemo(() => {
    if (!jukebox?.current?.videoId) return '';
    const start = Math.max(0, Math.floor(jukebox.position || 0));
    const autoplay = playerEnabled && jukebox.status === 'playing' ? '1' : '0';
    const origin = /^https?:$/.test(window.location.protocol)
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(jukebox.current.videoId)}?enablejsapi=1&autoplay=${autoplay}&start=${start}&playsinline=1&rel=0${origin}`;
  }, [jukebox, playerEnabled]);

  const search = async (event) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    setSearching(true);
    setError('');
    try {
      const { data } = await api.get('/jukebox/search', { params: { q: value } });
      setResults(data.results || []);
      if (!data.results?.length) setError('Nenhuma música encontrada.');
    } catch (requestError) {
      setResults([]);
      setError(requestError.response?.data?.error || 'Não foi possível pesquisar agora.');
    } finally {
      setSearching(false);
    }
  };

  const addTrack = (track) => {
    const socket = getSocket();
    if (!socket) return setError('Reconectando ao servidor… tente novamente em instantes.');
    socket.emit('jukebox:add', { channelId, track });
    setResults([]);
    setQuery('');
  };

  const control = (action) => {
    const socket = getSocket();
    if (socket) socket.emit('jukebox:control', { channelId, action });
  };

  const changeVolume = (event) => {
    const nextVolume = clampVolume(event.target.value);
    setVolume(nextVolume);
    applyPlayerVolume(nextVolume);
  };

  if (!active) return null;

  return (
    <aside className="jukebox" aria-label="Jukebox do canal">
      <div className="jukebox-heading">
        <span aria-hidden="true">♫</span>
        <strong>Jukebox</strong>
      </div>

      <form className="jukebox-search" onSubmit={search}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Procure uma música ou cole um link do YouTube"
          aria-label="Procurar música no YouTube"
        />
        <button type="submit" disabled={searching}>{searching ? '...' : 'Buscar'}</button>
      </form>

      {error && <p className="jukebox-error">{error}</p>}

      {results.length > 0 && (
        <div className="jukebox-results" role="list">
          {results.map((track) => (
            <button key={track.videoId} type="button" className="jukebox-result" onClick={() => addTrack(track)}>
              {track.thumbnail && <img src={track.thumbnail} alt="" />}
              <span><b>{track.title}</b><small>{track.channelTitle}</small></span>
              <i>Adicionar</i>
            </button>
          ))}
        </div>
      )}

      {jukebox?.current ? (
        <div className="jukebox-now-playing">
          <div className="jukebox-now-info">
            <span>Tocando agora</span>
            <strong>{jukebox.current.title}</strong>
            <small>{jukebox.current.channelTitle || 'YouTube'} · pedido por {jukebox.current.requestedBy}</small>
          </div>
          <div className="jukebox-actions">
            <button type="button" onClick={() => control(jukebox.status === 'playing' ? 'pause' : 'play')}>
              {jukebox.status === 'playing' ? 'Pausar' : 'Tocar'}
            </button>
            <button type="button" onClick={() => control('skip')}>Pular</button>
            {!playerEnabled && <button type="button" className="jukebox-listen" onClick={() => setPlayerEnabled(true)}>Ouvir</button>}
          </div>
          <label className="jukebox-volume">
            <span>Volume <output>{volume}%</output></span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={changeVolume}
              aria-label="Volume da Jukebox"
            />
          </label>
          <iframe
            key={`${jukebox.current.videoId}:${jukebox.changedAt}:${playerEnabled}`}
            ref={playerRef}
            className="jukebox-player"
            src={playerUrl}
            title={`Jukebox: ${jukebox.current.title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => applyPlayerVolume(volume)}
          />
          {!playerEnabled && <p className="jukebox-audio-note">Clique em “Ouvir” uma vez para liberar o áudio neste computador.</p>}
        </div>
      ) : (
        <p className="jukebox-empty">Escolha uma música para iniciar a fila.</p>
      )}

      {jukebox?.queue?.length > 0 && (
        <div className="jukebox-queue">
          <span>Próximas ({jukebox.queue.length})</span>
          {jukebox.queue.slice(0, 3).map((track, index) => <p key={`${track.videoId}-${index}`}>{track.title}</p>)}
        </div>
      )}
    </aside>
  );
}

export default Jukebox;
