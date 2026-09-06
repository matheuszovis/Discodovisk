const path = require('path');
const { rcedit } = require('rcedit');

const executable = path.resolve(__dirname, '..', 'dist', 'win-unpacked', 'Discordovisk.exe');
const icon = path.resolve(__dirname, '..', 'build', 'ico.ico');

rcedit(executable, { icon })
  .then(() => console.log(`Icon applied: ${executable}`))
  .catch((error) => {
    console.error('Could not apply Windows icon:', error);
    process.exitCode = 1;
  });
