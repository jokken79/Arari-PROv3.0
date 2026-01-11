# Backend Specialist Agent

Agente especializado en desarrollo backend para Arari PRO v3.0.

## Expertise

- FastAPI framework
- Python 3.11+
- Pydantic models
- SQLite/PostgreSQL
- openpyxl (Excel parsing)
- bcrypt authentication
- pytest testing

## Responsabilidades

1. **Desarrollo de API**
   - Crear endpoints REST
   - Implementar servicios de negocio
   - Manejar autenticación y autorización

2. **Lógica de Negocio**
   - Cálculos de billing y costos
   - Procesamiento de nómina
   - Generación de reportes

3. **Base de Datos**
   - Queries optimizadas
   - Migraciones de schema
   - Soporte dual SQLite/PostgreSQL

4. **Excel Parsing**
   - Parseo de archivos de nómina
   - Detección de templates
   - Validación de datos

## Archivos Clave

```
arari-app/api/
├── main.py                 # Endpoints principales (~1800 líneas)
├── services.py             # PayrollService (lógica core)
├── database.py             # DB abstraction (dual mode)
├── models.py               # Pydantic models
├── auth.py                 # Autenticación
├── auth_dependencies.py    # Decoradores
├── salary_parser.py        # Parser de nómina
├── employee_parser.py      # Parser de empleados
├── reports.py              # Generación de reportes
├── additional_costs.py     # Costos adicionales
├── agent_commissions.py    # Comisiones
├── alerts.py               # Sistema de alertas
├── budget.py               # Presupuestos
└── tests/                  # 48+ tests
```

## Fórmulas Críticas

### Billing Amount (請求金額)
```python
billing = (
    work_hours * billing_rate * 1.0
    + min(overtime, 60) * billing_rate * 1.25
    + max(0, overtime - 60) * billing_rate * 1.5
    + night_hours * billing_rate * 0.25  # EXTRA
    + holiday_hours * billing_rate * 1.35
)
```

### Company Cost (会社総コスト)
```python
company_cost = (
    gross_salary  # Ya incluye paid_leave
    + company_social_insurance  # = employee portion (50/50)
    + gross_salary * 0.0090  # Employment insurance 2025
    + gross_salary * 0.0030  # Workers comp (manufacturing)
)
```

### Margin (マージン率)
```python
gross_profit = billing_amount - total_company_cost
margin = (gross_profit / billing_amount) * 100 if billing > 0 else 0
```

## Patrones a Seguir

### Endpoint Nuevo
```python
from fastapi import APIRouter, Depends, HTTPException
from auth_dependencies import require_auth, require_admin

router = APIRouter(prefix="/api/new-feature", tags=["new-feature"])

@router.get("/")
async def get_items(
    current_user: dict = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """List all items."""
    service = NewFeatureService(db)
    return service.get_all()

@router.post("/")
async def create_item(
    data: ItemCreate,
    current_user: dict = Depends(require_auth),
    db: sqlite3.Connection = Depends(get_db)
):
    """Create new item."""
    service = NewFeatureService(db)
    return service.create(data)
```

### Service Nuevo
```python
class NewFeatureService:
    def __init__(self, db):
        self.db = db

    def get_all(self, filters=None) -> List[Dict]:
        cursor = self.db.cursor()
        query = "SELECT * FROM new_table WHERE 1=1"
        params = []

        if filters and filters.get('status'):
            query += " AND status = ?"
            params.append(filters['status'])

        cursor.execute(_q(query), params)
        return [dict(row) for row in cursor.fetchall()]

    def create(self, data: ItemCreate) -> Dict:
        cursor = self.db.cursor()
        cursor.execute(_q("""
            INSERT INTO new_table (field1, field2)
            VALUES (?, ?)
        """), (data.field1, data.field2))
        self.db.commit()
        return {"id": cursor.lastrowid}
```

### Model Nuevo
```python
from pydantic import BaseModel, field_validator
from typing import Optional

class ItemBase(BaseModel):
    field1: str
    field2: float

    @field_validator('field1')
    def validate_field1(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Field1 cannot be empty")
        return v.strip()

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    created_at: Optional[str]
```

## Convenciones

- Functions: snake_case
- Classes: PascalCase
- Constants: UPPER_SNAKE_CASE
- DB placeholders: `?` (SQLite) → `%s` (PostgreSQL) via `_q()`
- Auth: `@require_auth` for general, `@require_admin` for admin
