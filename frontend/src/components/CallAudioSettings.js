import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const storageKey = 'discordovisk.callAudio';
export function readAudioSettings() {
  try {
    return { input: '', output: '', noiseSuppression: true, ...JSON.parse(localStorage.getItem(storageKey) || '{}') };
  } catch {
    return { input: '', output: '', noiseSuppression: true };
  }
}

export function microphoneConstraints(settings) {
  return {
    ...(settings.input ? { deviceId: { exact: settings.input } } : {}),
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: true,
    autoGainControl: true
  };
}

const audioOperations = new WeakMap();
function enqueueAudio(element, operation) {
  if (!element) return Promise.resolve();
  const pending = (audioOperations.get(element) || Promise.resolve()).catch(() => {}).then(operation);
  audioOperations.set(element, pending);
  return pending;
}

async function setOutput(element, output) {
  const sink = output === 'default' ? '' : (output || '');
  if (!element.setSinkId) {
    if (sink) throw new Error('Este navegador não permite selecionar a saída de áudio.');
    return;
  }
  if (element.sinkId === sink) return;
  const wasPlaying = !element.paused;
  element.pause?.();
  try {
    await element.setSinkId(sink);
  } catch (error) {
    if (error.name !== 'AbortError') throw error;
    // Chromium can abort switching an active renderer. Release that renderer
    // before one retry, then restore the same incoming stream.
    const stream = element.srcObject;
    element.srcObject = null;
    try { await element.setSinkId(sink); }
    finally { element.srcObject = stream; }
  } finally {
    if (wasPlaying && element.srcObject) await element.play().catch(() => {});
  }
}

export function routeAudio(element, output) {
  return enqueueAudio(element, () => setOutput(element, output));
}

export function configurePlayback(element, stream, volume, output) {
  return enqueueAudio(element, async () => {
    await setOutput(element, output);
    if (element.srcObject !== stream) element.srcObject = stream || null;
    element.volume = volume;
    if (stream) await element.play().catch(() => {});
  });
}

export default function CallAudioSettings({ settings, onChange, inCall }) {
  const [devices, setDevices] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const updating = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const refresh = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        if (mounted.current) setDevices(list);
      } catch (e) { if (mounted.current) setError(e.message); }
    };
    refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => {
      mounted.current = false;
      navigator.mediaDevices?.removeEventListener('devicechange', refresh);
    };
  }, [inCall]);

  const update = async (patch) => {
    if (updating.current) return;
    updating.current = true;
    setBusy(true);
    setError('');
    try {
      const next = { ...settings, ...patch };
      await onChange(next);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Session settings still apply. */ }
    } catch (e) { setError(`Não foi possível aplicar: ${e.message}`); }
    finally { updating.current = false; setBusy(false); }
  };

  return createPortal(<>
    <button className="audio-settings-gear" title="Configurações de áudio" aria-label="Configurações de áudio"
      aria-expanded={open} onClick={() => setOpen(!open)}>⚙</button>
    {open && <section className="call-audio-settings" role="dialog" aria-label="Configurações de áudio"
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <div className="audio-settings-title"><strong>Configurações de áudio</strong>
      <button aria-label="Fechar configurações de áudio" onClick={() => setOpen(false)}>✕</button></div>
    <fieldset disabled={busy}>
      <label>Microfone (entrada)
        <select value={settings.input} onChange={e => update({ input: e.target.value })}>
          <option value="">Padrão do Windows</option>
          {devices.filter(d => d.kind === 'audioinput' && d.deviceId).map((d, i) =>
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Microfone ${i + 1}`}</option>)}
        </select>
      </label>
      <label>Fone / alto-falante (saída)
        <select value={settings.output} onChange={e => update({ output: e.target.value })}>
          <option value="">Padrão do Windows</option>
          {devices.filter(d => d.kind === 'audiooutput' && d.deviceId).map((d, i) =>
            <option key={d.deviceId} value={d.deviceId}>{d.label || `Saída ${i + 1}`}</option>)}
        </select>
      </label>
      <label><input type="checkbox" checked={settings.noiseSuppression}
        onChange={e => update({ noiseSuppression: e.target.checked })} /> Suprimir ruído do microfone</label>
    </fieldset>
    {!inCall && <p>Entre na chamada para liberar os nomes dos dispositivos.</p>}
    {error && <p role="alert">{error}</p>}
    </section>}
  </>, document.body);
}
