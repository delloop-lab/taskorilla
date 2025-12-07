# Script to geocode old tasks
# Make sure you're logged into your app first, then run this script

$url = "http://localhost:3000/api/geocode-tasks"

Write-Host "Starting bulk geocoding..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Headers @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n✅ Geocoding Complete!" -ForegroundColor Green
    Write-Host "Total tasks found: $($response.total)" -ForegroundColor Cyan
    Write-Host "Successfully updated: $($response.updated)" -ForegroundColor Green
    Write-Host "Failed: $($response.failed)" -ForegroundColor Red
    
    if ($response.errors -and $response.errors.Length -gt 0) {
        Write-Host "`nErrors:" -ForegroundColor Yellow
        $response.errors | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    }
} catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "  1. Your app is running (localhost:3000)" -ForegroundColor Yellow
    Write-Host "  2. You're logged in to the app" -ForegroundColor Yellow
    Write-Host "  3. You have tasks with postcodes but no coordinates" -ForegroundColor Yellow
}





