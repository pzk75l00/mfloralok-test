param(
    [string]$Root = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$items = @(
    @{ src = 'src/components/Movil/reports/ReportsMovilView.js'; dst = 'borrado/src/components/Movil/reports/ReportsMovilView.js' },
    @{ src = 'src/components/MovementsView.js'; dst = 'borrado/src/components/MovementsView.js' },
    @{ src = 'src/components/Sales/SalesDesktopForm.js'; dst = 'borrado/src/components/Sales/SalesDesktopForm.js' },
    @{ src = 'src/components/Sales/SalesMobileForm.js'; dst = 'borrado/src/components/Sales/SalesMobileForm.js' },
    @{ src = 'src/components/SalesForm.js'; dst = 'borrado/src/components/SalesForm.js' },
    @{ src = 'public/imgLogo/Logo_Nuevo_Background Removal.png'; dst = 'borrado/public/imgLogo/Logo_Nuevo_Background Removal.png' },
    @{ src = 'imgLogo/Logo_Nuevo_Background Removal.png'; dst = 'borrado/imgLogo/Logo_Nuevo_Background Removal.png' },
    @{ src = 'imgLogo/plant_43.jpg'; dst = 'borrado/imgLogo/plant_43.jpg' },
    @{ src = 'src/components/Movil/ProductTypesManager.js'; dst = 'borrado/src/components/Movil/ProductTypesManager.js' },
    @{ src = 'src/components/Desktop/reports/ReportsView.js'; dst = 'borrado/src/components/Desktop/reports/ReportsView.js' },
    @{ src = 'src/components/CargaMovilView.js'; dst = 'borrado/src/components/CargaMovilView.js' },
    @{ src = 'src/components/Movil/CargaMovilView.js'; dst = 'borrado/src/components/Movil/CargaMovilView.js' }
)

foreach ($i in $items) {
    $src = Join-Path $Root $i.src
    if (Test-Path -LiteralPath $src) {
        $dst = Join-Path $Root $i.dst
        $dstDir = Split-Path $dst -Parent
        if (-not (Test-Path -LiteralPath $dstDir)) {
            New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
        }
        Move-Item -LiteralPath $src -Destination $dst -Force
        Write-Host ("Moved: {0} -> {1}" -f $i.src, $i.dst) -ForegroundColor Yellow
    } else {
        Write-Host ("Skip (not found): {0}" -f $i.src) -ForegroundColor DarkGray
    }
}
