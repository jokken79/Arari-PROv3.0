# Claude Agent Memory - 粗利 PRO

Este archivo contiene información importante para futuras sesiones de Claude.

## Contexto del Proyecto

**粗利 PRO** es un sistema de gestión de márgenes de beneficio para empleados de派遣会社 (empresa de staffing/dispatch). El sistema está diseñado específicamente para **製造派遣** (dispatch de manufactura).

### Empresa
- **Nombre**: ユニバーサル企画株式会社
- **Tipo**: 派遣会社 (staffing company)
- **Sector**: 製造派遣 (manufacturing dispatch)

## Fórmulas de Cálculo Importantes

### Costo Total de la Empresa (会社総コスト)
```
会社総コスト = 総支給額 (gross_salary)
             + 社会保険(会社負担) = 本人負担と同額 (労使折半)
             + 雇用保険(0.95%) ← 2024年度 rate
             + 労災保険(0.3%) ← 製造業の場合
             + 有給コスト = 有給時間 × 時給
```

### Facturación (請求金額)
```
請求金額 = (労働時間 × 単価)
         + (残業≤60h × 単価 × 1.25)
         + (残業>60h × 単価 × 1.5)
         + (深夜時間 × 単価 × 0.25)  ← extra, no reemplaza
         + (休日時間 × 単価 × 1.35)
```

### Ganancia Bruta (粗利)
```
粗利 = 請求金額 - 会社総コスト
マージン率 = 粗利 / 請求金額 × 100
```

## Estándares de Margen por Industria

| Tipo de 派遣 | Margen Típico | Objetivo |
|-------------|---------------|----------|
| **製造派遣** (manufactura) | 10-18% | **15%** |
| 事務派遣 (oficina) | 20-25% | 25% |
| IT・専門職 | 25-35% | 30% |

**IMPORTANTE**: El objetivo de margen para este proyecto es **15%** (no 25%) porque es 製造派遣.

## Estructura de Base de Datos

### employees (従業員マスター)
- `employee_id`: ID único (ej: "250213")
- `name`: Nombre completo
- `dispatch_company`: 派遣先 (empresa donde trabaja)
- `hourly_rate`: 時給 (lo que la empresa paga al empleado)
- `billing_rate`: **単価** (lo que la empresa cobra al cliente)

### payroll_records (給与明細)
- `employee_id`, `period`: Clave única
- Horas: `work_hours`, `overtime_hours`, `overtime_over_60h`, `night_hours`, `holiday_hours`
- Pagos: `base_salary`, `overtime_pay`, `night_pay`, `holiday_pay`, `gross_salary`
- Seguros (本人): `social_insurance`, `employment_insurance`
- Seguros (会社): `company_social_insurance`, `company_employment_insurance`, `company_workers_comp`
- Resultado: `billing_amount`, `total_company_cost`, `gross_profit`, `profit_margin`

## Tasas de Seguro (2025年度)

| Seguro | Tasa | Base |
|--------|------|------|
| 社会保険 (会社) | = 本人負担 | 労使折半 |
| 雇用保険 (会社) | **0.90%** | 総支給額 ← 2025年度 |
| 労災保険 | 0.3% | 総支給額 (製造業) |

### Historial de Tasas
| Año | 雇用保険 (会社) |
|-----|-----------------|
| 2024年度 | 0.95% |
| 2025年度 | 0.90% |

##派遣先 Conocidas (Clientes)

| 派遣先 | 単価 |
|--------|------|
| 加藤木材工業 | ¥1,700/h |
| 株式会社オーツカ | ¥1,782/h |
| 株式会社コーリツ | ¥1,990/h |

## Componentes del Frontend

### Charts (Recharts)
- `MarginGaugeChart`: Gauge radial con objetivo 15%
- `EmployeeRankingChart`: Top 5 / Bottom 5 performers
- `FactoryComparisonChart`: Revenue vs Cost por 派遣先
- `HoursBreakdownChart`: Pie chart de horas
- `MonthlyTrendChart`: Barras + línea de margen
- `MonthlySummaryTable`: Tabla con cambios mes a mes

### Color Coding (製造派遣)
- ≥18%: Emerald (excelente)
- 15-18%: Green (objetivo)
- 12-15%: Amber (cerca)
- 10-12%: Orange (mejorar)
- <10%: Red (bajo)

## Formato Excel (ChinginGenerator)

El sistema lee Excel con formato específico:
- Período en celda específica
- Employee ID en nombre de hoja o celda
- ROW_POSITIONS configurables para cada campo
- Múltiples empleados por archivo (múltiples hojas)

## Non-Billable Allowances (会社負担のみ)

Estos 手当 se pagan al empleado pero **NO se facturan** al 派遣先:

| 手当 | Descripción | ¿Se factura? |
|------|-------------|--------------|
| 通勤手当（非） | Transporte (no gravable) | ❌ No |
| 業務手当 | Allowance de trabajo | ❌ No |
| 通勤費 | Costo de transporte | ❌ No |

**Impacto en cálculos:**
- ✅ Se incluyen en `gross_salary` (costo empresa)
- ✅ Se incluyen en `total_company_cost`
- ❌ NO se incluyen en `billing_amount` (facturación basada en horas × 単価)

## Arquitectura Técnica

### Stack del Sistema
- **Frontend**: Next.js 14.2.15 (React 18, TypeScript)
  - Puerto: `http://localhost:3000`
  - Store: Zustand con persistencia
  - Charts: Recharts
  - UI: Tailwind CSS, Framer Motion, Radix UI

- **Backend**: FastAPI (Python)
  - Puerto: `http://localhost:8000`
  - API REST en `/api/*`
  - Parsers: openpyxl para Excel

- **Base de Datos**: SQLite (100% local, NO Docker)
  - Archivo: `arari-app/api/arari_pro.db`
  - Tamaño: ~1.2 MB
  - Portátil: copiar/mover el archivo .db

### Iniciar Servidores

```bash
# Terminal 1 - Backend (FastAPI)
cd arari-app/api
python3 -m uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend (Next.js)
cd arari-app
npm run dev
```

### Dependencias Backend
```bash
cd arari-app/api
pip install -r requirements.txt
```

Incluye: FastAPI, uvicorn, python-multipart, pydantic, openpyxl

## Estado Actual de la Base de Datos

**Última actualización**: 2025-12-09

- **Empleados**: 959 registros (maestro completo)
- **Registros nómina**: 0 (limpiado - esperando Excel real)
- **Settings**: Configurado (雇用保険 2025: 0.90%)

**Acción requerida**: Subir archivos Excel de 給与明細 vía `/upload`

## Notas Importantes

1. **NO usar datos demo** - Solo datos reales del Excel
2. **Transport ya incluido** en gross_salary - No sumar dos veces
3. **深夜 es EXTRA** (×0.25 adicional), no reemplaza la hora base
4. **Objetivo 15%** para 製造派遣, no 25%
5. **単価** está en tabla `employees.billing_rate`
6. **Non-billable allowances** (通勤手当（非）, 業務手当) son costo empresa pero no se facturan
7. **Base de datos LOCAL** - SQLite, no requiere Docker ni servidor externo

## Sistema de Templates para Excel Parser (NUEVO)

### Versión 3.0 - Parser con Templates

El sistema ahora usa un enfoque híbrido para parsear archivos Excel:

1. **Primera vez** (fábrica nueva):
   - Detección automática de campos por labels (基本給, 残業手当, etc.)
   - Si la detección tiene >60% de confianza → Guarda template
   - Parsea datos usando las posiciones detectadas

2. **Siguientes veces** (fábrica conocida):
   - Carga template guardado de la base de datos
   - Parsea datos usando posiciones del template
   - Mucho más rápido y consistente

3. **Fallback**:
   - Si template falla → Vuelve a detección dinámica
   - Si detección falla → Usa posiciones hardcoded

### Archivos del Sistema de Templates

| Archivo | Descripción |
|---------|-------------|
| `template_manager.py` | Gestión de templates (guardar, cargar, listar) |
| `salary_parser.py` | Parser v3.0 con integración de templates |
| `database.py` | Tabla `factory_templates` |

### API Endpoints de Templates

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/templates` | GET | Listar todos los templates |
| `/api/templates/{factory_id}` | GET | Obtener template específico |
| `/api/templates/{factory_id}` | PUT | Actualizar template |
| `/api/templates/{factory_id}` | DELETE | Eliminar/desactivar template |
| `/api/templates/analyze` | POST | Analizar Excel y generar templates |
| `/api/templates/create` | POST | Crear template manualmente |

### Estructura de un Template

```json
{
  "factory_identifier": "加藤木材工業",
  "template_name": "加藤木材工業",
  "field_positions": {
    "employee_id": 6,
    "period": 10,
    "work_hours": 13,
    "overtime_hours": 14,
    "base_salary": 16,
    "gross_salary": 30
  },
  "column_offsets": {
    "label": 1,
    "value": 3,
    "days": 5,
    "period": 8,
    "employee_id": 9
  },
  "detected_allowances": {
    "深夜手当": 18,
    "業務手当": 25
  },
  "non_billable_allowances": ["通勤手当（非）", "業務手当"],
  "detection_confidence": 0.85,
  "employee_column_width": 14
}
```

### Uso en Upload

Cuando se sube un archivo Excel:
1. Parser intenta cargar template para cada hoja
2. Si existe template → Lo usa
3. Si no existe → Detecta campos y guarda nuevo template
4. Respuesta incluye `template_stats` con info sobre templates usados/generados

## Fixes Recientes y Problemas Resueltos

### 2025-12-09: Setup y Correcciones
1. **Fix employee_parser.py**: Método `_detect_columns` estaba incompleto (faltaba inicialización y loop)
   - Archivo: `arari-app/api/employee_parser.py:147-166`
   - Error: IndentationError al cargar el backend
   - Solucionado: Agregado código completo del método

2. **Limpieza de datos vacíos**: Eliminados 4200 registros de nómina con valores en 0
   - Causa: Registros creados pero sin datos del Excel
   - Solución: `DELETE FROM payroll_records` para empezar limpio

3. **Instalación dependencias backend**:
   - Paquetes: fastapi, uvicorn, python-multipart, pydantic, openpyxl
   - `pip install -r requirements.txt` en `arari-app/api/`

4. **Verificación servidores**:
   - Backend FastAPI corriendo en puerto 8000 ✓
   - Frontend Next.js corriendo en puerto 3000 ✓
   - API respondiendo correctamente con datos de empleados ✓

## Problemas Conocidos

1. **Frontend se queda "cargando"**:
   - Causa: Backend no estaba corriendo
   - Solución: Iniciar ambos servidores (ver "Iniciar Servidores" arriba)

2. **Employee parser syntax error**:
   - Ya solucionado (ver fix 2025-12-09)

## Commits Relevantes

```
840694d fix: Update margin targets from 25% to 15% for 製造派遣 standards
83f1530 feat: Add monthly analysis charts and summary table
b078431 feat: Add impressive Dashboard with real-time charts
d98e444 feat: Add complete billing calculation with night/holiday/60H fields
85549cd feat: Add script to recalculate historical margin data
a2d3c88 feat: Support direct 有給金額 (paid leave amount) from Excel
9da2017 fix: Correct gross margin calculation per Japanese standards
```

---
**Última actualización**: 2025-12-09
**Estado**: Sistema operativo con parser de templates v3.0
