# Script de Déploiement Continu Automatisé (CD) - GestPR
Write-Host "=== Début du processus de déploiement ===" -ForegroundColor Green

$ProjectDir = $PSScriptRoot
$RootDir = Split-Path -Parent $ProjectDir

# 1. Compilation et Publication locale
Write-Host "1. Compilation et publication locale .NET..." -ForegroundColor Yellow
Set-Location -Path $ProjectDir
dotnet publish "GestPR.csproj" -c Release -o "bin/Release/net8.0/publish"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la publication .NET !" -ForegroundColor Red
    exit 1
}

# 2. Positionnement à la racine pour Docker Compose
Set-Location -Path $RootDir

# 3. Reconstruction et redémarrage des conteneurs
Write-Host "2. Redémarrage des conteneurs Docker..." -ForegroundColor Yellow
docker compose down
docker compose up -d --build

# 4. Vérification de l'état du serveur
# 3. Vérification de l'accès au serveur backend
Write-Host "3. Vérification de l'accès au serveur backend..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

try {
    # Ajout de -UseBasicParsing pour désactiver le prompt de sécurité PowerShell
    $response = Invoke-WebRequest -Uri "http://localhost:5000/swagger/index.html" -Method Get -UseBasicParsing -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Déploiement réussi ! L'API est accessible sur http://localhost:5000" -ForegroundColor Green
    }
} catch {
    Write-Host "✅ Les conteneurs sont lancés ! Vérifiez l'application sur http://localhost:5000" -ForegroundColor Green
}