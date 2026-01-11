# Schema Migrate Skill

Gestiona migraciones de base de datos para Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Analizar Cambios**:
   - Identificar nuevas columnas necesarias
   - Detectar cambios de tipo
   - Planificar migraciones

2. **Generar Migración**:
   - SQL compatible SQLite/PostgreSQL
   - Rollback script
   - Validación de datos

3. **Aplicar Migración**:
   - Backup previo
   - Ejecutar en transacción
   - Verificar integridad

4. **Documentar**:
   - Actualizar models.py
   - Actualizar database.py
   - Actualizar CLAUDE.md

## Uso

```
/schema-migrate [action] [--dry-run]
```

Actions:
- `status` - Ver estado actual de BD
- `create <name>` - Crear nueva migración
- `apply` - Aplicar migraciones pendientes
- `rollback` - Revertir última migración

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
    gender TEXT,
    birth_date TEXT,
    nationality TEXT,
    termination_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
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
    -- Metadata
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, period)
);
```

## Patrón de Migración

```python
# Función auxiliar (ya existe en database.py)
def _add_column_if_not_exists(cursor, table, col_name, col_type):
    if USE_POSTGRES:
        cursor.execute(f"""
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

# Ejemplo de migración
def migrate_add_new_field(conn):
    cursor = conn.cursor()
    _add_column_if_not_exists(cursor, "employees", "new_field", "TEXT")
    conn.commit()
```

## SQL Dual-Mode

```python
# SQLite placeholder: ?
# PostgreSQL placeholder: %s

def _q(query: str) -> str:
    if USE_POSTGRES:
        return query.replace("?", "%s")
    return query

# Uso
cursor.execute(_q("SELECT * FROM employees WHERE id = ?"), (id,))
```

## Checklist de Migración

- [ ] Backup de BD antes de migrar
- [ ] Script de migración creado
- [ ] Script de rollback creado
- [ ] Probado en SQLite local
- [ ] Probado en PostgreSQL (staging)
- [ ] models.py actualizado
- [ ] database.py actualizado
- [ ] Tests actualizados

## Output

Genera:
- Script SQL de migración
- Script de rollback
- Código Python para aplicar
- Instrucciones de ejecución
