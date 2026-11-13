/**
 * Incrementa a versão do app.
 *
 * Fonte da verdade (versionada no git): app.json
 *   - expo.version              -> versionName (x.y.z)
 *   - expo.android.versionCode  -> versionCode (inteiro)
 * O android/app/build.gradle lê esses valores do app.json no build.
 * O package.json é mantido em sincronia com expo.version.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const appJsonPath = path.join(rootDir, 'app.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJson = (filePath, content) => {
  fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
};

const incrementPatchVersion = (versionName) => {
  const parts = String(versionName).trim().split('.');

  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    throw new Error('Versao invalida em app.json (expo.version). Use o formato x.y.z');
  }

  const [major, minor, patch] = parts.map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

const run = () => {
  const appJson = readJson(appJsonPath);
  const packageJson = readJson(packageJsonPath);
  const expo = appJson.expo ?? {};
  const currentVersionCode = Number(expo.android?.versionCode);

  if (!Number.isInteger(currentVersionCode) || currentVersionCode < 1) {
    throw new Error('expo.android.versionCode ausente ou invalido em app.json');
  }

  const nextVersionCode = currentVersionCode + 1;
  const currentVersionName = expo.version;
  const nextVersionName = incrementPatchVersion(currentVersionName);

  expo.version = nextVersionName;
  expo.android.versionCode = nextVersionCode;
  appJson.expo = expo;
  writeJson(appJsonPath, appJson);

  packageJson.version = nextVersionName;
  writeJson(packageJsonPath, packageJson);

  console.log(`versionName: ${currentVersionName} -> ${nextVersionName}`);
  console.log(`versionCode: ${currentVersionCode} -> ${nextVersionCode}`);
};

try {
  run();
} catch (error) {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
}
