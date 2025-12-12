# Backup Database Skill

Crea y gestiona backups de la base de datos 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Crear backup** de arari_pro.db
2. **Nombrar** con timestamp: `arari_pro_YYYYMMDD_HHMMSS.db`
3. **Guardar** en directorio de backups
4. **Verificar** integridad del backup
5. **Limpiar** backups antiguos (>30 días)

## Uso

```
/backup-db [acción] [opciones]
```

Ejemplos:
- `/backup-db` - Crear backup ahora
- `/backup-db create` - Crear backup con verificación
- `/backup-db list` - Listar backups existentes
- `/backup-db restore 20251210_143022` - Restaurar backup
- `/backup-db clean` - Eliminar backups >30 días

## Acciones

| Acción | Descripción |
|--------|-------------|
| create | Crear nuevo backup |
| list | Listar backups existentes |
| restore | Restaurar de backup |
| clean | Limpiar backups antiguos |
| verify | Verificar integridad |

## Ubicación de Backups

```
arari-app/api/backups/
├── arari_pro_20251210_143022.db
├── arari_pro_20251209_100000.db
└── arari_pro_20251208_090000.db
```

## Código de Backup

```bash
# Crear backup
cp arari-app/api/arari_pro.db \
   arari-app/api/backups/arari_pro_$(date +%Y%m%d_%H%M%S).db

# Verificar integridad
sqlite3 backup.db "PRAGMA integrity_check;"

# Restaurar
cp arari-app/api/backups/arari_pro_TIMESTAMP.db \
   arari-app/api/arari_pro.db
```

## Output Esperado

```
=== BACKUP CREADO ===

Archivo: arari_pro_20251210_143022.db
Tamaño: 1.2 MB
Ubicación: arari-app/api/backups/
Integridad: ✅ OK

Contenido:
├── employees: 959 registros
├── payroll_records: 450 registros
├── factory_templates: 3 registros
└── settings: 5 registros

Backups existentes: 5
Espacio usado: 6.1 MB
Próxima limpieza: 2025-12-15
```
