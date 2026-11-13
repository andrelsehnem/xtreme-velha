# X-Treme Velha

Jogo da velha para Android em React Native (Expo) e JavaScript, com:
- modo clássico local
- modo X-Treme local (9 tabuleiros)
- multiplayer LAN para 2 jogadores na mesma rede

## Código

Tudo fica em `src/`:

| Arquivo | O que tem |
| --- | --- |
| `App.js` | Menu, configurações e os modos locais (clássico e X-Treme) |
| `components.js` | Componentes compartilhados: `Logo`, `Board`, `GameScreen`, `Button`, `Card`... |
| `engine.js` | Regras do jogo, sem interface |
| `theme.js` | Monta o tema (claro/escuro) a partir da paleta escolhida |
| `palettes.json` | As paletas de cores, usadas pelo app e pelo gerador de ícones |
| `Multiplayer.js` | Tela de criar/entrar numa sala e a partida em rede |
| `lan.js` | Comunicação da partida em rede (TCP, uma mensagem JSON por linha) |
| `lan.web.js` | Substituto de `lan.js` no navegador, onde o multiplayer não existe |

## Requisitos

- Node.js 20+ e pnpm
- Android Studio (SDK, e CMake 3.31+ no Windows)
- JDK 21

## Rodar

```bash
pnpm install
pnpm dev
```

O `pnpm dev` abre o menu do Expo no terminal. Nele, a tecla `w` abre o jogo no navegador e a tecla `a` abre no Android.

Para o Android é preciso ter o app instalado no celular ou emulador. Na primeira vez, e sempre que mudar uma dependência nativa, rode:

```bash
pnpm android
```

Isso gera a pasta `android/`, compila e instala o app. O app usa sockets TCP nativos, então não roda no Expo Go.

No navegador, os modos locais funcionam, mas o multiplayer LAN não (o navegador não abre sockets TCP).

Outros comandos: `pnpm web` (abre direto no navegador), `pnpm lint` e `pnpm build` (exporta a versão web para `dist/`).

## Ícones e splash

Os ícones (app, Android adaptativo, favicon, PWA) e as imagens da splash são desenhados por um script, com as cores de uma das paletas de `src/palettes.json`:

```bash
pnpm assets          # paleta padrão (brasa)
pnpm assets lousa    # ou neon
```

O script grava em `assets/` e `public/` e mostra as cores de fundo para conferir em `app.json`, `public/manifest.json` e `public/index.html`. Para o Android receber os novos ícones e a splash, rode depois:

```bash
npx expo prebuild --platform android
```

Não use `--clean`: ele apaga a pasta `android/` inteira, com o `keystore.properties`.

Na web, `public/index.html` mostra o símbolo enquanto o app carrega e `public/manifest.json` permite instalar o jogo como PWA.

## Publicar na Play Store

```bash
pnpm playStore
```

Esse comando roda o `Build Android.bat`: aumenta a versão no `app.json`, gera a pasta `android/` se ela não existir e compila o AAB assinado.

Antes da primeira vez, copie `android/keystore.properties.example` para `android/keystore.properties` e preencha com os dados do seu keystore de upload. Nenhum dos dois arquivos de keystore vai para o git.

Comandos separados: `pnpm android:version:bump` (só aumenta a versão) e `pnpm build:android:store` (só compila o AAB).

### Windows: erro "Filename longer than 260 characters"

1. Ative caminhos longos no Windows (`LongPathsEnabled`) e reinicie.
2. Instale o CMake 3.31 ou mais novo pelo SDK Manager.
3. Aponte o build para ele em `android/local.properties`:

```
cmake.dir=D:/Android/cmake/3.31.6
```

Para não perder essa linha quando o Expo recriar a pasta `android/`, grave-a também num arquivo `android.local.properties` na raiz do projeto. O plugin `plugins/android-project.js` copia o conteúdo dele a cada `expo prebuild`.

## Multiplayer LAN

1. Os dois celulares na mesma rede Wi-Fi.
2. Um toca em **Criar sala LAN (host)** e passa o IP e a porta que aparecem na tela.
3. O outro digita esse IP e essa porta em **Entrar em uma sala** e toca em **Entrar na sala**.

O host joga com X e valida todas as jogadas.
