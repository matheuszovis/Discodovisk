// Integration check: render the actual component and route silent synthetic audio.
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1100, height: 760,
    webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false } });
  const timer = setTimeout(() => { console.error('Audio settings check timed out'); app.exit(1); }, 30000);
  try {
    await win.loadFile(path.join(__dirname, 'audio-settings-fixture.html'));
    const code = babel.transformFileSync(path.join(__dirname, '../src/components/CallAudioSettings.js'), {
      presets: [require.resolve('@babel/preset-env'), require.resolve('@babel/preset-react')]
    }).code;
    const css = fs.readFileSync(path.join(__dirname, '../src/components/VideoCall.css'), 'utf8');
    const result = await win.webContents.executeJavaScript(`(async () => {
      const localRequire = require('module').createRequire(${JSON.stringify(path.join(__dirname, '../package.json'))});
      const component = { exports: {} };
      (function(require, module, exports) { ${code} })(localRequire, component, component.exports);
      const { default: Settings, routeAudio, configurePlayback } = component.exports;
      const React = localRequire('react');
      const { createRoot } = localRequire('react-dom/client');
      const style = document.createElement('style'); style.textContent = ${JSON.stringify(css)};
      document.head.appendChild(style);
      document.body.style.cssText = 'margin:0;background:#36393f;color:white;font-family:Arial';
      document.body.innerHTML = '<div style="width:72px;height:100vh;background:#202225"></div><button style="position:fixed;left:14px;bottom:8px;width:44px;height:44px;background:#2f3136;color:white;border:0;border-radius:50%">↻</button><div id="root"></div>';
      let changeCount = 0;
      createRoot(document.getElementById('root')).render(React.createElement(Settings, {
        settings: { input: '', output: '', noiseSuppression: true }, onChange: async () => { changeCount++; }, inCall: false
      }));
      await new Promise(resolve => setTimeout(resolve, 150));
      const gear = document.querySelector('.audio-settings-gear'); gear.click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const panel = document.querySelector('[role=dialog]');
      if (!panel || gear.getBoundingClientRect().bottom !== innerHeight - 62) throw new Error('Incorrect gear position');
      const context = new AudioContext();
      const destination = context.createMediaStreamDestination();
      const audio = document.createElement('audio'); document.body.appendChild(audio);
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audiooutput' && d.deviceId);
      const outputs = [...new Set(['', ...devices.map(d => d.deviceId)])];
      const results = [];
      for (const output of outputs) {
        try {
          await configurePlayback(audio, destination.stream, 0, output);
          await routeAudio(audio, '');
          results.push({ output: output ? 'device' : 'default', ok: true });
        } catch (error) { results.push({ output: output ? 'device' : 'default', ok: false, error: error.name }); }
      }
      audio.pause(); audio.srcObject = null; audio.remove();
      destination.stream.getTracks().forEach(track => track.stop()); await context.close();
      return { panelRendered: true, outputs: results };
    })()`);
    const screenshot = await win.webContents.capturePage();
    fs.writeFileSync(path.join(__dirname, '../audio-settings-check.png'), screenshot.toPNG());
    console.log(JSON.stringify(result));
    clearTimeout(timer);
    app.exit(result.outputs.every(output => output.ok) ? 0 : 1);
  } catch (error) { console.error(error); clearTimeout(timer); app.exit(1); }
});
