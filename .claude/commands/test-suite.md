# Test Suite Skill

Ejecuta, analiza y mejora los tests de Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Ejecutar Tests**:
   - Backend: `cd arari-app/api && python -m pytest tests/ -v`
   - Frontend: `cd arari-app && npm test`
   - Reportar resultados

2. **Analizar Coverage**:
   - Identificar áreas sin cobertura
   - Priorizar tests críticos faltantes
   - Calcular % de cobertura

3. **Mejorar Tests**:
   - Añadir tests para bugs conocidos
   - Cubrir edge cases
   - Mejorar assertions

4. **Generar Reporte**:
   - Tests pasados/fallidos
   - Cobertura por módulo
   - Recomendaciones

## Uso

```
/test-suite [area] [--coverage] [--fix]
```

Areas:
- `backend` - Tests Python (pytest)
- `frontend` - Tests JavaScript (Jest)
- `all` - Todos los tests (default)

Flags:
- `--coverage` - Generar reporte de cobertura
- `--fix` - Corregir tests fallidos

## Tests Existentes (Backend)

```
arari-app/api/tests/
├── conftest.py                     # Fixtures
├── test_salary_calculations.py     # 48+ tests críticos
├── test_business_rules.py          # Reglas de negocio
├── test_api_endpoints.py           # Endpoints REST
├── test_login.py                   # Autenticación
├── test_main.py                    # Tests generales
└── test_reset_db.py                # Reset de BD
```

## Tests Críticos de Negocio

### Billing Amount
```python
def test_billing_basic_hours():
    # 168h × 1700 = 285,600

def test_billing_overtime_under_60h():
    # + (40h × 1700 × 1.25)

def test_billing_overtime_over_60h():
    # Split: 60h @1.25× + rest @1.5×

def test_billing_night_hours_extra():
    # Night = +0.25× EXTRA (not replacement)

def test_billing_holiday_hours():
    # Holiday = ×1.35
```

### Company Costs
```python
def test_company_cost_no_double_paid_leave():
    # paid_leave YA en gross_salary

def test_company_social_insurance_split():
    # 50/50 employee/company

def test_employment_insurance_rate_2025():
    # 0.90% (not 0.95%)

def test_workers_comp_manufacturing():
    # 0.30%
```

### Profit Margin
```python
def test_margin_calculation():
    # margin = (profit / billing) × 100

def test_margin_tiers():
    # <7%: critical, 7-10%: warning, 10-12%: good, ≥12%: excellent
```

## Fixture Recomendadas

```python
# conftest.py
@pytest.fixture
def sample_employee():
    return Employee(
        employee_id="TEST001",
        name="テスト太郎",
        hourly_rate=1200,
        billing_rate=1800,
        dispatch_company="テスト株式会社",
    )

@pytest.fixture
def sample_payroll():
    return PayrollRecord(
        employee_id="TEST001",
        period="2025年1月",
        work_hours=168,
        overtime_hours=20,
        gross_salary=220000,
        billing_amount=330000,
    )
```

## Comandos de Test

```bash
# Backend - todos los tests
cd arari-app/api
python -m pytest tests/ -v

# Backend - con coverage
python -m pytest tests/ -v --cov=. --cov-report=html

# Backend - solo cálculos
python -m pytest tests/test_salary_calculations.py -v

# Frontend - todos
cd arari-app
npm test

# Frontend - watch mode
npm test -- --watch
```

## Output

Genera reporte con:
- Total tests: passed/failed/skipped
- Coverage por archivo
- Tests críticos faltantes
- Recomendaciones de mejora
