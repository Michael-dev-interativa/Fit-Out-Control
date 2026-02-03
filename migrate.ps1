# Migração Neon → Render PostgreSQL
Write-Host "=== Migração de Database ===" -ForegroundColor Cyan
Write-Host ""

# Connection Strings
Write-Host "Cole a Connection String do NEON:" -ForegroundColor Yellow
$neonUrl = Read-Host
Write-Host ""
Write-Host "Cole a EXTERNAL Connection String do RENDER:" -ForegroundColor Yellow
$renderUrl = Read-Host
Write-Host ""

# Verificar Docker
$hasDocker = Get-Command docker -ErrorAction SilentlyContinue

if ($hasDocker) {
  Write-Host "Exportando do Neon..." -ForegroundColor Green
  docker run --rm postgres:16 pg_dump $neonUrl > backup.sql
    
  Write-Host "Importando para Render..." -ForegroundColor Green
  Get-Content backup.sql | docker run --rm -i postgres:16 psql $renderUrl
    
  Write-Host "Concluído!" -ForegroundColor Green
  Remove-Item backup.sql -ErrorAction SilentlyContinue
}
else {
  Write-Host "Docker não instalado." -ForegroundColor Red
  Write-Host ""
  Write-Host "Opções:" -ForegroundColor Yellow
  Write-Host "1. Instale Docker Desktop e execute novamente"
  Write-Host "2. Use pgAdmin ou DBeaver para fazer backup/restore manual"
  Write-Host "3. Use o Shell do Render para importar SQL direto"
}
