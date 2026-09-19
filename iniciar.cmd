@echo off
rem ---------------------------------------------------------------
rem  TotoFIEGSI - abre a aplicacao e o acesso publico
rem  Basta fazer duplo clique neste ficheiro.
rem  Fechar qualquer uma das janelas termina esse processo.
rem ---------------------------------------------------------------
setlocal
cd /d "%~dp0"

set "CF=C:\Program Files (x86)\cloudflared\cloudflared.exe"

echo A iniciar o servidor em http://localhost:3000 ...
start "TotoFIEGSI - servidor" cmd /k node server.js

timeout /t 3 /nobreak >nul

if not exist "%CF%" (
  echo.
  echo AVISO: cloudflared nao encontrado em "%CF%"
  echo Instala com: winget install --id Cloudflare.cloudflared
  echo A aplicacao fica na mesma disponivel em http://localhost:3000
  echo.
  pause
  exit /b 1
)

echo A abrir o acesso publico ^(o endereco aparece na janela do tunel^) ...
start "TotoFIEGSI - tunel" cmd /k ""%CF%" tunnel --url http://localhost:3000"

echo.
echo Pronto. O endereco https://....trycloudflare.com aparece na janela "TotoFIEGSI - tunel".
echo Lembra-te: esse endereco muda sempre que reinicias o tunel.
echo.
timeout /t 6 /nobreak >nul
