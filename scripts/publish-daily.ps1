param([Parameter(Mandatory=$true)][ValidatePattern('^\d{4}-\d{2}-\d{2}$')][string]$Date)
$ErrorActionPreference = 'Stop'

$dailyFile = "src/content/daily/$Date.md"
if (-not (Test-Path -LiteralPath $dailyFile)) { throw "日报文件不存在：$dailyFile" }
if ((git branch --show-current) -ne 'main') { throw '只能从 main 分支发布日报' }
if ($LASTEXITCODE -ne 0) { throw '无法确认当前 Git 分支' }
if ((git diff --name-only).Count -gt 0) { throw '工作区存在未提交的修改；请在独立、干净的 worktree 中发布' }
if ((git diff --cached --name-only).Count -gt 0) { throw '暂存区存在其他修改；停止发布' }

npm run validate
if ($LASTEXITCODE -ne 0) { throw '内容校验失败，停止发布' }
npm run build
if ($LASTEXITCODE -ne 0) { throw '网站构建失败，停止发布' }

git fetch origin main
if ($LASTEXITCODE -ne 0) { throw '无法获取远端 main，停止发布' }
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw '本地分支已落后于远端 main，停止发布；请重新基于最新 main 生成' }

$dailyText = Get-Content -LiteralPath $dailyFile -Raw -Encoding UTF8
$articleIds = [regex]::Matches($dailyText, '(?m)^\s+article:\s+"?([a-z0-9-]+)"?\s*$') | ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
$paths = @($dailyFile)
foreach ($articleId in $articleIds) {
  $articleFile = "src/content/articles/$articleId.md"
  if (-not (Test-Path -LiteralPath $articleFile)) { throw "关联长文不存在：$articleFile" }
  $paths += $articleFile
}
$untracked = @(git ls-files --others --exclude-standard)
$unexpected = @($untracked | Where-Object { $_ -notin $paths })
if ($unexpected.Count -gt 0) { throw "工作区存在与当日发布无关的未跟踪文件：$($unexpected -join ', ')" }
git add -- $paths
if ($LASTEXITCODE -ne 0) { throw 'Git 暂存失败' }
git diff --cached --quiet
if ($LASTEXITCODE -eq 0) { Write-Output '当天内容没有变化，无需重复发布'; exit 0 }
git commit -m "Publish technology radar $Date"
if ($LASTEXITCODE -ne 0) { throw 'Git 提交失败' }
git push origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw '远端拒绝推送；未使用强制推送，请检查远端变化或身份验证' }
Write-Output "已发布 $Date 日报及关联长文；GitHub Pages 将由 main 推送触发构建。"
