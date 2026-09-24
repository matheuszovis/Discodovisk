import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import './Jukebox.css';

function Jukebox({ channelId, active }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [jukebox, setJukebox] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [playerEnabled, setPlayerEnabled] = useState(false);

  useEffect(() => {
    if (!active || !channelId) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const onState = (nextState) => setJukebox(nextState);
    const onError = ({ message }) => setError(message || 'Não foi possível atualizar a Jukebox.');
    socket.on('jukebox:state', onState);
    socket.on('jukebox:error', onError);
    // A entrada no canal de voz chega ao servidor imediatamente antes deste
    // componente montar. Um pequeno atraso evita pedir o estado antes do join.
    const requestState = window.setTimeout(() => socket.emit('jukebox:state', { channelId }), 250);

    return () => {
      window.clearTimeout(requestState);
      socket.off('jukebox:state', onState);
      socket.off('jukebox:error', onError);
    };
  }, [active, channelId]);

  const playerUrl = useMemo(() => {
    if (!jukebox?.current?.videoId) return '';
    const start = Math.max(0, Math.floor(jukebox.position || 0));
    const autoplay = playerEnabled && jukebox.status === 'playing' ? '1' : '0';
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(jukebox.current.videoId)}?autoplay=${autoplay}&start=${start}&playsinline=1&rel=0`;
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

  if (!active) return null;

  return (
    <aside className="jukebox" aria-label="Jukebox do canal">
      <div className="jukebox-heading">
        <span aria-hidden="true">♫</span>
        <strong>Jukebox</strong>
        <small>sincronizada no canal</small>
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
          <iframe
            key={`${jukebox.current.videoId}:${jukebox.changedAt}:${playerEnabled}`}
            className="jukebox-player"
            src={playerUrl}
            title={`Jukebox: ${jukebox.current.title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
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
