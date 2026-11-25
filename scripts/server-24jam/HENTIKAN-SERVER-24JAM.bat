@echo off
chcp 65001 >nul
title Hentikan Server 24 Jam - Mahasiswa Simulator 3D
cd /d "%~dp0"
net session >nul 2>&1
if errorlevel 1 (
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
echo Menghentikan & menghapus tugas otomatis...
schtasks /end /tn "MahasiswaSimulatorServer" >nul 2>&1
schtasks /delete /tn "MahasiswaSimulatorServer" /f >nul 2>&1
rem Matikan hanya proses server game ini (bukan program Node lain)
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -and $_.CommandLine -like '*server.mjs*') -or ($_.Name -eq 'cloudflared.exe' -and $_.ExecutablePath -like '%~dp0*') -or ($_.Name -eq 'cmd.exe' -and $_.CommandLine -like '*JALAN-TERUS.bat*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"
netsh advfirewall firewall delete rule name="Mahasiswa Simulator Server" >nul 2>&1
echo.
echo Server 24 jam sudah DIMATIKAN & tidak menyala otomatis lagi.
echo Data pemain (data-online.json) dan backup TETAP aman di folder ini.
echo (Pengaturan "PC tidak tidur" tidak diubah; atur lagi di Settings ^> Power jika perlu.)
pause
