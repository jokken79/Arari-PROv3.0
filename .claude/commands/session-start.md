# Session Start (セッション開始)

Skill para inicializar cada sesión de Claude con el contexto actualizado.

---

## Uso

```
/session-start
```

---

## Instrucciones

Al ejecutar este skill, realizar las siguientes acciones:

### 1. Leer Archivos de Memoria

```
.claude/memory/CONTEXT.md      # Estado actual del proyecto
.claude/memory/CHANGELOG.md    # Últimos cambios
.claude/memory/KNOWN_ERRORS.md # Errores a evitar
```

### 2. Verificar Estado del Sistema

```bash
# Verificar branch actual
git status

# Ver últimos commits
git log --oneline -5

# Verificar si hay cambios pendientes
git diff --stat
```

### 3. Generar Resumen de Contexto

Después de leer los archivos, generar un resumen:

```markdown
## Contexto de Sesión Cargado

### Estado del Proyecto
- **Versión**: [de CONTEXT.md]
- **Branch**: [de git status]
- **Último cambio**: [de CHANGELOG.md]

### Trabajo Pendiente
[Lista de CONTEXT.md - Trabajo Pendiente]

### Errores Recientes a Evitar
[Los más relevantes de KNOWN_ERRORS.md]

### Notas para Esta Sesión
[De CONTEXT.md - Notas para Próxima Sesión]
```

### 4. Confirmar Carga

Reportar al usuario:

```
✓ Contexto de sesión cargado
✓ [N] tareas pendientes identificadas
✓ [M] errores conocidos en memoria
✓ Listo para trabajar en Arari PRO v3.0
```

---

## Ejecución Automática

Este skill debería ejecutarse automáticamente al inicio de cada sesión cuando:
- El usuario saluda ("Hola", "Hi", "Buenos días")
- El usuario hace una pregunta sobre el proyecto
- Es la primera interacción del día

---

## Archivos a Leer

| Archivo | Propósito | Prioridad |
|---------|-----------|-----------|
| `CONTEXT.md` | Estado actual | Alta |
| `CHANGELOG.md` | Cambios recientes | Alta |
| `KNOWN_ERRORS.md` | Errores a evitar | Alta |
| `SESSION_LOG.md` | Historial de sesiones | Media |
| `BUSINESS_CONTEXT.md` | Contexto de negocio | Media |
| `ERROR_LOG.md` | Errores del usuario | Baja |

---

## Ejemplo de Output

```
## 🚀 Sesión Iniciada - Arari PRO v3.0

### Estado Actual
- **Versión**: 3.0
- **Branch**: main
- **Último deploy**: Producción activa

### Últimos Cambios (2026-01-10)
- Creado sistema de agentes y skills
- Implementado formato japonés (万/億)
- Creado sistema de memoria persistente

### Tareas Pendientes Prioritarias
1. [ ] Migrar rate limiting a Redis
2. [ ] Migrar tokens a HttpOnly cookies
3. [ ] Refactorizar main.py

### Errores a Evitar
- No usar formato occidental para dinero (usar japanese_format.py)
- Backend devuelve "token" no "access_token"
- Deep night es EXTRA, no reemplazo

¿En qué te puedo ayudar hoy?
```

---

*Skill creado: 2026-01-10*
*Propósito: Inicializar sesiones con contexto completo*
