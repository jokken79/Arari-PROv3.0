# Audit Log Skill

Consulta el log de auditoría de cambios en 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Consultar tabla audit_log** en la base de datos
2. **Filtrar** por usuario, acción, fecha, o entidad
3. **Mostrar** cambios en formato legible

## Uso

```
/audit-log [filtro] [valor] [límite]
```

Ejemplos:
- `/audit-log` - Últimos 20 cambios
- `/audit-log user admin` - Cambios del usuario admin
- `/audit-log action DELETE` - Solo eliminaciones
- `/audit-log entity employee` - Cambios en empleados
- `/audit-log date 2025-12-10` - Cambios del día

## Tipos de Acciones Registradas

| Acción | Descripción |
|--------|-------------|
| CREATE | Nuevo registro creado |
| UPDATE | Registro modificado |
| DELETE | Registro eliminado |
| LOGIN | Inicio de sesión |
| LOGOUT | Cierre de sesión |
| UPLOAD | Archivo subido |
| EXPORT | Datos exportados |
| SETTINGS | Configuración cambiada |

## Output Esperado

```
=== AUDIT LOG - Últimos 20 cambios ===

2025-12-10 14:30:22 | admin | UPDATE | employee
├── ID: 250213
├── Campo: billing_rate
├── Antes: 1700
└── Después: 1800

2025-12-10 14:25:11 | admin | UPLOAD | payroll
├── Archivo: 給与明細_202511.xlsx
├── Registros: 45
└── Status: SUCCESS

2025-12-10 10:15:33 | manager | EXPORT | report
├── Tipo: monthly
├── Período: 2025年11月
└── Formato: PDF
```
