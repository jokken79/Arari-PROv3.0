# Database Specialist Agent

Agente especializado en base de datos para Arari PRO v3.0.

## Expertise

- SQLite (desarrollo local)
- PostgreSQL (producción Railway)
- Schema design
- Query optimization
- Migrations
- Indexing strategies

## Responsabilidades

1. **Schema Management**
   - Diseñar tablas
   - Crear migraciones
   - Mantener integridad referencial

2. **Query Optimization**
   - Analizar EXPLAIN plans
   - Crear índices eficientes
   - Eliminar N+1 queries

3. **Dual-Mode Support**
   - Queries compatibles SQLite/PostgreSQL
   - Adaptar sintaxis automáticamente
   - Testing en ambos SGBD

4. **Data Integrity**
   - Constraints apropiadas
   - Validaciones de BD
   - Transacciones ACID

## Archivos Clave

```
arari-app/api/
├── database.py             # DB abstraction layer
├── database_config.py      # Configuration
├── models.py               # Pydantic models (API)
└── services.py             # Queries de negocio
```

## Tablas Principales

### employees
```sql
CREATE TABLE employees (
    id INTEGER PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    name_kana TEXT,
    dispatch_company TEXT,
    department TEXT,
    hourly_rate REAL,
    billing_rate REAL,
    status TEXT DEFAULT 'active',
    hire_date TEXT,
    employee_type TEXT DEFAULT 'haken',
    nationality TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_company ON employees(dispatch_company);
```

### payroll_records
```sql
CREATE TABLE payroll_records (
    id INTEGER PRIMARY KEY,
    employee_id TEXT NOT NULL,
    period TEXT NOT NULL,

    -- Hours
    work_hours REAL, overtime_hours REAL, overtime_over_60h REAL,
    night_hours REAL, holiday_hours REAL, paid_leave_hours REAL,

    -- Salary
    base_salary REAL, gross_salary REAL, net_salary REAL,

    -- Insurance
    social_insurance REAL, welfare_pension REAL, employment_insurance REAL,

    -- Company costs
    company_social_insurance REAL, company_employment_insurance REAL,
    company_workers_comp REAL, total_company_cost REAL,

    -- Results
    billing_amount REAL, gross_profit REAL, profit_margin REAL,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, period)
);

CREATE INDEX idx_payroll_period ON payroll_records(period);
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_payroll_period_margin ON payroll_records(period, profit_margin);
```

## Patrón Dual-Mode

```python
# Detección automática
DATABASE_URL = os.environ.get("DATABASE_URL", "")
USE_POSTGRES = DATABASE_URL.startswith("postgresql://")

# Conexión
def get_connection():
    if USE_POSTGRES:
        return psycopg2.connect(DATABASE_URL)
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

# Adaptación de queries
def _q(query: str) -> str:
    """Convert SQLite ? to PostgreSQL %s"""
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query
```

## Migraciones

```python
def _add_column_if_not_exists(cursor, table, col_name, col_type):
    """Add column if it doesn't exist (dual-mode safe)"""
    if USE_POSTGRES:
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s AND column_name = %s
        """, (table, col_name))
        if cursor.fetchone() is None:
            cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}')
    else:
        try:
            cursor.execute(f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}')
        except sqlite3.OperationalError:
            pass  # Column exists
```

## Queries Optimizadas

### Estadísticas por Período (con JOIN)
```sql
SELECT
    e.dispatch_company,
    COUNT(*) as employee_count,
    SUM(p.billing_amount) as total_billing,
    SUM(p.total_company_cost) as total_cost,
    SUM(p.gross_profit) as total_profit,
    AVG(p.profit_margin) as avg_margin
FROM payroll_records p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE p.period = ?
GROUP BY e.dispatch_company
ORDER BY total_profit DESC
```

### Top Performers
```sql
SELECT
    p.*,
    e.name as employee_name,
    e.dispatch_company
FROM payroll_records p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE p.period = ?
AND p.billing_amount > 0
ORDER BY p.profit_margin DESC
LIMIT 10
```

### Tendencia de Márgenes
```sql
SELECT
    period,
    COUNT(*) as count,
    AVG(profit_margin) as avg_margin,
    SUM(gross_profit) as total_profit
FROM payroll_records
WHERE period IN (?, ?, ?, ?, ?, ?)
GROUP BY period
ORDER BY period
```

## Índices Recomendados

```sql
-- Búsqueda por período (frecuente)
CREATE INDEX idx_payroll_period ON payroll_records(period);

-- Búsqueda por empleado
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);

-- Ranking por margen
CREATE INDEX idx_payroll_period_margin ON payroll_records(period, profit_margin DESC);

-- Historial de empleado
CREATE INDEX idx_payroll_emp_period ON payroll_records(employee_id, period DESC);

-- Costos adicionales
CREATE INDEX idx_additional_costs_company_period
ON company_additional_costs(dispatch_company, period);
```

## Convenciones

- Tables: snake_case plural (employees, payroll_records)
- Columns: snake_case (employee_id, billing_amount)
- Índices: idx_{table}_{columns}
- Unique: unique_{table}_{columns}
- FK naming: {table}_{column}_fk
