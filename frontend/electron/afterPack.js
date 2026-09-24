const fs = require('fs');
const path = require('path');

/**
 * Garante que instaladores criados localmente também tenham configuração do
 * electron-updater. Sem este arquivo, versões antigas não conseguem iniciar
 * a busca por uma release no GitHub.
 */
exports.default = async (context) => {
  if (context.electronPlatformName !== 'win32') return;

  const updateConfig = [
    'provider: github',
    'owner: matheuszovis',
    'repo: Discodovisk',
    'releaseType: release',
    'updaterCacheDirName: discordovisk-frontend-updater',
    ''
  ].join('\n');

  const resourcesDir = path.join(context.appOutDir, 'resources');
  await fs.promises.mkdir(resourcesDir, { recursive: true });
  await fs.promises.writeFile(path.join(resourcesDir, 'app-update.yml'), updateConfig, 'utf8');
};
