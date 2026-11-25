@echo off
rem Bangun MsNative.dll (Windows x64) memakai MSVC dari Visual Studio Build Tools.
rem Jalankan saat Unity TERTUTUP (Unity mengunci DLL yang sedang dimuat).
setlocal
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
if exist "%VSWHERE%" for /f "usebackq tokens=*" %%i in (`"%VSWHERE%" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VS=%%i"
rem Lokasi pasang di PC pemilik proyek (disk D:, karena C: penuh)
if not defined VS if exist "D:\Apps\VSBuildTools\VC\Auxiliary\Build\vcvars64.bat" set "VS=D:\Apps\VSBuildTools"
if not defined VS ( echo [MsNative] MSVC tidak ditemukan. & exit /b 1 )
call "%VS%\VC\Auxiliary\Build\vcvars64.bat" >nul || exit /b 1
cd /d "%~dp0"
set "KELUAR=..\..\MahasiswaSim3D\Assets\_Game\Plugins\x86_64"
if not exist "%KELUAR%" mkdir "%KELUAR%"
rem /W4 /WX = semua peringatan dianggap error; /O2 = optimasi; /MT = runtime statis (tidak butuh VC redist di PC lain)
cl /nologo /std:c++20 /W4 /WX /permissive- /O2 /MT /EHsc /LD msnative.cpp /Fe:"%KELUAR%\MsNative.dll" /link /NOLOGO || exit /b 1
del /q msnative.obj "%KELUAR%\MsNative.exp" "%KELUAR%\MsNative.lib" 2>nul
echo [MsNative] OK: %KELUAR%\MsNative.dll
