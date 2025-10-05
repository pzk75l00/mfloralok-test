# Plan de Arquitectura Modular de Reportes

Fecha: 2025-10-05  
Estado: Propuesta (pendiente de aprobación)

---
## 1. Objetivo
Construir un subsistema de **Reportes** desacoplado de la vista de estadísticas actual, con:
- Motor declarativo (definiciones por archivo, fácil de extender).
- Parámetros dinámicos y validación centralizada.
- Normalización y cacheo de datos compartidos (evita recomputar en cada reporte).
- Exportaciones (CSV inicialmente; luego JSON, XLSX, PDF).
- Base preparada para Web Worker, presets de usuario y escalado.

---
## 2. Beneficios Clave
| Beneficio | Detalle |
|-----------|---------|
| Escalabilidad | Agregar un reporte = crear un archivo `.report.js` nuevo |
| Mantenibilidad | Lógica de agregaciones centralizada (no duplicar en cada componente) |
| Performance | Normalización y cache + posibilidad de Worker para grandes volúmenes |
| Consistencia UI | Misma experiencia para todos los reportes (filtros / export) |
| Evolución | Fácil incorporar filtros avanzados, favoritos, programación futura |

---
## 3. Estructura Propuesta de Carpetas
```
src/
  domain/
    reporting/
      reportTypes.js           # Constantes / categorías
      reportRegistry.js        # Registro central (importa todas las definiciones)
      baseReportEngine.js      # Motor principal (validación, ejecución, cache)
      transformers/
        normalizeMovements.js  # Normalización (fechas, duplicados, pagos mixtos)
        aggregates.js          # Funciones reutilizables (sumas, agrupaciones)
      validators/
        paramsValidator.js     # Validación de parámetros dinámicos
  hooks/
    useAppData.js              # Carga única de movements, plants, paymentMethods
    useReportsEngine.js        # API React sobre el motor
  components/Desktop/reports/
    ReportsCenter.js           # Contenedor principal
    ReportRunnerPanel.js       # Selector + parámetros + ejecutar
    ReportResultTable.js       # Tabla reutilizable
    ReportFiltersBar.js        # (futuro) filtros globales
    ReportExportButtons.js     # Botones de exportación
    definitions/
      productsConsistentMonthly.report.js
      productsNeverSold.report.js
      productsTopProfitCurrentMonth.report.js
      (etc...)
```

---
## 4. Contratos Principales
### 4.1 Definición de Reporte (`*.report.js`)
```js
export default {
  id: 'products_consistent_monthly',
  category: 'productos',
  label: 'Productos vendidos todos los meses',
  description: 'Intersección de productos en cada mes con ventas.',
  paramsSchema: {              // Esquema de parámetros (UI dinámica)
    fromMonth: { type: 'month', required: false },
    toMonth: { type: 'month', required: false }
  },
  run: async ({ data, params, utils }) => {
    // data.movements, data.plants (ya normalizados)
    // utils.aggregate, utils.indexBy, etc.
    return {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Nombre' },
        { key: 'monthsCount', label: 'Meses', align: 'right' }
      ],
      rows: [ /* ... */ ],
      meta: { total: 0 }
    };
  }
};
```

### 4.2 Motor (`baseReportEngine.js`)
Responsabilidades:
- Registrar reportes (importar / listar).
- Validar parámetros (`paramsSchema`).
- Normalizar dataset una sola vez (fechas, pagos mixtos, deduplicaciones).
- Cachear resultados (`cache[keyHash] = resultado`).
- Exponer: `listReports()`, `run(reportId, params)`, `getLastResult(reportId)`.

### 4.3 Hook `useReportsEngine`
Devuelve:
```js
const {
  reports,          // [{ id, label, category }]
  runReport,        // (id, params) => ejecuta y guarda
  loading,          // bool
  resultById,       // { [id]: { columns, rows, meta, ts } }
  error
} = useReportsEngine();
```

### 4.4 Hook `useAppData`
Centraliza un único `onSnapshot` por colección y normaliza:
```js
const { movements, plants, paymentMethods, ready, refresh } = useAppData();
```

---
## 5. Normalización Planificada
- Conversión segura de fecha (`parseDateSafe`).
- Eliminación de duplicados (misma firma en ventana de 60s, ya utilizada en scripts).
- Distribución consistente de pagos mixtos (escalar si sumas ≠ total).
- Índices auxiliares (por producto, por mes) precalculados para acelerar reportes.

---
## 6. Parámetros Dinámicos (Ejemplos)
| Tipo | Ejemplo | Uso |
|------|---------|-----|
| `dateRange` | from / to | Ventas entre fechas |
| `month` | 2025-08 | Cortes mensuales |
| `multiselect` | métodos pago | Filtrar efectivo / MP |
| `number` | topN = 10 | Ranking |
| `select` | agrupación = (mes, producto) | Pivot simple |

UI generada automáticamente leyendo `paramsSchema`.

---
## 7. Exportaciones
Fase 1: CSV.  
Fase 2: JSON + XLSX (ya está `xlsx` en dependencias).  
Fase 3: PDF (con `jspdf-autotable`).

---
## 8. Cache de Resultados
- Clave: `hash(reportId + JSON(params) + datasetVersion)`.
- Invalida al cambiar versión de dataset (contadores de snapshots o timestamp del último movimiento).
- Botón “Limpiar cache” en UI (futuro).

---
## 9. Web Worker (Etapa 5 Opcional)
Para grandes volúmenes:
- `reportWorker.js` recibe `{ reportId, params, movements, plants }`.
- Devuelve `{ columns, rows, meta }`.
- `useReportsEngine` decide si usar Worker según `movements.length` > UMBRAL.

---
## 10. Roadmap por Etapas
| Etapa | Alcance | Entrega | Estimado |
|-------|---------|---------|----------|
| 1 | Infra básica + hooks (`useAppData`, motor) | Estructura lista | 0.5 día |
| 2 | UI mínima (`ReportsCenter`, ejecutar + export CSV) | 3 reportes migrados | 0.5 día |
| 3 | Parámetros dinámicos / validación | Esquema + UI formularios | 0.5 día |
| 4 | Cache + memo + limpiar | Mejor rendimiento | 0.5 día |
| 5 (opt) | Web Worker | Offload cálculos pesados | 1 día |
| 6 (opt) | XLSX export | Export enriquecido | 0.5 día |
| 7 (opt) | Presets usuario (localStorage / Firestore) | Guardar favoritos | 0.5 día |

> Se puede detener tras la Etapa 2 si se busca una versión usable rápida.

---
## 11. Migración desde el Estado Actual
1. Crear carpeta `domain/reporting` y `components/Desktop/reports`.
2. Mover lógica de “Reportes Especiales” y `CustomReportsPanel` a definiciones.
3. Eliminar secciones duplicadas de `StatisticsView`.
4. Agregar item “Reportes” en navegación; dejar enlace en estadísticas (“Ver Reportes Avanzados →”).
5. Validar equivalencia de resultados con versión anterior.

---
## 12. Reportes Iniciales (Definiciones Base)
1. `products_consistent_monthly` – Intersección mensual.
2. `products_never_sold_with_stock` – Stock > 0 sin ventas históricas.
3. `top_profit_current_month` – Top 10 por ganancia en mes actual.
4. (Propuesto) `net_sales_by_method` – Ventas netas por método de pago (rango fechas y métodos). 

---
## 13. Ejemplo Reporte: Ventas Netas por Método
```js
export default {
  id: 'net_sales_by_method',
  label: 'Ventas netas por método de pago',
  category: 'finanzas',
  paramsSchema: {
    from: { type: 'date', required: true },
    to: { type: 'date', required: true },
    methods: { type: 'multiselect', options: ['efectivo','mercadoPago'], required: true, default: ['efectivo','mercadoPago'] }
  },
  run: ({ data, params }) => {
    const { movements } = data;
    const from = new Date(params.from);
    const to = new Date(params.to);
    const acc = {};
    movements.forEach(m => {
      if (m.type !== 'venta' || !m.date) return;
      const d = new Date(m.date);
      if (d < from || d > to) return;
      if (m.paymentMethods) {
        Object.entries(m.paymentMethods).forEach(([method, val]) => {
          if (!params.methods.includes(method)) return;
          acc[method] = (acc[method] || 0) + Number(val || 0);
        });
      } else if (params.methods.includes(m.paymentMethod)) {
        acc[m.paymentMethod] = (acc[m.paymentMethod] || 0) + Number(m.total || 0);
      }
    });
    const rows = Object.entries(acc).map(([method, total]) => ({ method, total }));
    return {
      columns: [
        { key: 'method', label: 'Método' },
        { key: 'total', label: 'Total', align: 'right' }
      ],
      rows,
      meta: { methodsCount: rows.length }
    };
  }
};
```

---
## 14. Riesgos y Mitigaciones
| Riesgo | Mitigación |
|--------|-----------|
| Lógica duplicada entre reportes | Extraer a `aggregates.js` / utils compartidos |
| Reportes lentos | Cache + Worker (Etapa 5) |
| Crecimiento desordenado | `reportRegistry.js` como single source of truth |
| Validación incompleta de parámetros | `paramsValidator.js` con tests unitarios |
| Fechas inconsistentes | `normalizeMovements.js` con `parseDateSafe()` |

---
## 15. Extensiones Futuras
- Favoritos por usuario (Firestore `userSettings.reportPresets`).
- Programación / export async (Cloud Functions + Storage). 
- Compartir reporte vía URL (serializar params en querystring).
- Soporte multitenant (filtrar por `tenantId`).

---
## 16. Decisión Pendiente
Indicar hasta qué etapa avanzar en la primera iteración:  
**Propuesta:** Implementar Etapas 1–2 ahora; dejar estructura lista para 3–4.

---
## 17. Checklist de Aprobación Inicial
- [ ] Aceptar estructura de carpetas
- [ ] Confirmar categorías base (ej: productos, finanzas, inventario)
- [ ] Definir etapas a ejecutar ya (1–2 / 1–3 / 1–4)
- [ ] Aprobar reporte adicional `net_sales_by_method`

---
## 18. Resumen Ejecutivo
La modularización de reportes reduce deuda técnica futura, acelera incorporación de nuevas analíticas y crea una base escalable para funcionalidades avanzadas (parámetros, presets, worker). La inversión inicial (≈1 día para Etapas 1–2 + migración) evita reescrituras posteriores cuando crezca el catálogo de reportes.

---
**Fin del documento**
