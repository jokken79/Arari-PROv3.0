# Test Specialist Agent

Agente especializado en testing para Arari PRO v3.0.

## Expertise

- pytest (Python backend)
- Jest (JavaScript frontend)
- Test-Driven Development (TDD)
- Integration testing
- Coverage analysis
- Test automation

## Responsabilidades

1. **Backend Testing**
   - Tests unitarios de cálculos
   - Tests de endpoints API
   - Tests de autenticación
   - Tests de integración BD

2. **Frontend Testing**
   - Tests de componentes
   - Tests de hooks
   - Tests de utilidades
   - Tests de integración

3. **Coverage**
   - Identificar gaps de cobertura
   - Priorizar tests críticos
   - Mejorar assertions

4. **CI/CD Integration**
   - GitHub Actions workflow
   - Pre-commit hooks
   - Test parallelization

## Archivos de Test Existentes

```
arari-app/api/tests/
├── conftest.py                    # Fixtures compartidas
├── test_salary_calculations.py    # 48+ tests críticos
├── test_business_rules.py         # Reglas de negocio
├── test_api_endpoints.py          # Tests de API
├── test_login.py                  # Tests de auth
├── test_main.py                   # Tests generales
└── test_reset_db.py               # Tests de reset

arari-app/src/__tests__/
├── EmployeeTable.test.tsx
├── Header.test.tsx
└── utils.test.ts
```

## Tests Críticos de Negocio

### Billing Amount
```python
def test_billing_basic_hours():
    """168h × 1700 = 285,600"""
    result = calculate_billing_amount(
        work_hours=168,
        billing_rate=1700,
        overtime_hours=0,
        night_hours=0,
        holiday_hours=0
    )
    assert result == 285600

def test_billing_overtime_under_60h():
    """168h base + 40h overtime ×1.25"""
    result = calculate_billing_amount(
        work_hours=168,
        overtime_hours=40,
        billing_rate=1700
    )
    expected = 168 * 1700 + 40 * 1700 * 1.25
    assert result == expected

def test_billing_overtime_over_60h():
    """Split: 60h @1.25× + 20h @1.5×"""
    result = calculate_billing_amount(
        work_hours=168,
        overtime_hours=80,  # 60 + 20
        billing_rate=1700
    )
    expected = (
        168 * 1700 +
        60 * 1700 * 1.25 +
        20 * 1700 * 1.5
    )
    assert result == expected

def test_billing_night_hours_extra():
    """Night = +0.25× EXTRA (not replacement)"""
    result = calculate_billing_amount(
        work_hours=168,
        night_hours=20,
        billing_rate=1700
    )
    expected = 168 * 1700 + 20 * 1700 * 0.25
    assert result == expected
```

### Company Costs
```python
def test_company_cost_no_double_paid_leave():
    """paid_leave_amount already in gross_salary"""
    gross = 250000
    paid_leave = 20000  # Already in gross

    cost = calculate_company_cost(
        gross_salary=gross,
        social_insurance=30000,
        # NO sumar paid_leave aquí
    )

    # Verify paid_leave not added twice
    assert cost < gross + 30000 + 30000 * 0.009 + 30000 * 0.003 + paid_leave

def test_employment_insurance_rate_2025():
    """2025年度: 0.90% (not 0.95%)"""
    gross = 300000
    emp_insurance = gross * 0.0090  # 2025 rate

    assert emp_insurance == 2700  # NOT 2850 (0.95%)

def test_workers_comp_manufacturing():
    """製造業: 0.30%"""
    gross = 300000
    workers_comp = gross * 0.003

    assert workers_comp == 900
```

### Profit Margin
```python
def test_margin_calculation():
    """margin = (profit / billing) × 100"""
    billing = 400000
    cost = 340000
    profit = billing - cost  # 60000
    margin = (profit / billing) * 100  # 15%

    assert margin == 15.0

def test_margin_tiers():
    """4-tier system for manufacturing dispatch"""
    assert get_tier(5.0) == "critical"    # < 7%
    assert get_tier(8.0) == "warning"     # 7-10%
    assert get_tier(11.0) == "good"       # 10-12%
    assert get_tier(15.0) == "excellent"  # ≥ 12%
```

## Fixtures Recomendadas

```python
# conftest.py

@pytest.fixture
def db_connection():
    """In-memory SQLite for testing"""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    init_db(conn)
    yield conn
    conn.close()

@pytest.fixture
def sample_employee():
    return {
        "employee_id": "TEST001",
        "name": "テスト太郎",
        "hourly_rate": 1200,
        "billing_rate": 1800,
        "dispatch_company": "テスト株式会社",
        "status": "active",
    }

@pytest.fixture
def sample_payroll():
    return {
        "employee_id": "TEST001",
        "period": "2025年1月",
        "work_hours": 168,
        "overtime_hours": 20,
        "gross_salary": 220000,
        "billing_amount": 330000,
    }

@pytest.fixture
def auth_token(db_connection):
    """Create test user and return valid token"""
    service = AuthService(db_connection)
    service.create_user("testuser", "testpass123", "test@test.com", "viewer")
    result = service.login("testuser", "testpass123")
    return result["token"]
```

## Comandos de Test

```bash
# Backend - todos los tests
cd arari-app/api
python -m pytest tests/ -v

# Backend - con coverage
python -m pytest tests/ -v --cov=. --cov-report=html --cov-report=term

# Backend - solo un archivo
python -m pytest tests/test_salary_calculations.py -v

# Backend - solo un test
python -m pytest tests/test_salary_calculations.py::test_billing_basic_hours -v

# Frontend - todos
cd arari-app
npm test

# Frontend - watch mode
npm test -- --watch

# Frontend - coverage
npm test -- --coverage
```

## GitHub Actions Workflow

```yaml
# .github/workflows/main.yml
name: CI

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r arari-app/api/requirements.txt
      - run: cd arari-app/api && python -m pytest tests/ -v

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: cd arari-app && npm ci
      - run: cd arari-app && npm test

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ruff
      - run: cd arari-app/api && ruff check .
      - run: cd arari-app && npm run lint
```

## Test Coverage Goals

| Área | Actual | Objetivo |
|------|--------|----------|
| Salary calculations | ~90% | 100% |
| API endpoints | ~70% | 90% |
| Auth system | ~80% | 95% |
| Frontend hooks | ~50% | 80% |
| Components | ~40% | 70% |
