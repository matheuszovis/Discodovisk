// Real Electron/WebRTC smoke test with synthetic media: no microphone or screen access.
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: {
    nodeIntegration: true, contextIsolation: false, backgroundThrottling: false
  } });
  const timer = setTimeout(() => { console.error('WebRTC validation timed out'); app.exit(1); }, 45000);
  try {
    await window.loadURL('about:blank');
    const result = await window.webContents.executeJavaScript(`(async () => {
      const Peer = require(${JSON.stringify(path.resolve(__dirname, '../node_modules/simple-peer'))});
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      const tone = context.createOscillator();
      tone.connect(destination); tone.start(); await context.resume();
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      const painter = canvas.getContext('2d');
      const repaint = setInterval(() => {
        painter.fillStyle = Date.now() % 2 ? 'blue' : 'green';
        painter.fillRect(0, 0, 320, 180);
      }, 30);
      const screen = canvas.captureStream(15);
      screen.addTrack(destination.stream.getAudioTracks()[0]);
      async function connect() {
        const sender = new Peer({ initiator: true, trickle: true, config: { iceServers: [] } });
        const receiver = new Peer({ initiator: false, trickle: true, config: { iceServers: [] } });
        sender.on('signal', signal => { if (!receiver.destroyed) receiver.signal(signal); });
        receiver.on('signal', signal => { if (!sender.destroyed) sender.signal(signal); });
        const received = new Promise((resolve, reject) => {
          receiver.on('stream', resolve); sender.on('error', reject); receiver.on('error', reject);
        });
        screen.getTracks().forEach(track => sender.addTrack(track, screen));
        const stream = await received;
        if (stream.getVideoTracks().length !== 1 || stream.getAudioTracks().length !== 1) throw new Error('Missing media tracks');
        const video = document.createElement('video'); video.muted = true; video.srcObject = stream;
        document.body.appendChild(video); await video.play();
        await new Promise(resolve => video.requestVideoFrameCallback(resolve));
        const stats = await receiver._pc.getStats();
        const inbound = [...stats.values()].find(stat => stat.type === 'inbound-rtp' && stat.kind === 'video');
        if (!(inbound?.framesDecoded > 0)) throw new Error('No decoded video frames');
        sender.destroy(); receiver.destroy(); video.remove();
        if (screen.getVideoTracks()[0].readyState !== 'live') throw new Error('Viewer disconnect stopped source');
        return inbound.framesDecoded;
      }
      const decodedFrames = [];
      for (let attempt = 0; attempt < 3; attempt++) decodedFrames.push(await connect());
      clearInterval(repaint); screen.getTracks().forEach(track => track.stop());
      tone.stop(); await context.close();
      return { reconnects: 3, decodedFrames, audioTracksPerConnection: 1 };
    })()`);
    console.log(JSON.stringify(result));
    clearTimeout(timer);
    app.exit(0);
  } catch (error) {
    console.error(error);
    clearTimeout(timer);
    app.exit(1);
  }
});
