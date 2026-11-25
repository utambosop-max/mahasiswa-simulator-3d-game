# Build APK debug dengan Java 21 + Android SDK yang dipasang di D:\AndroidDev
# (Capacitor 8 butuh Java 21; Java 17 di PC tidak cukup.)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (Test-Path 'D:\AndroidDev\jdk21') {
  $env:JAVA_HOME = 'D:\AndroidDev\jdk21'
  $env:ANDROID_HOME = 'D:\AndroidDev\sdk'
  $env:GRADLE_USER_HOME = 'D:\AndroidDev\gradle-home'   # cache Gradle di D: (C: hampir penuh)
  $env:Path = "D:\AndroidDev\jdk21\bin;$env:Path"
}
Set-Location (Join-Path $root 'android')
& .\gradlew.bat assembleDebug --console=plain
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$rilis = Join-Path $root 'rilis'
New-Item -ItemType Directory -Force $rilis | Out-Null
Copy-Item 'app\build\outputs\apk\debug\app-debug.apk' (Join-Path $rilis 'MahasiswaSimulator3D-debug.apk') -Force
Write-Host "APK siap: $rilis\MahasiswaSimulator3D-debug.apk"
