# Migración a FastAPI Routers

## Estado Actual

Se han creado 5 routers modulares en `routers/`:

| Router | Endpoints | Líneas | Estado |
|--------|-----------|--------|--------|
| `employees.py` | 5 | 80 | ✓ Listo |
| `payroll.py` | 3 | 47 | ✓ Listo |
| `statistics.py` | 4 | 49 | ✓ Listo |
| `settings.py` | 5 | 62 | ✓ Listo |
| `additional_costs.py` | 9 | 152 | ✓ Listo |

**Total**: 26 endpoints extraídos (~390 líneas vs 2,326 original)

## Cómo Completar la Migración

### 1. Añadir imports en main.py

```python
# Al inicio de main.py, después de otros imports
from routers import (
    employees_router,
    payroll_router,
    statistics_router,
    settings_router,
    additional_costs_router,
)
```

### 2. Registrar routers (después de CORS middleware)

```python
# ============== Routers ==============
app.include_router(employees_router)
app.include_router(payroll_router)
app.include_router(statistics_router)
app.include_router(settings_router)
app.include_router(additional_costs_router)
```

### 3. Eliminar endpoints duplicados de main.py

Después de añadir los routers, **eliminar** estos bloques de main.py:

- Líneas 294-352: Endpoints de employees (`@app.get("/api/employees"...)`)
- Líneas 356-383: Endpoints de payroll (`@app.get("/api/payroll"...)`)
- Líneas 387-419: Endpoints de statistics (`@app.get("/api/statistics"...)`)
- Líneas 1081-1142: Endpoints de settings (`@app.get("/api/settings"...)`)
- Líneas 1147-1283: Endpoints de additional_costs (`@app.get("/api/additional-costs"...)`)

### 4. Verificar

```bash
# Verificar sintaxis
python -m py_compile main.py

# Ejecutar tests
python -m pytest tests/ -v

# Probar servidor
python -m uvicorn main:app --reload
```

## Routers Pendientes de Crear

| Router | Endpoints en main.py | Prioridad |
|--------|---------------------|-----------|
| `auth.py` | Líneas 1529-1681 | Alta |
| `reports.py` | Líneas 1785-1881 | Alta |
| `upload.py` | Líneas 532-786 | Media |
| `templates.py` | Líneas 1378-1529 | Media |
| `agent_commissions.py` | Líneas 1288-1378 | Media |
| `alerts.py` | Líneas 1681-1751 | Baja |
| `budgets.py` | Líneas 1881-1956 | Baja |
| `search.py` | Líneas 2016-2085 | Baja |

## Beneficios de la Migración

1. **Mantenibilidad**: Archivos pequeños y enfocados
2. **Testing**: Tests unitarios por módulo
3. **Colaboración**: Menos conflictos de merge
4. **Legibilidad**: Fácil encontrar endpoints
5. **Escalabilidad**: Fácil añadir nuevos módulos

## Estructura Final Propuesta

```
api/
├── main.py (~300 líneas - setup y health)
├── routers/
│   ├── __init__.py
│   ├── employees.py
│   ├── payroll.py
│   ├── statistics.py
│   ├── settings.py
│   ├── additional_costs.py
│   ├── agent_commissions.py
│   ├── auth.py
│   ├── reports.py
│   ├── upload.py
│   ├── templates.py
│   ├── alerts.py
│   ├── budgets.py
│   ├── notifications.py
│   ├── search.py
│   ├── validation.py
│   ├── backups.py
│   └── roi.py
└── ...otros archivos
```

---

*Creado: 2026-01-10*
*Para completar la migración, seguir los pasos anteriores.*
