# Agro Olam AI Agronom API — test script
# Usage: .\scripts\test-api.ps1 [-BaseUrl "http://localhost:3000"] [-ApiKey "your_key"]

param(
  [string]$BaseUrl = "http://localhost:3000"
)

$ApiKey = $env:AGRO_API_KEY
if (-not $ApiKey) {
  Write-Host "AGRO_API_KEY env o'rnatilmagan. .env.local dan o'qing yoki Vercel'da sozlang." -ForegroundColor Yellow
  $ApiKey = "super_secret_api_key_here"
}

$passed = 0
$failed = 0

function Test-Case($name, $scriptBlock) {
  Write-Host "`n--- $name ---" -ForegroundColor Cyan
  try {
    & $scriptBlock
    Write-Host "PASS: $name" -ForegroundColor Green
    $script:passed++
  } catch {
    Write-Host "FAIL: $name — $_" -ForegroundColor Red
    $script:failed++
  }
}

Test-Case "Health check" {
  $r = Invoke-RestMethod "$BaseUrl/api/agronom/health"
  if ($r.status -ne "ok") { throw "status not ok" }
  if ($r.version -ne "1.0.0") { throw "version mismatch" }
  Write-Host ($r | ConvertTo-Json -Compress)
}

Test-Case "Agro savol (to'g'ri API key)" {
  $body = '{"message":"Pomidor barglari sargaymoqda","language":"auto"}'
  $r = Invoke-RestMethod "$BaseUrl/api/agronom/chat" -Method POST `
    -Headers @{ Authorization = "Bearer $ApiKey"; "Content-Type" = "application/json" } `
    -Body $body -ContentType "application/json"
  if (-not $r.success) { throw $r.error }
  if (-not $r.answer) { throw "no answer" }
  Write-Host "Answer length: $($r.answer.Length)"
}

Test-Case "Agro bo'lmagan savol" {
  $body = '{"message":"Messi kim?","language":"uz"}'
  $r = Invoke-RestMethod "$BaseUrl/api/agronom/chat" -Method POST `
    -Headers @{ Authorization = "Bearer $ApiKey"; "Content-Type" = "application/json" } `
    -Body $body -ContentType "application/json"
  if (-not $r.success) { throw $r.error }
  if ($r.answer -notmatch "agronomiya") { throw "expected rejection" }
  Write-Host $r.answer
}

Test-Case "API key yo'q" {
  try {
    $body = '{"message":"test"}'
    Invoke-RestMethod "$BaseUrl/api/agronom/chat" -Method POST `
      -Body $body -ContentType "application/json" -ErrorAction Stop
    throw "should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 401) {
      throw "expected 401, got $($_.Exception.Response.StatusCode.value__)"
    }
    Write-Host "401 Unauthorized (expected)"
  }
}

Test-Case "API key noto'g'ri" {
  try {
    $body = '{"message":"test"}'
    Invoke-RestMethod "$BaseUrl/api/agronom/chat" -Method POST `
      -Headers @{ Authorization = "Bearer wrong_key" } `
      -Body $body -ContentType "application/json" -ErrorAction Stop
    throw "should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 401) {
      throw "expected 401"
    }
    Write-Host "401 Unauthorized (expected)"
  }
}

Test-Case "Message bo'sh" {
  try {
    $body = '{"message":"   "}'
    Invoke-RestMethod "$BaseUrl/api/agronom/chat" -Method POST `
      -Headers @{ Authorization = "Bearer $ApiKey" } `
      -Body $body -ContentType "application/json" -ErrorAction Stop
    throw "should have failed"
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 400) {
      throw "expected 400"
    }
    Write-Host "400 Bad Request (expected)"
  }
}

Test-Case "Frontend internal /api/chat (no API key)" {
  $body = '{"message":"Nima ekish kerak bahorda?","language":"auto"}'
  $r = Invoke-RestMethod "$BaseUrl/api/chat" -Method POST `
    -Body $body -ContentType "application/json"
  if (-not $r.success) { throw $r.error }
  Write-Host "Internal chat OK"
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "Passed: $passed | Failed: $failed" -ForegroundColor Yellow
if ($failed -gt 0) { exit 1 }
