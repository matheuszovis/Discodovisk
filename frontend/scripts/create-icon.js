const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const source = path.resolve(__dirname, '..', '..', 'ico.png');
const destination = path.resolve(__dirname, '..', 'build', 'ico.ico');

pngToIco(source).then((buffer) => {
  fs.writeFileSync(destination, buffer);
  console.log(`Icon created: ${destination}`);
}).catch((error) => {
  console.error('Could not create Windows icon:', error);
  process.exitCode = 1;
});
