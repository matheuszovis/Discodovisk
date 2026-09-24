@echo off
setlocal
cd /d "%~dp0"

echo ========================================
echo Discordovisk - Publicar Release
echo ========================================
echo.

if "%GH_TOKEN%"=="" (
  set /p "GH_TOKEN=Cole o GitHub Token e pressione Enter: "
)

if "%GH_TOKEN%"=="" (
  echo.
  echo ERRO: nenhum GH_TOKEN foi informado.
  pause
  exit /b 1
)

echo Validando o token no GitHub...
curl.exe --fail --silent --output nul -H "Authorization: Bearer %GH_TOKEN%" "https://api.github.com/repos/matheuszovis/Discodovisk/releases"
if errorlevel 1 (
  echo.
  echo ERRO: token do GitHub invalido, expirado ou sem permissao de Conteudos para o repositorio Discodovisk.
  echo Crie um novo token e execute este arquivo novamente.
  pause
  exit /b 1
)

echo.
echo Publicando a versao definida no package.json...
call npm.cmd run release

if errorlevel 1 (
  echo.
  echo ERRO: a publicacao falhou.
  pause
  exit /b 1
)

echo.
echo Release publicada com sucesso.
pause
endlocal
