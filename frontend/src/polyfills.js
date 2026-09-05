const browserProcess = window.process || {};

window.process = {
  ...browserProcess,
  env: browserProcess.env || {},
  nextTick: browserProcess.nextTick
    || ((callback, ...args) => window.setTimeout(() => callback(...args), 0))
};