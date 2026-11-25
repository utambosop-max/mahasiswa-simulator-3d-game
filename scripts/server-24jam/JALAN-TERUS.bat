@echo off
rem Penjaga server: dijalankan otomatis oleh Task Scheduler saat PC menyala.
rem Jika server/tunnel mati (crash, internet putus), dinyalakan ulang 10 detik kemudian.
cd /d "%~dp0"
set "NODE=node"
where node >nul 2>nul || set "NODE=%ProgramFiles%\nodejs\node.exe"
set /p KODE_SERVER=<kode.txt

:ulang
rem Log dibatasi ± 5 MB (yang lama disimpan sebagai log-server-lama.txt)
for %%A in (log-server.txt) do if %%~zA GTR 5000000 move /y log-server.txt log-server-lama.txt >nul
echo [%date% %time%] === Server mulai === >> log-server.txt
"%NODE%" server.mjs --online >> log-server.txt 2>&1
echo [%date% %time%] Server berhenti (kode %errorlevel%), mulai ulang 10 detik lagi >> log-server.txt
timeout /t 10 /nobreak >nul
goto ulang
