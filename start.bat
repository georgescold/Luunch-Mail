@echo off
chcp 65001 >nul
title Luunch Mail
cd /d "%~dp0"

echo ============================================================
echo   LUUNCH MAIL  -  demarrage (build + serveur de production)
echo ============================================================
echo.

REM --- [0/4] Arreter toute instance deja en cours -----------------------
REM (libere le port 3000 et les fichiers verrouilles par Node : sans ca,
REM  "prisma generate" echoue avec EPERM sous Windows)
echo [0/4] Arret d'une eventuelle instance en cours...
powershell -NoProfile -Command "3000,3050 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }" >nul 2>&1
timeout /t 1 /nobreak >nul

REM --- Verifier pnpm (activation via corepack si besoin) ----------------
where pnpm >nul 2>&1 || (call corepack enable >nul 2>&1 & call corepack prepare pnpm@latest --activate >nul 2>&1)
where pnpm >nul 2>&1 || (echo. & echo [ERREUR] pnpm introuvable. Installez-le avec :  npm install -g pnpm & echo. & pause & exit /b 1)

REM --- [1/4] Dependances (premier lancement uniquement) -----------------
if not exist "node_modules" (echo [1/4] Installation des dependances... & call pnpm install) else (echo [1/4] Dependances : OK)

REM --- [2/4] Base de donnees + donnees de demo (premier lancement) ------
if not exist "prisma\dev.db" (echo [2/4] Initialisation de la base + donnees de demo... & call pnpm setup) else (echo [2/4] Base de donnees : OK)

REM --- [3/4] Build de production (avec une 2e tentative anti-verrou) ----
echo [3/4] Build de production...
call pnpm build
if errorlevel 1 (
  echo        Echec - nouvelle tentative dans 3 s ^(fichier encore verrouille^)...
  timeout /t 3 /nobreak >nul
  call pnpm build
  if errorlevel 1 (
    echo.
    echo [ERREUR] Le build a echoue. Fermez toutes les fenetres Node/Luunch Mail
    echo          ouvertes puis relancez ce fichier.
    echo.
    pause
    exit /b 1
  )
)

REM --- [4/4] Demarrage --------------------------------------------------
echo [4/4] Serveur pret sur http://localhost:3000
echo.
echo     Connexion demo :  demo@gigamail.io  /  demodemo
echo     (Ctrl+C ou fermez cette fenetre pour arreter)
echo.
start "" /min cmd /c "ping -n 6 127.0.0.1 >nul & explorer http://localhost:3000"
call pnpm start
