# Script de Migração: Neon → Render
# Execute este script no PowerShell

Write-Host "🔄 Migração de Database: Neon → Render" -ForegroundColor Cyan
Write-Host ""

# PASSO 1: Configurar as connection strings
Write-Host "📝 Configure suas connection strings:" -ForegroundColor Yellow
Write-Host ""
Write-Host "NEON_URL (origem):" -ForegroundColor Green
$NEON_URL = Read-Host "Cole a connection string do Neon"
Write-Host ""
Write-Host "RENDER_URL (destino):" -ForegroundColor Green  
$RENDER_URL = Read-Host "Cole a EXTERNAL connection string do Render"
Write-Host ""

# PASSO 2: Verificar se docker está disponível (para usar imagem PostgreSQL)
Write-Host "🔍 Verificando Docker..." -ForegroundColor Cyan
$dockerAvailable = Get-Command docker -ErrorAction SilentlyContinue

if ($dockerAvailable) {
  Write-Host "✅ Docker encontrado! Usando método com Docker" -ForegroundColor Green
  Write-Host ""
  Write-Host "📤 Exportando do Neon..." -ForegroundColor Cyan
    
  # Exportar do Neon
  docker run --rm postgres:16 pg_dump "$NEON_URL" > backup.sql
    
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Exportação completa! (backup.sql criado)" -ForegroundColor Green
    Write-Host ""
    Write-Host "📥 Importando para Render..." -ForegroundColor Cyan
        
    # Importar para Render
    Get-Content backup.sql | docker run --rm -i postgres:16 psql "$RENDER_URL"
        
    if ($LASTEXITCODE -eq 0) {
      Write-Host "✅ Migração completa!" -ForegroundColor Green
      Write-Host ""
      Write-Host "🧹 Removendo arquivo temporário..." -ForegroundColor Cyan
      Remove-Item backup.sql -ErrorAction SilentlyContinue
    }
    else {
      Write-Host "❌ Erro ao importar para Render" -ForegroundColor Red
    }
  }
  else {
    Write-Host "❌ Erro ao exportar do Neon" -ForegroundColor Red
  }
}
else {
  Write-Host "⚠️  Docker não encontrado" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "🌐 Use o método manual:" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "1. Acesse: https://console.neon.tech" -ForegroundColor White
  Write-Host "   - Abra o SQL Editor" -ForegroundColor Gray
  Write-Host "   - Execute queries para exportar dados" -ForegroundColor Gray
  Write-Host ""
  Write-Host "2. Acesse: https://dashboard.render.com" -ForegroundColor White
  Write-Host "   - Abra seu PostgreSQL Database (Fitout-db)" -ForegroundColor Gray
  Write-Host "   - Clique no botão 'Connect' → 'External Connection'" -ForegroundColor Gray
  Write-Host "   - Use um cliente PostgreSQL (pgAdmin, DBeaver, etc)" -ForegroundColor Gray
  Write-Host ""
  Write-Host "OU instale Docker Desktop:" -ForegroundColor Yellow
  Write-Host "https://www.docker.com/products/docker-desktop" -ForegroundColor Blue
}

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
