import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import VideoCall from './VideoCall';
import { microphoneConstraints, readAudioSettings, routeAudio, configurePlayback } from './CallAudioSettings';

const mockHandlers = {};
const mockPeers = [];
const mockSocket = { connected: true, on: jest.fn((name, handler) => { mockHandlers[name] = handler; }),
  off: jest.fn(), emit: jest.fn() };
jest.mock('../services/socket', () => ({ getSocket: () => mockSocket }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'me', username: 'Eu' } }) }));
jest.mock('simple-peer', () => jest.fn().mockImplementation(options => {
  const events = {};
  const peer = { options, tracks: [], destroyed: false,
    on: (event, callback) => { events[event] = callback; },
    fire: (event, ...args) => events[event]?.(...args),
    addTrack: jest.fn((track, stream) => peer.tracks.push({ track, stream })),
    replaceTrack: jest.fn(), signal: jest.fn(),
    destroy: jest.fn(() => { peer.destroyed = true; events.close?.(); }) };
  mockPeers.push(peer);
  return peer;
}));

class Stream {
  constructor(tracks = []) { this.tracks = [...tracks]; this.id = Math.random().toString(); }
  getTracks() { return [...this.tracks]; }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  addTrack(t) { this.tracks.push(t); }
  removeTrack(t) { this.tracks = this.tracks.filter(x => x !== t); }
}
const track = kind => ({ kind, readyState: 'live', enabled: true, stop: jest.fn(), applyConstraints: jest.fn(async () => {}) });
let root, container, capture;
beforeEach(async () => {
  jest.clearAllMocks();
  mockPeers.length = 0;
  localStorage.clear();
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.MediaStream = Stream;
  global.AudioContext = class {
    constructor() { this.currentTime = 0; }
    createAnalyser() { return { fftSize: 512, getByteTimeDomainData: data => data.fill(128) }; }
    createMediaStreamSource() { return { connect() {} }; }
    createMediaStreamDestination() { return { stream: new Stream([track('audio')]) }; }
    createScriptProcessor() { return { connect() {}, disconnect() {} }; }
    resume() { return Promise.resolve(); }
    createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    createOscillator() { return { frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} }; }
    close() { return Promise.resolve(); }
  };
  capture = new Stream([track('video'), track('audio')]);
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: jest.fn(async () => new Stream([track('audio')])),
    getDisplayMedia: jest.fn(async () => capture), enumerateDevices: jest.fn(async () => []),
    addEventListener() {}, removeEventListener() {}
  } });
  window.electronAPI = undefined;
  HTMLMediaElement.prototype.play = jest.fn(async () => {});
  HTMLMediaElement.prototype.pause = jest.fn();
  HTMLMediaElement.prototype.setSinkId = jest.fn(async () => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(<VideoCall channel={{ _id: 'room', name: 'Call' }} />));
  await click('Entrar na Chamada');
  await act(async () => mockHandlers['call:participants']([{ userId: 'other', username: 'Outro' }]));
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
async function click(text) {
  const button = [...document.querySelectorAll('button')].find(b => b.textContent.includes(text) || b.title === text);
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
test('screen start/stop/restart never alters voice tracks or sends duplicate screen tracks', async () => {
  const voice = mockPeers[0];
  await click('Compartilhar tela');
  expect(voice.tracks.map(t => t.track.kind)).toEqual(['audio']);
  const screen = mockPeers[1];
  expect(screen.tracks.map(t => t.track.kind)).toEqual(['video', 'audio']);
  await click('Parar compartilhamento');
  expect(screen.destroyed).toBe(true);
  expect(voice.destroyed).toBe(false);
  capture = new Stream([track('video'), track('audio')]);
  await click('Compartilhar tela');
  expect(mockPeers[2].tracks).toHaveLength(2);
  expect(voice.tracks).toHaveLength(1);
});
test('returning viewer gets a fresh screen connection even when old leave was missed', async () => {
  await click('Compartilhar tela');
  const old = mockPeers[1];
  await act(async () => mockHandlers['call:user-joined']({ userId: 'other', channelId: 'room' }));
  expect(old.destroyed).toBe(true);
  expect(mockPeers[2].tracks.map(t => t.track.kind)).toEqual(['video', 'audio']);
  expect(capture.getVideoTracks()[0].stop).not.toHaveBeenCalled();
});
test('simultaneous sharing: stopping local share preserves incoming screen', async () => {
  await click('Compartilhar tela');
  await act(async () => mockHandlers['call:signal']({ channelId: 'room', senderId: 'other',
    signal: { _discordoviskMedia: 'screen', screenOwner: 'other', sessionId: 'remote1', payload: { type: 'offer' } } }));
  const incoming = mockPeers[2];
  expect(incoming.tracks).toHaveLength(0);
  const remote = new Stream([track('video'), track('audio')]);
  await act(async () => incoming.fire('stream', remote));
  await click('Parar compartilhamento');
  expect(incoming.destroyed).toBe(false);
  expect([...container.querySelectorAll('video')].some(v => v.srcObject?.getVideoTracks().includes(remote.getVideoTracks()[0]))).toBe(true);
});
test('fresh offer replaces old screen and ignores stale candidates', async () => {
  const signal = (sessionId, payload) => mockHandlers['call:signal']({ channelId: 'room', senderId: 'other',
    signal: { _discordoviskMedia: 'screen', screenOwner: 'other', sessionId, payload } });
  await act(async () => signal('old', { type: 'offer' }));
  const old = mockPeers[1];
  await act(async () => signal('new', { type: 'offer' }));
  expect(old.destroyed).toBe(true);
  const current = mockPeers[2];
  await act(async () => signal('old', { candidate: {} }));
  expect(current.signal).toHaveBeenCalledTimes(1);
});
test('screen audio failure preserves captured video and displays warning', async () => {
  capture = new Stream([track('video')]);
  window.electronAPI = { getScreenSources: async () => [{ id: 'window:1:0', name: 'Game' }],
    selectScreenSource: async () => ({ processId: 1 }), startScreenAudioCapture: async () => { throw new Error('audio indisponível'); },
    stopScreenAudioCapture: async () => {} };
  await click('Compartilhar tela');
  await click('Game');
  expect(container.textContent).toContain('imagem será transmitida sem áudio');
  expect(mockPeers[1].tracks[0].track.kind).toBe('video');
});
test('noise control reuses live microphone preserving mute and saves preference', async () => {
  await click('Mutar microfone');
  const old = mockPeers[0].tracks[0].track;
  expect(old.enabled).toBe(false);
  await click('Configurações de áudio');
  await act(async () => document.querySelector('input[type=checkbox]').click());
  expect(old.applyConstraints).toHaveBeenCalledWith({ noiseSuppression: false, echoCancellation: true, autoGainControl: true });
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  expect(mockPeers[0].replaceTrack).not.toHaveBeenCalled();
  expect(old.enabled).toBe(false);
  expect(old.stop).not.toHaveBeenCalled();
  expect(readAudioSettings().noiseSuppression).toBe(false);
});
test('microphone failure leaves existing voice alive and preference unchanged', async () => {
  const old = mockPeers[0].tracks[0].track;
  old.applyConstraints.mockRejectedValueOnce(new Error('microfone desconectado'));
  await click('Configurações de áudio');
  await act(async () => document.querySelector('input[type=checkbox]').click());
  expect(old.stop).not.toHaveBeenCalled();
  expect(mockPeers[0].replaceTrack).not.toHaveBeenCalled();
  expect(readAudioSettings().noiseSuppression).toBe(true);
  expect(document.body.textContent).toContain('microfone desconectado');
});
test('suppression defaults on and microphone selection uses exact device', () => {
  expect(readAudioSettings().noiseSuppression).toBe(true);
  expect(microphoneConstraints({ input: 'mic2', noiseSuppression: false })).toEqual({
    deviceId: { exact: 'mic2' }, noiseSuppression: false, echoCancellation: true, autoGainControl: true });
});
test('output uses chosen sink and reports unavailable device', async () => {
  const element = { setSinkId: jest.fn(async () => {}) };
  await routeAudio(element, 'headphones');
  expect(element.setSinkId).toHaveBeenCalledWith('headphones');
  element.setSinkId.mockRejectedValueOnce(new Error('unplugged'));
  await expect(routeAudio(element, 'gone')).rejects.toThrow('unplugged');
});
test('output switching is serialized and retries AbortError with renderer detached', async () => {
  const originalStream = {};
  const element = { srcObject: originalStream, paused: false, pause: jest.fn(), play: jest.fn(async () => {}),
    setSinkId: jest.fn().mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      .mockImplementation(async () => { expect(element.srcObject).toBeNull(); }) };
  await routeAudio(element, 'headset');
  expect(element.setSinkId).toHaveBeenCalledTimes(2);
  expect(element.srcObject).toBe(originalStream);
  expect(element.play).toHaveBeenCalled();
});
test('new stream and volume wait for output switching to finish', async () => {
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const stream = {};
  const element = { srcObject: null, paused: true, pause: jest.fn(), play: jest.fn(async () => {}),
    setSinkId: jest.fn(async sink => { await pending; element.sinkId = sink; }) };
  const switching = routeAudio(element, 'headset');
  const playing = configurePlayback(element, stream, 0.4, 'headset');
  await Promise.resolve();
  expect(element.srcObject).toBeNull();
  finish();
  await Promise.all([switching, playing]);
  expect(element.setSinkId).toHaveBeenCalledTimes(1);
  expect(element.srcObject).toBe(stream);
  expect(element.volume).toBe(0.4);
});
test('gear opens a lower panel outside the call layout and closes it', async () => {
  expect(container.querySelector('.call-audio-settings')).toBeNull();
  expect(document.querySelector('.call-audio-settings')).toBeNull();
  await click('Configurações de áudio');
  expect(document.querySelector('[role=dialog]')).toBeTruthy();
  expect(container.querySelector('[role=dialog]')).toBeNull();
  await act(async () => document.querySelector('[aria-label="Fechar configurações de áudio"]').click());
  expect(document.querySelector('[role=dialog]')).toBeNull();
});
