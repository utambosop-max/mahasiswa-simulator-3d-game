# Membuat folder rilis/server-online berisi server + game, siap disalin ke PC (flashdisk / share folder).
# Dipanggil oleh: npm run server:paket  (build game & server dulu)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$tujuan = Join-Path $root 'rilis\server-online'
$public = Join-Path $tujuan 'public'

New-Item -ItemType Directory -Force $tujuan | Out-Null
# Folder game lama diganti baru (data pemain data-online.json TIDAK dihapus)
if (Test-Path $public) { Remove-Item -Recurse -Force $public }
Copy-Item (Join-Path $root 'dist') $public -Recurse
Copy-Item (Join-Path $root 'dist-server\server.mjs') (Join-Path $tujuan 'server.mjs') -Force

$bat = @'
@echo off
chcp 65001 >nul
title Server Mahasiswa Simulator 3D
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js belum terpasang di PC ini.
  echo      Download versi LTS di https://nodejs.org lalu pasang, kemudian klik file ini lagi.
  echo.
  pause
  exit /b
)
node server.mjs
pause
'@
Set-Content (Join-Path $tujuan 'JALANKAN-SERVER.bat') $bat -Encoding ascii

$online = @'
@echo off
chcp 65001 >nul
title Server ONLINE Mahasiswa Simulator 3D
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [!] Node.js belum terpasang di PC ini.
  echo      Download versi LTS di https://nodejs.org lalu pasang, kemudian klik file ini lagi.
  echo.
  pause
  exit /b
)
if exist kode.txt goto adakode
echo.
echo  ==== Pertama kali: buat KODE RAHASIA untuk teman-temanmu ====
echo  Pakai huruf/angka, minimal 6 karakter, mis. koskita2026
echo  (Orang yang tidak tahu kode ini tidak bisa masuk ke server.)
echo.
:tanya
set "KODE_SERVER="
set /p KODE_SERVER=  Kode rahasia:
if "%KODE_SERVER:~5,1%"=="" (echo   Minimal 6 karakter ya! & goto tanya)
>kode.txt echo %KODE_SERVER%
goto jalan
:adakode
set /p KODE_SERVER=<kode.txt
:jalan
echo.
echo  Kode rahasia tersimpan di kode.txt (hapus file itu untuk ganti kode).
echo.
node server.mjs --online
pause
'@
Set-Content (Join-Path $tujuan 'JALANKAN-ONLINE.bat') $online -Encoding ascii
# Skrip server 24 jam (pasang, penjaga, status, hentikan)
Get-ChildItem (Join-Path $root 'scripts\server-24jam') -Filter *.bat | ForEach-Object {
  $isi = [IO.File]::ReadAllText($_.FullName) -replace "`r?`n", "`r`n"  # .bat wajib CRLF
  [IO.File]::WriteAllText((Join-Path $tujuan $_.Name), $isi, (New-Object Text.UTF8Encoding $false))
}
# cloudflared (± 50 MB) ikut dibawa jika sudah pernah diunduh; kalau belum, server mengunduhnya sendiri
$cf = Join-Path $root 'dist-server\cloudflared.exe'
if (Test-Path $cf) { Copy-Item $cf (Join-Path $tujuan 'cloudflared.exe') -Force }

$baca = @'
SERVER ONLINE - MAHASISWA SIMULATOR 3D
======================================

PERSIAPAN (sekali saja di PC):
1. Pasang Node.js versi LTS: https://nodejs.org
2. Salin folder "server-online" ini ke PC (mis. ke Documents).

A) MAIN LEWAT INTERNET (teman di mana saja)
   1. Klik dua kali JALANKAN-ONLINE.bat
   2. Pertama kali: buat KODE RAHASIA (mis. koskita2026). Kode disimpan di kode.txt.
   3. Tunggu sampai muncul kotak "ONLINE!" berisi link, contoh:
        https://abc-xyz-123.trycloudflare.com
   4. Kirim LINK + KODE ke teman lewat WA.
      - Teman buka link itu di Chrome HP -> Main Bareng -> isi nama & kode.
      - Atau di APK: Main Bareng -> alamat: abc-xyz-123.trycloudflare.com -> kode.
   CATATAN: link BERGANTI setiap server dinyalakan ulang (lihat link-online.txt).
   Pertama kali, program cloudflared (+- 50 MB) diunduh otomatis dari Cloudflare.

C) SERVER 24 JAM (PC jadi server tetap, menyala sendiri)
   1. Taruh folder ini di tempat PERMANEN (mis. D:\server-online). Jangan dipindah lagi.
   2. Klik dua kali PASANG-SERVER-24JAM.bat -> klik "Yes" (izin Administrator).
      Otomatis: pasang Node.js (jika belum), buat kode rahasia, PC tidak tidur,
      izin firewall jaringan rumah, server menyala setiap PC dihidupkan
      (tanpa perlu login), dan nyala ulang sendiri kalau crash / internet putus.
   3. Cek link & status kapan saja: STATUS-SERVER.bat
   4. Matikan permanen: HENTIKAN-SERVER-24JAM.bat
   Log ada di log-server.txt, backup progres harian di folder backup\ (7 hari).

B) MAIN SATU WIFI SAJA
   1. Klik dua kali JALANKAN-SERVER.bat
   2. Jika Windows bertanya soal Firewall -> centang "Private networks" -> Allow.
   3. Buka alamat 192.168.x.x:8787 yang muncul di jendela hitam.

PENTING:
- Jangan tutup jendela hitam selama main (tutup = server mati).
- Jangan sebar kode rahasia ke orang yang tidak dikenal.
- Satu nama = satu HP. Kalau ganti HP, pakai nama baru.
- Progres semua pemain tersimpan di data-online.json. Jangan dihapus
  kalau mau lanjut main besok. Hapus = dunia mulai dari awal.
'@
Set-Content (Join-Path $tujuan 'BACA-SAYA.txt') $baca -Encoding utf8

Write-Host "Paket server siap: $tujuan"
