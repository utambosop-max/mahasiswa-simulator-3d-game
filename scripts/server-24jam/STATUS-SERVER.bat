@echo off
chcp 65001 >nul
title Status Server - Mahasiswa Simulator 3D
cd /d "%~dp0"
echo.
echo  ===== STATUS SERVER =====
schtasks /query /tn "MahasiswaSimulatorServer" >nul 2>&1
if errorlevel 1 (echo  Tugas otomatis 24 jam : BELUM dipasang ^(klik PASANG-SERVER-24JAM.bat^)) else (echo  Tugas otomatis 24 jam : TERPASANG)
powershell -NoProfile -Command "try { $r = Invoke-RestMethod http://localhost:8787/sehat -TimeoutSec 3; ' Server                : JALAN (' + $r.online + ' pemain online, menyala ' + $r.nyalaMenit + ' menit)' } catch { ' Server                : MATI / sedang menyala ulang' }"
echo.
if exist link-online.txt (
  echo  Link online untuk teman:
  type link-online.txt
) else (
  echo  Link online belum ada ^(tunggu 1-2 menit setelah PC menyala^).
)
if exist kode.txt (
  set /p K=<kode.txt
  call echo  Kode rahasia          : %%K%%
)
echo.
echo  ===== 15 baris log terakhir =====
if exist log-server.txt powershell -NoProfile -Command "Get-Content log-server.txt -Tail 15 -Encoding UTF8"
echo.
pause
