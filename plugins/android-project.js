// Config plugin com os ajustes do projeto Android. A pasta android/ é gerada pelo Expo,
// então eles são aplicados aqui e não à mão:
// - o build de release é assinado com o keystore descrito em android/keystore.properties
//   (sem esse arquivo, o release usa a chave de debug);
// - versionCode e versionName são lidos do app.json a cada build, para valer o que o
//   script scripts/update-android-version.js gravou;
// - as linhas de android.local.properties (opcional, não versionado, na raiz) são copiadas
//   para android/local.properties, por exemplo o cmake.dir necessário no Windows.

const fs = require('fs')
const path = require('path')
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins')

const MARKER = '// android-project plugin'

const HEADER = `${MARKER}
def appJsonExpo = new groovy.json.JsonSlurper().parse(new File(rootDir, "../app.json")).expo
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
def releaseStoreFile = keystoreProperties['MYAPP_UPLOAD_STORE_FILE']
def releaseStorePassword = keystoreProperties['MYAPP_UPLOAD_STORE_PASSWORD']
def releaseKeyAlias = keystoreProperties['MYAPP_UPLOAD_KEY_ALIAS']
def releaseKeyPassword = keystoreProperties['MYAPP_UPLOAD_KEY_PASSWORD']
def hasReleaseKeystore = [releaseStoreFile, releaseStorePassword, releaseKeyAlias, releaseKeyPassword].every { it }

`

const RELEASE_SIGNING = `signingConfigs {
        release {
            if (hasReleaseKeystore) {
                storeFile rootProject.file(releaseStoreFile)
                storePassword releaseStorePassword
                keyAlias releaseKeyAlias
                keyPassword releaseKeyPassword
            }
        }`

const KEYSTORE_EXAMPLE = `# Copie para keystore.properties (não versionado) e preencha.
# O caminho do keystore é relativo à pasta android/.
MYAPP_UPLOAD_STORE_FILE=app/upload-keystore.jks
MYAPP_UPLOAD_STORE_PASSWORD=
MYAPP_UPLOAD_KEY_ALIAS=upload
MYAPP_UPLOAD_KEY_PASSWORD=
`

function replaceOnce(source, search, replacement) {
  const found = typeof search === 'string' ? source.includes(search) : search.test(source)
  if (!found) throw new Error(`android-project: trecho não encontrado em app/build.gradle: ${search}`)
  return source.replace(search, replacement)
}

function patchBuildGradle(gradle) {
  if (gradle.includes(MARKER)) return gradle

  gradle = replaceOnce(gradle, 'android {', `${HEADER}android {`)
  gradle = replaceOnce(gradle, /versionCode \d+/, 'versionCode appJsonExpo.android.versionCode as Integer')
  gradle = replaceOnce(gradle, /versionName "[^"]*"/, 'versionName appJsonExpo.version as String')
  gradle = replaceOnce(gradle, 'signingConfigs {', RELEASE_SIGNING)

  // O primeiro "signingConfig signingConfigs.debug" depois de "release {" em buildTypes é o do release.
  const releaseType = gradle.indexOf('release {', gradle.indexOf('buildTypes {'))
  return (
    gradle.slice(0, releaseType) +
    replaceOnce(
      gradle.slice(releaseType),
      'signingConfig signingConfigs.debug',
      'signingConfig hasReleaseKeystore ? signingConfigs.release : signingConfigs.debug'
    )
  )
}

function copyLocalProperties(projectRoot, androidDir) {
  const source = path.join(projectRoot, 'android.local.properties')
  if (!fs.existsSync(source)) return

  const target = path.join(androidDir, 'local.properties')
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : ''
  const missing = fs
    .readFileSync(source, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !current.includes(line))
  if (missing.length) {
    fs.writeFileSync(target, [current.trimEnd(), ...missing].filter(Boolean).join('\n') + '\n')
  }
}

module.exports = function withAndroidProject(config) {
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents)
    return cfg
  })

  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidDir = cfg.modRequest.platformProjectRoot
      fs.writeFileSync(path.join(androidDir, 'keystore.properties.example'), KEYSTORE_EXAMPLE)
      copyLocalProperties(cfg.modRequest.projectRoot, androidDir)
      return cfg
    },
  ])
}
