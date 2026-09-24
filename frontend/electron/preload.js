const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: () => ipcRenderer.invoke('screen-sources:list'),
  selectScreenSource: (sourceId) => ipcRenderer.invoke('screen-source:select', sourceId),
  startScreenAudioCapture: (processId) => ipcRenderer.invoke('screen-audio:start', processId),
  stopScreenAudioCapture: () => ipcRenderer.invoke('screen-audio:stop'),
  onUpdateAvailable: (callback) => {
    const listener = (event, update) => callback(update);
    ipcRenderer.on('updater:available', listener);
    return () => ipcRenderer.removeListener('updater:available', listener);
  },
  onScreenAudioChunk: (callback) => {
    const listener = (event, chunk) => callback(chunk);
    ipcRenderer.on('screen-audio:chunk', listener);
    return () => ipcRenderer.removeListener('screen-audio:chunk', listener);
  },
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  onUpdateDownloadProgress: (callback) => {
    const listener = (event, progress) => callback(progress);
    ipcRenderer.on('updater:download-progress', listener);
    return () => ipcRenderer.removeListener('updater:download-progress', listener);
  },
  onUpdateError: (callback) => {
    const listener = (event, error) => callback(error);
    ipcRenderer.on('updater:error', listener);
    return () => ipcRenderer.removeListener('updater:error', listener);
  }
});
