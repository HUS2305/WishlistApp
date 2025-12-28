# Git Status Checker
# Run this script to check your git status and see what changes exist

Write-Host "`n=== Git Status Check ===" -ForegroundColor Cyan
Write-Host ""

# Check if we're in a git repository
if (-not (Test-Path .git)) {
    Write-Host "❌ Not a git repository!" -ForegroundColor Red
    exit 1
}

# Show current branch and commit status
Write-Host "Current Branch:" -ForegroundColor Yellow
git branch --show-current
Write-Host ""

# Check if ahead/behind remote
$status = git status --porcelain=v1 -b
if ($status -match "ahead") {
    Write-Host "⚠️  Your branch is ahead of origin" -ForegroundColor Yellow
    git log --oneline origin/HEAD..HEAD
    Write-Host ""
}

# Check for uncommitted changes
$changes = git status --porcelain
if ($changes) {
    Write-Host "⚠️  UNCOMMITTED CHANGES DETECTED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Modified files:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Yellow
    git diff --stat
    Write-Host ""
    Write-Host "To see detailed changes: git diff" -ForegroundColor Cyan
    Write-Host "To discard all changes: git restore ." -ForegroundColor Cyan
    Write-Host "To stage changes: git add ." -ForegroundColor Cyan
} else {
    Write-Host "✅ Working tree is clean!" -ForegroundColor Green
    Write-Host ""
}

# Show recent commits
Write-Host "Recent commits:" -ForegroundColor Yellow
git log --oneline -5
Write-Host ""

Write-Host "=== End of Status Check ===" -ForegroundColor Cyan
Write-Host ""

