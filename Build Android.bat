@echo off
setlocal

echo ==========================================
echo Build Android para Play Store
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH.
  exit /b 1
)

where keytool >nul 2>nul
if errorlevel 1 (
  echo ERRO: keytool nao encontrado no PATH.
  echo Instale um JDK completo para gerar e usar um keystore de release.
  exit /b 1
)

if "%NODE_ENV%"=="" (
  set "NODE_ENV=production"
)

rem Versao vem do app.json (versionado no git); o build.gradle le de la.
rem Incrementa ANTES do prebuild para que um projeto regenerado ja nasca com a versao nova.
echo Atualizando versao (app.json)...
call node "%~dp0scripts\update-android-version.js"
if errorlevel 1 (
  echo.
  echo Falha ao atualizar versoes Android.
  exit /b 1
)
echo.

if not exist "%~dp0android\gradlew.bat" (
  echo Pasta Android nao encontrada. Gerando projeto nativo com Expo prebuild...
  call npx expo prebuild --platform android
  if errorlevel 1 (
    echo.
    echo Falha ao gerar a pasta Android.
    exit /b 1
  )
)

set "KEYSTORE_PROPS=%~dp0android\keystore.properties"
set "KEYSTORE_EXAMPLE=%~dp0android\keystore.properties.example"

if not exist "%KEYSTORE_PROPS%" (
  echo.
  echo ERRO: configuracao de assinatura nao encontrada.
  echo Crie o arquivo: %KEYSTORE_PROPS%
  if exist "%KEYSTORE_EXAMPLE%" (
    echo Use o arquivo de exemplo em: %KEYSTORE_EXAMPLE%
  )
  echo.
  echo O build de Play Store exige um keystore de release proprio.
  exit /b 1
)

echo.
echo Iniciando build Android para Play Store...
pushd "%~dp0android"
call gradlew.bat bundleRelease
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
popd

if not "%BUILD_EXIT_CODE%"=="0" (
  echo.
  echo Falha ao executar build:android:store.
  exit /b %BUILD_EXIT_CODE%
)

echo.
echo Build concluido com sucesso.

set "AAB_DIR=%~dp0android\app\build\outputs\bundle\release"
if exist "%AAB_DIR%" (
  echo Abrindo pasta do AAB: %AAB_DIR%
  start "" "%AAB_DIR%"
) else (
  echo Pasta do AAB nao encontrada: %AAB_DIR%
)

endlocal