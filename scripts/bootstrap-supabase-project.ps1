#!/usr/bin/env pwsh
# 在已经 `supabase projects create` 之后跑这个脚本
# 准备 4 个值：project ref、anon key、service_role key、db password
param(
  [Parameter(Mandatory=$true)][string]$Ref,
  [Parameter(Mandatory=$true)][string]$AnonKey,
  [Parameter(Mandatory=$true)][string]$ServiceRole,
  [Parameter(Mandatory=$true)][string]$DbPassword
)

$ErrorActionPreference = "Stop"

# 1. 拼 Direct connection URL
#    Supabase direct host: db.<ref>.supabase.co:5432, user=postgres, db=postgres
$DbUrl = "postgresql://postgres:${DbPassword}@db.${Ref}.supabase.co:5432/postgres"
$Url   = "https://${Ref}.supabase.co"

# 2. 合并写入 .env.local（保留已有的非 Supabase 变量，例如豆包 ARK_API_KEY）
$envPath = Join-Path $PSScriptRoot "..\.env.local"
$supabaseKeys = @{
  'NEXT_PUBLIC_SUPABASE_URL'      = $Url
  'NEXT_PUBLIC_SUPABASE_ANON_KEY' = $AnonKey
  'SUPABASE_SERVICE_ROLE_KEY'     = $ServiceRole
  'SUPABASE_DB_URL'               = $DbUrl
}

# 读旧内容（若存在），按行解析成有序字典，保留非 Supabase 行
$existing = [ordered]@{}
if (Test-Path $envPath) {
  foreach ($line in Get-Content $envPath) {
    if ($line -match '^\s*#') { continue }              # 跳过注释
    if ($line -match '^\s*$') { continue }              # 跳过空行
    if ($line -match '^([^=]+)=(.*)$') {
      $k = $matches[1].Trim()
      if (-not $supabaseKeys.ContainsKey($k)) {
        $existing[$k] = $matches[2]
      }
    }
  }
}

# 合并：保留的旧变量在前，Supabase 4 项在后
$allKeys = @()
foreach ($k in $existing.Keys) { $allKeys += "$k=$($existing[$k])" }
foreach ($k in $supabaseKeys.Keys) { $allKeys += "$k=$($supabaseKeys[$k])" }
$envContent = ($allKeys -join "`n") + "`n"
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host "✓ .env.local merged at $envPath (Supabase keys updated, other keys preserved)"

# 3. link 本地仓库到远端 project
Push-Location (Join-Path $PSScriptRoot "..")
try {
  Write-Host "→ supabase link"
  supabase link --project-ref $Ref --password $DbPassword
  if ($LASTEXITCODE -ne 0) { throw "supabase link failed" }

  Write-Host "→ npm install (确保 tsx 可用)"
  npm install --silent
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

  Write-Host "→ npm run migrate (跑 supabase/migrations/0001_init.sql)"
  npm run migrate
  if ($LASTEXITCODE -ne 0) { throw "npm run migrate failed" }

  Write-Host ""
  Write-Host "✅ 全部建好了："
  Write-Host "  - 3 张表（profiles / daily_advices / daily_logs）"
  Write-Host "  - RLS 策略 + updated_at trigger"
  Write-Host "  - Storage bucket 'advices'（private）"
  Write-Host "  - 4 条 owner-only storage 策略"
  Write-Host ""
  Write-Host "⚠  还需要 1 步手工操作（CLI 改不了 project-level auth config）："
  Write-Host "  1) 打开 https://supabase.com/dashboard/project/$Ref/auth/url-configuration"
  Write-Host "  2) Redirect URLs 加 http://localhost:3000/auth/callback"
  Write-Host "  3) 保存"
  Write-Host ""
  Write-Host "之后：npm run dev → 访问 /auth 即可登录"
}
finally {
  Pop-Location
}
