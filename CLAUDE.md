# Claude Agent Memory - 粗利 PRO

Este archivo contiene información importante para futuras sesiones de Claude.

## Contexto del Proyecto

**粗利 PRO** es un sistema de gestión de márgenes de beneficio para empleados de派遣会社 (empresa de staffing/dispatch). El sistema está diseñado específicamente para **製造派遣** (dispatch de manufactura).

### Empresa
- **Nombre**: ユニバーサル企画株式会社
- **Tipo**: 派遣会社 (staffing company)
- **Sector**: 製造派遣 (manufacturing dispatch)

## Fórmulas de Cálculo Importantes

### Costo Total de la Empresa (会社総コスト) - FÓRMULA CORRECTA
```
会社総コスト = 総支給額 (gross_salary)
             + 健康保険(会社負担) = 本人負担と同額 (労使折半)
             + 厚生年金(会社負担) = 本人負担と同額 (労使折半)
             + 雇用保険(0.90%) ← 2025年度 rate
             + 労災保険(0.3%) ← 製造業の場合
```

**⚠️ IMPORTANTE - NO DUPLICAR 有給コスト:**
- 有給支給 (paid_leave_amount) YA ESTÁ INCLUIDO en 総支給額
- NO se debe sumar de nuevo al 会社総コスト
- Ver fix del 2025-12-10 para detalles

### 法定福利費 (会社負担) - Desglose Completo
```
法定福利費 = 健康保険(会社分) = social_insurance (本人と同額)
           + 厚生年金(会社分) = welfare_pension (本人と同額)
           + 雇用保険 = gross_salary × 0.90%
           + 労災保険 = gross_salary × 0.30%
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
- 有給: `paid_leave_days`, `paid_leave_hours`, `paid_leave_amount`
- Pagos: `base_salary`, `overtime_pay`, `night_pay`, `holiday_pay`, `overtime_over_60h_pay`, `gross_salary`
- 手当: `transport_allowance`, `other_allowances`, `non_billable_allowances`
- Seguros (本人): `social_insurance`, `welfare_pension`, `employment_insurance`
- Seguros (会社): `company_social_insurance`, `company_employment_insurance`, `company_workers_comp`
- Impuestos: `income_tax`, `resident_tax`, `other_deductions`
- Resultado: `billing_amount`, `total_company_cost`, `gross_profit`, `profit_margin`, `net_salary`

**Campos añadidos en 2025-12-10:**
- `welfare_pension`: 厚生年金保険料 (本人負担) - Antes no se parseaba del Excel
- `non_billable_allowances`: 非請求手当 (通勤手当（非）, 業務手当等)

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

**Última actualización**: 2025-12-10

- **Empleados**: 959 registros (maestro completo)
- **Registros nómina**: 0 (limpiado 2025-12-10 - esperando Excel con parser v4.0)
- **Factory Templates**: 0 (limpiado para regenerar con nuevo parser)
- **Settings**: Configurado (雇用保険 2025: 0.90%)

**Acción requerida**: Subir archivos Excel de 給与明細 vía `/upload`

**Razón de limpieza**: Los registros anteriores tenían:
- welfare_pension = 0 (no se parseaba)
- 会社総コスト duplicando paid_leave_cost
- paid_leave_days = 0 (no se extraía del dynamic zone)

## Notas Importantes

1. **NO usar datos demo** - Solo datos reales del Excel
2. **Transport ya incluido** en gross_salary - No sumar dos veces
3. **深夜 es EXTRA** (×0.25 adicional), no reemplaza la hora base
4. **Objetivo 15%** para 製造派遣, no 25%
5. **単価** está en tabla `employees.billing_rate`
6. **Non-billable allowances** (通勤手当（非）, 業務手当) son costo empresa pero no se facturan
7. **Base de datos LOCAL** - SQLite, no requiere Docker ni servidor externo
8. **⚠️ 有給支給 YA ESTÁ EN 総支給額** - NO sumar paid_leave_cost al total_company_cost
9. **⚠️ 法定福利費 incluye 厚生年金** - company_social_insurance = 健康保険 + 厚生年金 (ambos 労使折半)
10. **⚠️ welfare_pension** se parsea de fila 32 en FALLBACK_ROW_POSITIONS

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

### 2025-12-10: CORRECCIONES CRÍTICAS DE CÁLCULOS (Parser v4.0)

#### Problema 1: 厚生年金 (welfare_pension) no aparecía
**Síntoma**: En el modal de 粗利分析, la sección 控除の部 solo mostraba 健康保険, no 厚生年金.
**Causa**: El parser no extraía welfare_pension del Excel (FALLBACK_ROW_POSITIONS faltaba la fila).
**Solución**:
- Archivo: `arari-app/api/salary_parser.py`
- Agregado `'welfare_pension': 32` a FALLBACK_ROW_POSITIONS (línea ~110)
- Ahora parsea la fila 32 donde está 厚生年金 en el Excel

```python
# FALLBACK_ROW_POSITIONS en salary_parser.py
FALLBACK_ROW_POSITIONS = {
    ...
    'social_insurance': 31,    # 健康保険
    'welfare_pension': 32,     # 厚生年金 ← AGREGADO
    'employment_insurance': 33,
    ...
}
```

#### Problema 2: 会社総コスト estaba incorrecto (duplicaba 有給コスト)
**Síntoma**: Empleado WATANABE mostraba 会社総コスト = ¥272,100 cuando debía ser ~¥295,670.
**Causa**: `services.py` sumaba `paid_leave_cost` al `total_company_cost`, pero `paid_leave_amount` YA ESTÁ en `gross_salary`.
**Solución**:
- Archivo: `arari-app/api/services.py` (líneas 313-336)
- ELIMINADO `paid_leave_cost` del cálculo de `total_company_cost`

```python
# services.py - CÓDIGO CORRECTO (líneas 331-336)
total_company_cost = record.total_company_cost or (
    record.gross_salary +              # Ya incluye paid_leave_amount
    company_social_insurance +         # 健康保険 + 厚生年金 (会社分)
    company_employment_insurance +     # 雇用保険 (0.90%)
    company_workers_comp               # 労災保険 (0.30%)
)
# ❌ NO AGREGAR paid_leave_cost - ya está en gross_salary
```

#### Problema 3: 法定福利費 no incluía 厚生年金(会社分)
**Síntoma**: 法定福利費 (会社負担) solo mostraba ~¥21,925 cuando debía incluir también 厚生年金.
**Causa**: `company_social_insurance` solo usaba `social_insurance` (健康保険), no `welfare_pension`.
**Solución**:
- Archivo: `arari-app/api/services.py` (líneas 298-301)

```python
# services.py - CÓDIGO CORRECTO (líneas 298-301)
welfare_pension = getattr(record, 'welfare_pension', 0) or 0
company_social_insurance = record.company_social_insurance or (
    record.social_insurance + welfare_pension  # 健康保険 + 厚生年金
)
```

#### Problema 4: 有給日数 = 0 cuando Excel tiene días
**Síntoma**: Empleado 230916 mostraba 有給日数=0 pero 有給金額=¥12,000.
**Causa**: El parser solo extraía `paid_leave_amount` del dynamic zone, no `paid_leave_days`.
**Solución**:
- Archivo: `arari-app/api/salary_parser.py`
- Método: `_scan_dynamic_zone_for_employee` (líneas 540-597)
- Ahora extrae días de la columna 'days' (mismo row que 有給/有給休暇)

```python
# salary_parser.py - _scan_dynamic_zone_for_employee
days_col = base_col + offsets.get('days', 5)  # Column for days

result = {
    'paid_leave_amount': 0.0,
    'paid_leave_days': 0.0,  # ← NUEVO
    ...
}

# Cuando encuentra 有給/有給休暇:
elif category == 'paid_leave_amount':
    result['paid_leave_amount'] += value
    # Extraer días de la misma fila, columna diferente
    days_value = self._get_numeric(ws, row, days_col)
    if days_value > 0:
        result['paid_leave_days'] += days_value  # ← NUEVO
```

#### Problema 5: 60H超残業 horas no se calculaban automáticamente
**Síntoma**: Algunos empleados con overtime > 60h no mostraban las horas extra correctamente.
**Causa**: El parser no calculaba automáticamente overtime_over_60h cuando no aparecía explícitamente.
**Solución**:
- Archivo: `arari-app/api/salary_parser.py`
- Método: `_extract_employee_data` (línea ~750)

```python
# Si overtime > 60 y no hay overtime_over_60h explícito, calcularlo
if overtime_hours > 60 and overtime_over_60h <= 0:
    overtime_over_60h = overtime_hours - 60
    overtime_hours = 60  # Las primeras 60h son overtime normal
```

#### Problema 6: 通勤費 se contaba DOBLE (transport + non_billable)
**Síntoma**: 通勤手当 y 非請求手当 mostraban el mismo valor (¥5,100).
**Causa**: `通勤費` aparecía en DOS listas del parser:
  - `FIELD_PATTERNS['transport_allowance']` → se detectaba como campo fijo
  - `DYNAMIC_ZONE_LABELS['通勤費']` → se procesaba como non_billable
**Solución**:
- Archivo: `arari-app/api/salary_parser.py`
- Removido `通勤費` de FIELD_PATTERNS['transport_allowance'] (línea ~75)
- Agregado `通勤費` a KNOWN_ALLOWANCES (línea ~105)

```python
# salary_parser.py - ANTES (línea 75)
'transport_allowance': ['通勤費', '交通費', '通勤手当'],

# salary_parser.py - DESPUÉS (línea 75-77)
# NOTE: 通勤費 is now ONLY in DYNAMIC_ZONE_LABELS as 'non_billable'
# This prevents duplicate counting (transport + non_billable)
'transport_allowance': ['交通費', '通勤手当'],  # 通勤費 removed

# También agregado a KNOWN_ALLOWANCES:
KNOWN_ALLOWANCES = [
    ...
    '通勤費',  # Added - now handled as non_billable in dynamic zone
]
```

#### Problema 7: recalculate_margins.py también duplicaba paid_leave_cost
**Síntoma**: Después de ejecutar recalculate_margins.py, 会社総コスト seguía incorrecto.
**Causa**: El script también sumaba paid_leave_cost (líneas 182-204).
**Solución**:
- Archivo: `arari-app/api/recalculate_margins.py`
- Eliminado paid_leave_cost del cálculo de total_company_cost

```python
# recalculate_margins.py - CÓDIGO CORRECTO (líneas 197-204)
total_company_cost = (
    gross_salary +
    company_social_insurance +
    company_employment_insurance +
    company_workers_comp
    # ❌ NO paid_leave_cost - ya está en gross_salary!
)
```

#### Problema 8: database.py agregaba paid_leave_cost en test data
**Síntoma**: Datos de prueba tenían cálculos incorrectos.
**Causa**: El método de generación de datos de prueba sumaba paid_leave_cost.
**Solución**:
- Archivo: `arari-app/api/database.py` (líneas 260-265)
- Corregido para no duplicar paid_leave_cost

#### Problema 9: 通勤手当(非) con paréntesis ASCII no se detectaba
**Síntoma**: El Excel usa `通勤手当(非)` con paréntesis ASCII (半角), pero el parser solo tenía la versión con paréntesis full-width (全角).
**Causa**: `NON_BILLABLE_ALLOWANCES` y `DYNAMIC_ZONE_LABELS` solo tenían `通勤手当（非）` con 全角 brackets.
**Solución**:
- Archivo: `arari-app/api/salary_parser.py`
- Agregado `通勤手当(非)` (半角 brackets) a ambas listas

```python
# salary_parser.py - NON_BILLABLE_ALLOWANCES (líneas 110-118)
NON_BILLABLE_ALLOWANCES = [
    '通勤手当',        # Transport allowance
    '通勤手当（非）',   # Transport allowance (non-taxable) - 全角 brackets
    '通勤手当(非)',    # Transport allowance (non-taxable) - 半角 brackets ← NUEVO
    '通勤費',          # Transport cost
    '業務手当',        # Work allowance
]

# salary_parser.py - DYNAMIC_ZONE_LABELS (líneas 177-180)
DYNAMIC_ZONE_LABELS = {
    ...
    '通勤手当(非)': 'non_billable',   # 半角 brackets ← YA ESTABA
    '通勤手当（非）': 'non_billable', # 全角 brackets
    ...
}
```

**Importante para futuras IAs**: El Excel de 給与明細 **siempre** usa `通勤手当(非)` con paréntesis ASCII (半角), no con paréntesis japoneses (全角). Ambas variantes deben estar en las listas del parser.

### Resumen de Archivos Modificados (2025-12-10)

| Archivo | Cambio | Líneas |
|---------|--------|--------|
| `salary_parser.py` | Agregar welfare_pension a FALLBACK_ROW_POSITIONS | ~120 |
| `salary_parser.py` | Extraer paid_leave_days del dynamic zone | 540-597 |
| `salary_parser.py` | Auto-calcular overtime_over_60h | ~750 |
| `salary_parser.py` | Remover 通勤費 de transport_allowance (evita duplicación) | 75-77 |
| `salary_parser.py` | Agregar 通勤費 a KNOWN_ALLOWANCES | ~105 |
| `salary_parser.py` | Agregar 通勤手当(非) 半角 a NON_BILLABLE_ALLOWANCES | 110-118 |
| `services.py` | Incluir welfare_pension en company_social_insurance | 298-301 |
| `services.py` | Eliminar paid_leave_cost duplicado | 331-336 |
| `recalculate_margins.py` | Eliminar paid_leave_cost de total_company_cost | 197-204 |
| `database.py` | Eliminar paid_leave_cost de cálculo de test data | 260-265 |
| `PayrollSlipModal.tsx` | Mostrar 厚生年金 en 控除の部 y 法定福利費 | 303-308, 556-560 |

### Base de Datos Limpiada (2025-12-10)
```sql
-- Se eliminaron todos los registros para forzar re-parseo con código correcto
DELETE FROM payroll_records;
DELETE FROM factory_templates;
```
**Acción requerida**: Subir Excel nuevamente en `/upload`

### Verificación de Fixes

Para verificar que los fixes funcionan correctamente después de subir Excel:

1. **通勤手当 y 非請求手当 NO deben tener el mismo valor**
   - Si Excel tiene `通勤費` (no `通勤手当`), entonces:
     - `transport_allowance` = 0 (correcto)
     - `non_billable_allowances` = valor de 通勤費 (correcto)

2. **会社総コスト debe cumplir esta fórmula:**
   ```
   会社総コスト = 総支給額 + 健康保険(会社) + 厚生年金(会社) + 雇用保険(0.90%) + 労災保険(0.30%)
   ```
   - NO debe incluir paid_leave_cost (ya está en 総支給額)
   - NO debe incluir transport_allowance (ya está en 総支給額)

3. **有給日数 debe mostrar días cuando 有給金額 > 0**
   - El parser ahora extrae días de la columna 'days' en la zona dinámica

---

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

3. **Error 404 en /api/statistics** (SOLUCIONADO 2025-12-10):
   - Causa: `Sidebar.tsx:118` usaba `fetch('/api/statistics')` (relativo)
   - Esto llamaba a `localhost:3000` (Next.js) en lugar de `localhost:8000` (FastAPI)
   - Solución: Cambiado a `fetch('http://localhost:8000/api/statistics')`
   - Archivo corregido: `arari-app/src/components/layout/Sidebar.tsx`

4. **Horas extras calculadas incorrectamente** (SOLUCIONADO 2025-12-10):
   - **Problema**: Si overtime_hours = 73, se mostraba 73h en 残業 + 13h en 60H超過 = 86h total (incorrecto)
   - **Correcto**: 残業 máximo 60h + 60H超過 13h = 73h total
   - **Solución**: En `salary_parser.py`, después de calcular overtime_over_60h, cap overtime_hours a 60:
     ```python
     overtime_over_60h = max(0, overtime_hours - 60) if overtime_hours > 60 else 0
     overtime_hours = min(overtime_hours, 60)  # Cap at 60
     ```
   - **Archivo**: `arari-app/api/salary_parser.py:683-685`

5. **Minutos de horas no se parseaban** (SOLUCIONADO 2025-12-10):
   - **Problema**: Excel tiene horas en columna 4 y minutos en columna 10 (73h 30m), pero solo se leía la columna de horas (73h)
   - **Solución**: Nueva función `_get_hours_with_minutes()` que lee ambas columnas y convierte a decimal
   - **Lógica inteligente**: Si el valor ya tiene decimales (13.5), no suma minutos; si es entero (73), busca minutos
   - **Archivo**: `arari-app/api/salary_parser.py:799-839`

6. **Orden de meses incorrecto** (SOLUCIONADO 2025-12-10):
   - **Problema**: 2025年10月 aparecía después de 2025年2月 (ordenamiento alfabético "10" < "2")
   - **Solución**: Nueva función `comparePeriods()` en utils.ts que parsea año y mes para ordenar numéricamente
   - **Archivos corregidos**:
     - `arari-app/src/lib/utils.ts` (nueva función)
     - `arari-app/src/app/employees/[id]/page.tsx`
     - `arari-app/src/components/employees/EmployeeDetailModal.tsx`

## Reglas de Cálculo Importantes

### Horas Extras (残業)
```
Si overtime_hours_raw > 60:
    overtime_hours = 60 (máximo)
    overtime_over_60h = overtime_hours_raw - 60
Else:
    overtime_hours = overtime_hours_raw
    overtime_over_60h = 0

# Ejemplo: 73.5h de overtime
# → overtime_hours = 60h (×1.25)
# → overtime_over_60h = 13.5h (×1.5)
```

### Formato de Horas en Excel
El Excel puede tener TRES formatos:
1. **Columnas separadas**: Horas en col 4, Minutos en col 10 → Se convierte a decimal
   - Ejemplo: 73h en col 4, 30m en col 10 → 73.5h
2. **Decimal directo**: Ya viene como 13.5 en una celda → Se usa tal cual
3. **Minutos totales (プレテック)**: Horas=0, Minutos=total en minutos
   - Ejemplo: 0h en col 4, 10080m en col 10 → 168h (10080÷60)
   - Detectado automáticamente cuando hours=0 y minutes>=60

### 2025-12-10: Integración de ChinginGenerator Labels (Parser v4.1)

Se integraron las mejores características del parser `ChinginGenerator-v4-PRO` para mejorar la detección de campos:

#### Mejoras Integradas:

1. **FIELD_PATTERNS ampliado** (~25 → ~50 labels):
   - **Días**: Agregados `労働日数`, `日数` (work_days), `欠勤日数`, `欠勤` (absence_days - NUEVO)
   - **Horas**: Agregados `実働時`, `所定時間外`, `時間外労働`, `深夜労働時間`, `休日労働`
   - **Salario**: Agregados `基　本　給` (con espacios japoneses), `給与`, `普通残業`, `普通残業手当`, `深夜残業`, `休日勤務`
   - **Transporte**: Agregados `ガソリン`, `ガソリン代`
   - **Vacaciones**: Agregados `有給休暇`, `有休手当`
   - **Deducciones**: Agregados `健康保険料`, `雇用保険料`, `社保計`, `社会保険計`, `社会保険料計`, `源泉所得税`
   - **NUEVAS deducciones**: `家賃`, `寮費` (rent), `水道光熱`, `光熱費`, `電気代` (utilities), `前貸`, `前借` (advance), `弁当`, `弁当代`, `食事代`, `食事` (meal), `年調過不足`, `年末調整` (year-end)
   - **Totales**: Agregados `合　　計`, `控除合計`, `控除計`, `差引支給`

2. **DYNAMIC_ZONE_LABELS ampliado** (~20 → ~45 labels):
   - **Non-billable**: Agregados `ガソリン`, `ガソリン代` (movidos de other_allowance)
   - **Other allowances**: Agregados `皆勤賞`, `役職手当`, `資格手当`, `特別手当`, `調整手当`
   - **NUEVAS categorías de deducciones en zona dinámica**:
     - `rent_deduction`: 家賃, 寮費
     - `utilities`: 水道光熱, 光熱費, 電気代
     - `advance_payment`: 前貸, 前借
     - `meal_deduction`: 弁当, 弁当代, 食事代, 食事
     - `year_end_adjustment`: 年調過不足, 年末調整

3. **Nueva función `_normalize_label()`**:
   - Normaliza labels para comparación consistente
   - Maneja espacios japoneses (全角) y normales
   - Remueve paréntesis y contenido (ej: `通勤手当（非）` → `通勤手当`)
   - Remueve caracteres de formato japonés (・, ･)

#### Archivos Modificados:
| Archivo | Cambio |
|---------|--------|
| `salary_parser.py` | FIELD_PATTERNS ampliado (~líneas 61-100) |
| `salary_parser.py` | DYNAMIC_ZONE_LABELS ampliado (~líneas 173-227) |
| `salary_parser.py` | Nueva función `_normalize_label()` (~líneas 553-572) |
| `salary_parser.py` | `_scan_dynamic_zone_for_employee()` actualizado para nuevas categorías |

#### Beneficios:
- Mejor detección de campos en Excel con variantes de labels
- Soporte para más tipos de deducciones
- Detección más robusta de transporte (ガソリン ahora → non_billable)
- Mejor manejo de espacios japoneses en labels

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

## Verificación de Cálculos (Ejemplo: WATANABE 240321)

Después de subir el Excel, los valores esperados para el empleado 240321 son:

| Campo | Valor Excel | Debe aparecer en App |
|-------|-------------|----------------------|
| 総支給額 | ¥238,975 | ✓ grossSalary |
| 健康保険 (本人) | ¥19,057 | ✓ socialInsurance |
| 厚生年金 (本人) | ¥34,770 | ✓ welfarePension |
| 健康保険 (会社) | ¥19,057 | = socialInsurance (労使折半) |
| 厚生年金 (会社) | ¥34,770 | = welfarePension (労使折半) |
| 雇用保険 (会社) | ~¥2,151 | grossSalary × 0.90% |
| 労災保険 (会社) | ~¥717 | grossSalary × 0.30% |

**Cálculo esperado de 会社総コスト:**
```
会社総コスト = 238,975 (総支給額)
            + 19,057 (健康保険 会社)
            + 34,770 (厚生年金 会社)
            + 2,151 (雇用保険 0.90%)
            + 717 (労災保険 0.30%)
            = ¥295,670
```

**UI debe mostrar en 粗利分析 > 法定福利費:**
- 健康保険 (会社分): ¥19,057
- 厚生年金 (会社分): ¥34,770
- 雇用保険 (0.90%): ¥2,151
- 労災保険 (0.3%): ¥717
- **Total 法定福利費**: ¥56,695

---

### 2025-12-11: MEJORAS MAYORES - Seguridad, Nuevas Páginas, Campos de Empleado

#### 1. Nuevos Campos de Empleado (社員台帳 Parser)

**Campos agregados al parser de empleados:**

| Campo | Descripción | Labels detectados |
|-------|-------------|-------------------|
| `gender` | 性別 (Sexo) | gender, 性別, sex, 男女, 男/女 |
| `birth_date` | 生年月日 (Fecha nacimiento) | birth_date, 生年月日, birthday, 誕生日, 生日, dob |
| `termination_date` | 退社日 (Fecha baja) | termination_date, 退社日, 退職日, resignation_date, end_date |

**Archivos modificados:**
```python
# employee_parser.py - EmployeeRecord dataclass
@dataclass
class EmployeeRecord:
    employee_id: str
    name: str
    # ... campos existentes ...
    gender: Optional[str] = None          # 性別: 男/女 or M/F
    birth_date: Optional[str] = None      # 生年月日
    termination_date: Optional[str] = None  # 退社日

# Nuevos métodos helper:
def _map_gender(self, value: str) -> str:
    """Normaliza género a M/F"""

def _format_date(self, value: Any) -> Optional[str]:
    """Convierte fecha a YYYY-MM-DD"""
```

**Base de datos - nuevas columnas:**
```sql
ALTER TABLE employees ADD COLUMN gender TEXT;
ALTER TABLE employees ADD COLUMN birth_date TEXT;
ALTER TABLE employees ADD COLUMN termination_date TEXT;
```

**Auto-detección de estado:**
- Si `termination_date` tiene valor → `status` = 'inactive'

---

#### 2. Nuevos Campos de Nómina (Deducciones)

**Campos agregados a payroll_records:**

| Campo | Descripción |
|-------|-------------|
| `rent_deduction` | 家賃/寮費 (Alquiler/Dormitorio) |
| `utilities_deduction` | 水道光熱費 (Servicios) |
| `meal_deduction` | 弁当代/食事代 (Comidas) |
| `advance_payment` | 前貸/前借 (Adelantos) |
| `year_end_adjustment` | 年末調整 (Ajuste fin de año) |
| `absence_days` | 欠勤日数 (Días de ausencia) |

**Base de datos:**
```sql
ALTER TABLE payroll_records ADD COLUMN rent_deduction REAL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN utilities_deduction REAL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN meal_deduction REAL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN advance_payment REAL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN year_end_adjustment REAL DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN absence_days INTEGER DEFAULT 0;
```

---

#### 3. Correcciones de Seguridad (CRÍTICAS)

##### SQL Injection en search.py (CORREGIDO)
**Problema**: LIMIT y OFFSET se concatenaban sin sanitizar
```python
# ANTES (vulnerable):
sql += f" LIMIT {page_size} OFFSET {offset}"

# DESPUÉS (seguro):
page = max(1, min(page, 10000))      # Cap page at 10000
page_size = max(1, min(page_size, 500))  # Cap page_size at 500
offset = (page - 1) * page_size
sql += " LIMIT ? OFFSET ?"
params.extend([page_size, offset])
```

##### Path Traversal en backup.py (CORREGIDO)
**Problema**: Nombres de archivo no se validaban
```python
# Nueva función de validación
def validate_backup_filename(filename: str, backup_dir: Path) -> Optional[Path]:
    """Previene ataques de path traversal"""
    if '/' in filename or '\\' in filename or '..' in filename:
        return None
    if not filename.endswith('.db'):
        return None
    if not re.match(r'^[a-zA-Z0-9_\-\.]+$', filename):
        return None
    backup_path = backup_dir / filename
    resolved_path = backup_path.resolve()
    resolved_backup_dir = backup_dir.resolve()
    if not str(resolved_path).startswith(str(resolved_backup_dir)):
        return None
    return backup_path
```

##### Path Hardcodeado Removido
**Archivo**: `salary_parser.py`
**Problema**: Línea 506 tenía path de Windows hardcodeado para debug
**Solución**: Eliminado completamente

---

#### 4. Nuevas Páginas Frontend

##### /alerts - Gestión de Alertas
**Archivo**: `arari-app/src/app/alerts/page.tsx`

**Características:**
- Dashboard con estadísticas (críticas, warnings, resueltas)
- Filtros por estado (activo/resuelto) y severidad
- Botón para escanear nuevas alertas
- Resolución individual de alertas
- Integración con API `/api/alerts`

**Tipos de alertas soportadas:**
| Tipo | Descripción |
|------|-------------|
| LOW_MARGIN | Margen bajo (<15%) |
| NEGATIVE_MARGIN | Margen negativo (pérdida) |
| EXCESSIVE_HOURS | Horas excesivas |
| MISSING_DATA | Datos incompletos |
| RATE_MISMATCH | Discrepancia de tarifas |
| OVERTIME_THRESHOLD | Overtime > 60h |

##### /budgets - Control de Presupuestos
**Archivo**: `arari-app/src/app/budgets/page.tsx`

**Características:**
- Crear presupuestos por período/派遣先
- Comparación Budget vs Actual
- Indicadores visuales de desviación
- Tracking de estado (en progreso, completado, excedido)

##### /login - Página de Login (PREPARADA, NO ACTIVA)
**Archivo**: `arari-app/src/app/login/page.tsx`

**Estado**: Creada pero NO conectada a navegación
**Para activar en el futuro:**
1. Agregar middleware de protección de rutas
2. Conectar con auth context/store
3. Agregar link en Header o redirect

**Backend endpoints existentes (auth.py):**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Usuario actual
- `POST /api/auth/register` - Registro (admin only)

**Credenciales por defecto (CAMBIAR EN PRODUCCIÓN):**
- Usuario: `admin`
- Password: `admin123`

---

#### 5. Fixes de Navegación

**Sidebar.tsx actualizado:**
- Agregado enlace a /alerts (アラート管理)
- Agregado enlace a /budgets (予算管理)
- Corregido fetch de /api/statistics para usar puerto 8000

---

#### 6. Correcciones de profit_distribution

**Archivo**: `services.py`
**Problema**: Rangos de margen estaban configurados para 25% (oficina) en lugar de 15% (製造派遣)

```python
# ANTES (incorrecto para 製造派遣):
ranges = [
    ("<15%", ..., 15),
    ("15-20%", 15, 20),
    ("20-25%", 20, 25),
    (">25%", 25, ...),
]

# DESPUÉS (correcto para 製造派遣):
ranges = [
    ("<10%", -999999999, 10),   # Critical
    ("10-15%", 10, 15),         # Below target
    ("15-18%", 15, 18),         # On target
    (">18%", 18, 999999999),    # Excellent
]
```

---

#### 7. API Port Unificado

**Problema**: Algunos archivos frontend usaban puerto 8765 o relativo
**Solución**: Todos los archivos ahora usan `http://localhost:8000`

**Archivos corregidos:**
- `templates/page.tsx`
- `settings/page.tsx`
- `dashboard/page.tsx`
- `page.tsx`
- `reports/page.tsx` (también implementado descarga real)

---

#### 8. Análisis de Conexión Frontend-Backend (2025-12-11)

**Resultado de tests:**
- ❌ Backend NO estaba corriendo (puerto 8000 sin proceso)
- ✅ Todos los puertos de API en frontend son correctos (8000)
- ⚠️ 9 archivos con API_URL hardcodeado (funcional pero no ideal)
- ⚠️ No existe archivo .env para configuración

**Archivos con API hardcodeada (no usan api.ts centralizado):**
| Archivo | Línea |
|---------|-------|
| `page.tsx` | 60 |
| `dashboard/page.tsx` | 60 |
| `Sidebar.tsx` | 125 |
| `settings/page.tsx` | 33 |
| `login/page.tsx` | 38 |
| `alerts/page.tsx` | 25 |
| `reports/page.tsx` | 25 |
| `budgets/page.tsx` | 28 |
| `templates/page.tsx` | 29 |

**Recomendación futura**: Crear `.env.local` con `NEXT_PUBLIC_API_URL` y centralizar configuración.

---

### Resumen de Archivos Modificados (2025-12-11)

| Archivo | Cambio |
|---------|--------|
| `employee_parser.py` | Agregar gender, birth_date, termination_date |
| `database.py` | Nuevas columnas employees y payroll_records |
| `models.py` | EmployeeBase con campos nuevos |
| `services.py` | create/update employee, profit_distribution ranges |
| `main.py` | Actualizar imports de employee |
| `search.py` | Fix SQL injection (LIMIT/OFFSET parametrizados) |
| `backup.py` | Fix path traversal (validate_backup_filename) |
| `salary_parser.py` | Remover path hardcodeado |
| `Sidebar.tsx` | Navegación a /alerts y /budgets |
| `alerts/page.tsx` | NUEVA - Gestión de alertas |
| `budgets/page.tsx` | NUEVA - Control de presupuestos |
| `login/page.tsx` | NUEVA - Login (no activa) |
| `reports/page.tsx` | Descarga real implementada |
| Varios frontend | Port 8765 → 8000 |

---

---

### 2025-12-11: MEJORAS UI/UX/ACCESIBILIDAD (Fase 2)

#### Análisis de Agentes Especializados

Se ejecutaron 3 agentes expertos para analizar el frontend:

| Agente | Área | Score | Hallazgos Clave |
|--------|------|-------|-----------------|
| **UI Expert** | Diseño Visual | 6.8/10 | Glassmorphism bueno, PayrollSlipModal muy largo |
| **UX Expert** | Experiencia | 6.8/10 | Nielsen 6.8/10, accesibilidad 2.5/10 |
| **Frontend Trends** | Modernización | 6.4/10 | Falta Server Components, TanStack Query |

#### 1. Configuración de Entorno (.env.local)

**Archivo creado**: `arari-app/.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_ENABLE_AUTH=false
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

**Beneficio**: Centraliza configuración de API, permite diferentes entornos (dev/staging/prod)

---

#### 2. Mejoras de Accesibilidad (WCAG 2.1 AA)

##### Skip-to-Main Link
**Archivo**: `arari-app/src/app/layout.tsx`
```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4..."
>
  メインコンテンツへスキップ
</a>
```

##### Aria Labels en Header
**Archivo**: `arari-app/src/components/layout/Header.tsx`
- Botón menú: `aria-label="メニューを開く"`
- Botón notificaciones: `aria-label={notificationCount件の通知}`
- Botón tema: `aria-label="ライトモードに切り替え"`
- Botón settings: `aria-label="設定を開く"`
- Iconos: `aria-hidden="true"`

##### Aria Labels en Sidebar
**Archivo**: `arari-app/src/components/layout/Sidebar.tsx`
- Nav: `aria-label="メインナビゲーション"`
- Botón colapsar: `aria-label="サイドバーを折りたたむ"` + `aria-expanded`

##### Modal Accesible
**Archivo**: `arari-app/src/components/employees/EmployeeDetailModal.tsx`
```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="employee-modal-title"
  onKeyDown={(e) => e.key === 'Escape' && onClose()}
>
```

##### Tabla Accesible
```tsx
<table role="table" aria-label="給与明細履歴">
  <th scope="col">期間</th>
  <th scope="col">勤務日数</th>
  ...
</table>
```

---

#### 3. Error Boundaries y Loading States

##### Error Boundary Global
**Archivo**: `arari-app/src/app/error.tsx`
- Captura errores no manejados
- Muestra mensaje en japonés: "エラーが発生しました"
- Botón "もう一度試す" para retry
- Muestra error ID para debugging

##### Loading State Global
**Archivo**: `arari-app/src/app/loading.tsx`
- Spinner animado con Framer Motion
- Mensaje: "読み込み中..."
- Skeleton placeholders
- `aria-live="polite"` para screen readers

---

#### 4. Sistema de Toast Notifications

**Paquete**: `react-hot-toast` v2.4.1

**Provider**: `arari-app/src/components/ui/toast-provider.tsx`

**Uso**:
```tsx
import toast from 'react-hot-toast'

// Success
toast.success('保存しました')

// Error
toast.error('エラーが発生しました')

// Loading
toast.loading('処理中...')
```

**Configuración**:
- Posición: top-right (debajo del header)
- Duración: 4s default, 3s success, 5s error
- Estilos: Consistentes con tema dark/light

---

#### 5. ChartTooltip Compartido

**Archivo**: `arari-app/src/components/charts/ChartTooltip.tsx`

**Componentes exportados**:
- `ChartTooltip` - Tooltip base reutilizable
- `EmployeeTooltipContent` - Para ranking de empleados
- `MonthlyTrendTooltipContent` - Para tendencias mensuales
- `FactoryTooltipContent` - Para comparación de fábricas

**Helpers**:
- `getMarginColor(margin)` - Color según % margen (15% target)
- `getProfitColor(profit)` - Verde si positivo, rojo si negativo

**Uso**:
```tsx
import { EmployeeTooltipContent } from '@/components/charts/ChartTooltip'

<Tooltip content={<EmployeeTooltipContent />} />
```

---

#### 6. Archivos Creados/Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `.env.local` | NUEVO | Configuración de entorno |
| `error.tsx` | NUEVO | Error boundary global |
| `loading.tsx` | NUEVO | Loading state global |
| `toast-provider.tsx` | NUEVO | Provider de toasts |
| `ChartTooltip.tsx` | NUEVO | Tooltip compartido para charts |
| `layout.tsx` | MODIFICADO | Skip link + ToastProvider |
| `Header.tsx` | MODIFICADO | Aria labels en botones |
| `Sidebar.tsx` | MODIFICADO | Aria labels + env variable API |
| `EmployeeDetailModal.tsx` | MODIFICADO | role=dialog, aria-modal, scope=col |
| `package.json` | MODIFICADO | Agregado react-hot-toast |

---

#### 7. Mejoras Pendientes (Recomendadas)

| Tarea | Prioridad | Esfuerzo | Estado |
|-------|-----------|----------|--------|
| ~~Dividir PayrollSlipModal (904 líneas)~~ | Alta | 4-6h | ✅ COMPLETADO |
| ~~Agregar useMemo a cálculos de charts~~ | Media | 2h | ✅ COMPLETADO |
| Migrar a Server Components | Media | 8-10h | Pendiente |
| Agregar TanStack Query | Media | 6-8h | Pendiente |
| Completar aria-labels en todas las páginas | Alta | 2h | Pendiente |

---

### 2025-12-11: REFACTORIZACIÓN Y OPTIMIZACIÓN (Fase 3)

#### 1. División de PayrollSlipModal (904 → ~200 líneas por archivo)

El componente monolítico de 904 líneas fue dividido en sub-componentes mantenibles:

| Archivo | Descripción | Líneas |
|---------|-------------|--------|
| `PayrollSlipModal.tsx` | Modal principal (refactorizado) | ~200 |
| `SalaryDetailsColumn.tsx` | Column 1: 給与支給明細 | ~300 |
| `BillingCalculationColumn.tsx` | Column 2: 請求金額計算 | ~200 |
| `ProfitAnalysisColumn.tsx` | Column 3: 粗利分析 | ~250 |
| `PayrollSlipHelpers.tsx` | Helpers: DetailRow, DeductionRow, BillingRow | ~150 |
| `index.ts` | Exports centralizados | ~25 |

**Ubicación**: `arari-app/src/components/payroll/`

**Beneficios**:
- Mejor organización del código
- Componentes reutilizables
- Más fácil de mantener y testear
- Separación de responsabilidades

**Uso**:
```tsx
import { PayrollSlipModal } from '@/components/payroll'
// O importar helpers individuales:
import { DetailRow, DeductionRow, getMarginColors } from '@/components/payroll'
```

---

#### 2. Optimización con useMemo en Charts

Se agregaron optimizaciones de rendimiento usando `useMemo` para prevenir re-cálculos innecesarios:

| Componente | Optimización |
|------------|--------------|
| `EmployeeRankingChart.tsx` | Memoización de `topData` y `bottomData` sorting |
| `MonthlyTrendChart.tsx` | Memoización de sorting cronológico, totals, y chartData |
| `FactoryComparisonChart.tsx` | Memoización de sorting por profit y cálculos de totales |
| `MonthlySummaryTable.tsx` | Memoización de sorting, month-over-month changes, y totales |
| `BillingCalculationColumn.tsx` | Memoización de cálculos de billing |
| `ProfitAnalysisColumn.tsx` | Memoización de cálculos de profit y margins |

**Ejemplo de cambio**:
```tsx
// ANTES (recalcula en cada render)
const sortedData = [...data].sort((a, b) => b.profit - a.profit)

// DESPUÉS (solo recalcula cuando data cambia)
const sortedData = useMemo(() =>
  [...data].sort((a, b) => b.profit - a.profit),
  [data]
)
```

---

#### 3. Archivos Creados/Modificados

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `PayrollSlipModal.tsx` | REFACTORIZADO | Reducido a ~200 líneas |
| `SalaryDetailsColumn.tsx` | NUEVO | Column 1 extraído |
| `BillingCalculationColumn.tsx` | NUEVO | Column 2 extraído |
| `ProfitAnalysisColumn.tsx` | NUEVO | Column 3 extraído |
| `PayrollSlipHelpers.tsx` | NUEVO | Helpers compartidos |
| `index.ts` | NUEVO | Exports module |
| `EmployeeRankingChart.tsx` | MODIFICADO | useMemo agregado |
| `MonthlyTrendChart.tsx` | MODIFICADO | useMemo agregado |
| `FactoryComparisonChart.tsx` | MODIFICADO | useMemo agregado |
| `MonthlySummaryTable.tsx` | MODIFICADO | useMemo agregado |

---

**Última actualización**: 2025-12-11 (Refactorización Phase 3)
**Estado**: Sistema optimizado con PayrollSlipModal dividido en sub-componentes y charts con useMemo para mejor rendimiento
