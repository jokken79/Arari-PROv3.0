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

## Notas Importantes

1. **NO usar datos demo** - Solo datos reales del Excel
2. **Transport ya incluido** en gross_salary - No sumar dos veces
3. **深夜 es EXTRA** (×0.25 adicional), no reemplaza la hora base
4. **Objetivo 15%** para 製造派遣, no 25%
5. **単価** está en tabla `employees.billing_rate`
6. **Non-billable allowances** (通勤手当（非）, 業務手当) son costo empresa pero no se facturan

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
Última actualización: 2025-12-08
