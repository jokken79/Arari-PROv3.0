# Refactor API Skill

Refactoriza y mejora el backend FastAPI de Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Análisis de main.py**:
   - Identificar funciones largas (>100 líneas)
   - Detectar código duplicado
   - Verificar separación de responsabilidades
   - Analizar estructura de endpoints

2. **Refactorización por Módulos**:
   - Extraer routers por dominio (employees, payroll, reports)
   - Crear servicios especializados
   - Implementar repository pattern
   - Añadir DTOs/schemas Pydantic

3. **Mejoras de Código**:
   - Añadir type hints completos
   - Mejorar manejo de errores
   - Implementar logging estructurado
   - Añadir documentación OpenAPI

4. **Performance**:
   - Optimizar queries N+1
   - Implementar connection pooling
   - Añadir caching estratégico
   - Usar async donde sea posible

## Uso

```
/refactor-api [modulo] [--dry-run]
```

Módulos:
- `main` - Refactorizar main.py (~1800 líneas)
- `services` - Mejorar capa de servicios
- `models` - Optimizar modelos Pydantic
- `database` - Mejorar capa de datos
- `all` - Refactorización completa

Flag `--dry-run`: Mostrar cambios sin aplicar

## Estado Actual main.py

```
Líneas totales: ~1800
Endpoints: 100+
Imports: 50+
TODO: Dividir en routers
```

## Estructura Objetivo

```
arari-app/api/
├── main.py                   # Solo app setup + routers
├── routers/
│   ├── __init__.py
│   ├── employees.py          # /api/employees/*
│   ├── payroll.py            # /api/payroll/*
│   ├── statistics.py         # /api/statistics/*
│   ├── reports.py            # /api/reports/*
│   ├── auth.py               # /api/auth/*
│   ├── upload.py             # /api/upload
│   ├── additional_costs.py   # /api/additional-costs/*
│   └── agent_commissions.py  # /api/agent-commissions/*
├── services/
│   ├── __init__.py
│   ├── payroll_service.py
│   ├── employee_service.py
│   └── report_service.py
├── repositories/
│   ├── __init__.py
│   ├── employee_repository.py
│   └── payroll_repository.py
└── schemas/
    ├── __init__.py
    ├── employee.py
    └── payroll.py
```

## Principios de Refactorización

1. **Single Responsibility**: Cada módulo hace una cosa
2. **DRY**: No duplicar código
3. **KISS**: Mantener simplicidad
4. **Type Safety**: Type hints en todo
5. **Testability**: Fácil de testear

## Output

Genera:
- Lista de cambios propuestos
- Archivos a crear/modificar
- Impacto en tests existentes
- Plan de migración paso a paso
