const { app, BrowserWindow, shell, desktopCapturer, ipcMain, session, dialog } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const loopback = require('loopback-capture');
const packageInfo = require('../package.json');
let selectedScreenSourceId = null;
let mainWindow = null;
let selectedScreenProcessId = null;
let processAudioCapture = null;
let updateDownloadPromise = null;

const getWindowProcessId = (sourceId) => new Promise((resolve, reject) => {
  // Fontes de janela do Electron usam o formato "window:<HWND>:<índice>".
  const match = /^window:(\d+):\d+$/.exec(sourceId || '');
  if (!match) {
    resolve(null);
    return;
  }

  const script = [
    'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public static class DiscordoviskWindow { [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); }\';',
    '$processId = [uint32]0;',
    '[DiscordoviskWindow]::GetWindowThreadProcessId([IntPtr]::new([Int64]::Parse($args[0])), [ref]$processId) | Out-Null;',
    'Write-Output $processId'
  ].join(' ');

  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script, match[1]], {
    windowsHide: true,
    timeout: 5000
  }, (error, stdout) => {
    if (error) {
      reject(error);
      return;
    }
    const processId = Number.parseInt(stdout.trim(), 10);
    resolve(Number.isSafeInteger(processId) && processId > 0 ? processId : null);
  });
});

const stopProcessAudioCapture = () => {
  if (!processAudioCapture) return;
  try {
    processAudioCapture.stop();
  } catch (error) {
    console.warn('Erro ao encerrar a captura de áudio do aplicativo:', error);
  }
  processAudioCapture = null;
};

// O download é iniciado explicitamente depois que a atualização é encontrada.
// Assim, duas verificações simultâneas não deixam a interface presa em "Baixando".
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
// Pacotes montados manualmente podem ter blockmaps inconsistentes; evita downloads diferenciais que travam sem erro visível.
autoUpdater.disableDifferentialDownload = true;

const configureUpdaterFeed = () => {
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'matheuszovis',
    repo: 'Discodovisk',
    releaseType: 'release'
  });
};

const startUpdateDownload = (info) => {
  if (updateDownloadPromise) return updateDownloadPromise;

  mainWindow?.webContents.send('updater:available', { version: info.version });
  updateDownloadPromise = autoUpdater.downloadUpdate()
    .catch((error) => {
      console.error('Erro ao baixar a atualização do Discordovisk:', error);
      mainWindow?.webContents.send('updater:error', {
        message: error.message || 'Falha ao baixar a atualização.'
      });
      throw error;
    })
    .finally(() => {
      updateDownloadPromise = null;
    });

  return updateDownloadPromise;
};

const setupAutoUpdater = () => {
  configureUpdaterFeed();
  autoUpdater.on('update-available', (info) => {
    startUpdateDownload(info).catch(() => {});
  });
  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updater:download-progress', {
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total
    });
  });
  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Atualização disponível',
      message: `Uma nova versão do Discordovisk (${info.version}) foi baixada.`,
      detail: 'Reinicie agora para aplicar a atualização.',
      buttons: ['Reiniciar agora', 'Depois'],
      defaultId: 0,
      cancelId: 1
    });

    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on('error', (error) => {
    console.error('Erro ao atualizar o Discordovisk:', error);
    mainWindow?.webContents.send('updater:error', {
      message: error.message || 'Falha ao baixar a atualização.'
    });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('Erro ao verificar atualizações:', error);
  });
};

ipcMain.handle('updater:check', async () => {
  if (!app.isPackaged) {
    return { status: 'development' };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.updateInfo || result.updateInfo.version === packageInfo.version) {
      return { status: 'not-available', version: packageInfo.version };
    }

    startUpdateDownload(result.updateInfo).catch(() => {});
    return { status: 'downloading', version: result.updateInfo.version };
  } catch (error) {
    console.error('Erro ao verificar atualização manualmente:', error);
    if (error.code === 'ENOENT' || error.message?.includes('app-update.yml')) {
      return {
        status: 'not-available',
        version: packageInfo.version
      };
    }
    return { status: 'error', message: error.message || 'Não foi possível verificar atualizações.' };
  }
});

ipcMain.handle('screen-sources:list', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 240, height: 135 },
    fetchWindowIcons: true
  });

  return sources.map((source) => ({
    id: source.id,
    name: source.name,
    thumbnail: source.thumbnail.toDataURL(),
    isWindow: source.id.startsWith('window:')
  }));
});

ipcMain.handle('screen-source:select', async (event, sourceId) => {
  selectedScreenSourceId = sourceId;
  selectedScreenProcessId = null;

  if (process.platform !== 'win32') return { processId: null };

  try {
    selectedScreenProcessId = await getWindowProcessId(sourceId);
  } catch (error) {
    console.warn('Não foi possível identificar o processo da janela selecionada:', error);
  }

  return { processId: selectedScreenProcessId };
});

ipcMain.handle('screen-audio:start', (event, processId) => {
  stopProcessAudioCapture();

  if (process.platform !== 'win32') {
    return { ok: false, message: 'Áudio exclusivo por aplicativo está disponível apenas no Windows.' };
  }
  if (!Number.isSafeInteger(processId) || processId <= 0 || processId !== selectedScreenProcessId) {
    return { ok: false, message: 'A janela selecionada não possui um processo de áudio capturável.' };
  }

  try {
    processAudioCapture = new loopback.LoopbackCapture();
    processAudioCapture.start(processId, true, (chunk) => {
      if (!event.sender.isDestroyed()) event.sender.send('screen-audio:chunk', chunk);
    });
    return { ok: true };
  } catch (error) {
    console.error('Erro ao iniciar a captura de áudio exclusiva:', error);
    stopProcessAudioCapture();
    return { ok: false, message: error.message || 'Não foi possível capturar o áudio dessa janela.' };
  }
});

ipcMain.handle('screen-audio:stop', () => {
  stopProcessAudioCapture();
  return { ok: true };
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    title: `Discordovisk v${packageInfo.version}`,
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#202225',
    icon: path.join(__dirname, '..', 'build', 'ico.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.removeMenu();

  mainWindow.loadFile(path.join(__dirname, '..', 'build', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

app.whenReady().then(() => {
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 240, height: 135 },
        fetchWindowIcons: true
      });
      // Se a janela fechou, peça uma nova seleção; não exponha outra tela.
      const selectedSource = sources.find((source) => source.id === selectedScreenSourceId);
      if (!selectedSource) {
        callback({});
        return;
      }
      callback({
        // "loopbackWithMute" captura o som mas silencia toda a saída da pessoa
        // que está compartilhando. O loopback normal mantém o áudio tocando no
        // computador dela enquanto envia a faixa para a chamada.
        video: selectedSource,
        ...(request.audioRequested ? { audio: 'loopback' } : {})
      });
    } catch (error) {
      console.error('Erro ao autorizar captura de tela:', error);
      callback({});
    }
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'display-capture', 'camera', 'microphone'];
    callback(allowedPermissions.includes(permission));
  });
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'display-capture', 'camera', 'microphone'];
    return allowedPermissions.includes(permission);
  });
  createWindow();
  if (app.isPackaged) setupAutoUpdater();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopProcessAudioCapture();
  if (process.platform !== 'darwin') app.quit();
});
