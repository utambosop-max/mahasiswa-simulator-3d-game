@echo off
chcp 65001 >nul
title Pasang Server 24 Jam - Mahasiswa Simulator 3D
cd /d "%~dp0"

rem ===== Butuh izin Administrator (untuk tugas otomatis, firewall, pengaturan daya) =====
net session >nul 2>&1
if errorlevel 1 (
  echo Meminta izin Administrator... klik "Yes" di jendela yang muncul.
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo  ==========================================================
echo   PASANG SERVER 24 JAM - Mahasiswa Simulator 3D
echo   Folder server: %~dp0
echo   (Jangan pindahkan folder ini setelah dipasang!)
echo  ==========================================================
echo.

rem ===== 1. Node.js =====
echo [1/6] Cek Node.js...
set "NODE_OK="
where node >nul 2>nul && set "NODE_OK=1"
if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_OK=1"
if defined NODE_OK goto nodeada
echo       Node.js belum ada. Memasang lewat winget (setujui jika ditanya)...
winget install -e --id OpenJS.NodeJS.LTS --scope machine
if exist "%ProgramFiles%\nodejs\node.exe" goto nodeada
echo.
echo  [!] Node.js gagal dipasang otomatis.
echo      Download versi LTS di https://nodejs.org, pasang, lalu klik file ini lagi.
pause
exit /b 1
:nodeada
echo       OK

rem ===== 2. Kode rahasia =====
echo [2/6] Kode rahasia server...
if exist kode.txt goto kodeada
echo       Buat KODE RAHASIA untuk teman-temanmu (huruf/angka, minimal 6 karakter).
:tanya
set "KODE_SERVER="
set /p KODE_SERVER=       Kode rahasia:
if "%KODE_SERVER:~5,1%"=="" (echo        Minimal 6 karakter ya! & goto tanya)
>kode.txt echo %KODE_SERVER%
:kodeada
set /p KODE_SERVER=<kode.txt
echo       OK (tersimpan di kode.txt)

rem ===== 3. PC tidak boleh tidur saat dicolok listrik =====
echo [3/6] Mencegah PC tidur / hibernasi saat dicolok listrik...
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
echo       OK

rem ===== 4. Firewall: hanya jaringan rumah (Private) untuk main satu WiFi =====
echo [4/6] Izin firewall port 8787 (hanya jaringan Private)...
netsh advfirewall firewall delete rule name="Mahasiswa Simulator Server" >nul 2>&1
netsh advfirewall firewall add rule name="Mahasiswa Simulator Server" dir=in action=allow protocol=TCP localport=8787 profile=private >nul
echo       OK

rem ===== 5. Tugas otomatis: jalan saat PC menyala (tanpa perlu login) =====
echo [5/6] Membuat tugas otomatis "MahasiswaSimulatorServer"...
schtasks /end /tn "MahasiswaSimulatorServer" >nul 2>&1
schtasks /create /tn "MahasiswaSimulatorServer" /tr "\"%~dp0JALAN-TERUS.bat\"" /sc onstart /ru SYSTEM /rl highest /f >nul
if errorlevel 1 (
  echo  [!] Gagal membuat tugas otomatis.
  pause
  exit /b 1
)
echo       OK

rem ===== 6. Nyalakan sekarang =====
echo [6/6] Menyalakan server sekarang...
schtasks /run /tn "MahasiswaSimulatorServer" >nul
echo       Menunggu link online (maks 90 detik)...
for /l %%i in (1,1,45) do (
  if exist link-online.txt goto selesai
  timeout /t 2 /nobreak >nul
)
:selesai
echo.
echo  ==========================================================
if exist link-online.txt (
  echo   SERVER 24 JAM AKTIF!
  echo   Link online untuk teman :
  type link-online.txt
  echo   Kode rahasia            : %KODE_SERVER%
) else (
  echo   Server sedang menyala tapi link belum muncul.
  echo   Tunggu 1-2 menit lalu klik STATUS-SERVER.bat
)
echo.
echo   - Server otomatis menyala setiap PC dihidupkan.
echo   - Cek link / status kapan saja: STATUS-SERVER.bat
echo   - Matikan permanen: HENTIKAN-SERVER-24JAM.bat
echo  ==========================================================
pause
