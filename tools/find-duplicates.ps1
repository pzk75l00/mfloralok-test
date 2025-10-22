# Find duplicate files in the repo excluding heavy/derived folders
# Outputs two CSV files in the repo root: duplicates_by_name.csv and duplicates_by_hash.csv

param(
    [string]$Root = (Get-Location).Path,
    [string[]]$ExcludePatterns = @('\\node_modules\\', '\\build\\', '\\.git\\', '\\.vercel\\', '\\borrado\\')
)

Write-Host "Scanning for files under: $Root" -ForegroundColor Cyan
$allFiles = Get-ChildItem -LiteralPath $Root -Recurse -File -ErrorAction SilentlyContinue

# Helper: filter out excluded paths
function IsExcluded([string]$fullPath) {
    foreach ($pat in $ExcludePatterns) {
        if ($fullPath -match $pat) { return $true }
    }
    return $false
}

$files = $allFiles | Where-Object { -not (IsExcluded $_.FullName) }

Write-Host "Total files (after exclusions): $($files.Count)" -ForegroundColor Yellow

# 1) Duplicates by NAME (may be legit if same name in different folders)
$dupByName = $files |
    Group-Object Name |
    Where-Object { $_.Count -gt 1 } |
    ForEach-Object {
        [PSCustomObject]@{
            Count = $_.Count
            Name  = $_.Name
            Paths = ($_.Group.FullName -join '; ')
        }
    } |
    Sort-Object -Property Name |
    Sort-Object -Property Count -Descending

$dupByNamePath = Join-Path $Root 'duplicates_by_name.csv'
$dupByName | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $dupByNamePath
Write-Host "Wrote: $dupByNamePath (rows: $($dupByName.Count))" -ForegroundColor Green

# 2) Duplicates by CONTENT (hash), more accurate
# Note: Can be slower on large trees
$dupByHash = $files |
    Get-FileHash -Algorithm SHA256 |
    Group-Object Hash |
    Where-Object { $_.Count -gt 1 } |
    ForEach-Object {
        [PSCustomObject]@{
            Count = $_.Count
            Hash  = $_.Name
            Files = ($_.Group.Path -join '; ')
        }
    } |
    Sort-Object -Property Hash |
    Sort-Object -Property Count -Descending

$dupByHashPath = Join-Path $Root 'duplicates_by_hash.csv'
$dupByHash | Export-Csv -NoTypeInformation -Encoding UTF8 -Path $dupByHashPath
Write-Host "Wrote: $dupByHashPath (rows: $($dupByHash.Count))" -ForegroundColor Green

# Show top few in console for quick glance
Write-Host "\nTop 10 by NAME:" -ForegroundColor Cyan
$dupByName | Select-Object -First 10 | Format-Table -AutoSize

Write-Host "\nTop 10 by HASH:" -ForegroundColor Cyan
$dupByHash | Select-Object -First 10 | Format-Table -AutoSize
