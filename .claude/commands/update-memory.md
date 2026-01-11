# Update Memory Skill

Actualiza el sistema de memoria persistente del proyecto.

## Propósito

Mantener actualizada la memoria del proyecto para que cada sesión tenga contexto completo de cambios anteriores.

## Archivos a Actualizar

1. **CHANGELOG.md** - Historial cronológico de cambios
2. **CONTEXT.md** - Estado actual del proyecto
3. **SESSION_LOG.md** - Log de la sesión actual

## Uso

```
/update-memory [tipo]
```

Tipos:
- `all` - Actualizar todos los archivos (default)
- `changelog` - Solo actualizar CHANGELOG.md
- `context` - Solo actualizar CONTEXT.md
- `session` - Solo actualizar SESSION_LOG.md

## Instrucciones

Cuando se invoque este skill:

### 1. Recopilar Información

Preguntar al usuario:
- ¿Qué cambios se hicieron en esta sesión?
- ¿Se crearon nuevos archivos?
- ¿Se modificaron archivos existentes?
- ¿Se corrigieron bugs?
- ¿Se tomaron decisiones importantes?
- ¿Cuáles son los próximos pasos?

### 2. Actualizar CHANGELOG.md

```markdown
## [YYYY-MM-DD] Título del Cambio

### Añadido
- Nuevas features/archivos

### Modificado
- Cambios a código existente

### Corregido
- Bugs corregidos

### Eliminado
- Código/features eliminadas

### Notas
- Información adicional
```

### 3. Actualizar CONTEXT.md

Actualizar secciones:
- Estado del Proyecto
- Trabajo Pendiente
- Últimos Cambios Significativos
- Bugs Conocidos
- Notas para Próxima Sesión

### 4. Actualizar SESSION_LOG.md

Completar/crear entrada de sesión:
- Duración
- Objetivo
- Tareas Completadas
- Archivos Creados/Modificados
- Hallazgos Importantes
- Decisiones Tomadas
- Próximos Pasos
- Notas

## Ejemplo de Actualización

```bash
# Usuario ejecuta:
/update-memory

# Claude pregunta:
"¿Qué cambios se hicieron en esta sesión?"

# Usuario responde:
"Añadí validación de email al formulario de registro y corregí
el bug del cálculo de horas extras"

# Claude actualiza:
# 1. CHANGELOG.md - Añade entrada con fecha actual
# 2. CONTEXT.md - Actualiza estado y bugs conocidos
# 3. SESSION_LOG.md - Completa entrada de sesión
```

## Checklist de Verificación

Antes de completar, verificar:

- [ ] Fecha correcta en CHANGELOG.md
- [ ] Todos los archivos creados listados
- [ ] Todos los archivos modificados listados
- [ ] Bugs corregidos documentados
- [ ] Estado en CONTEXT.md es preciso
- [ ] Próximos pasos son claros y accionables
- [ ] SESSION_LOG.md tiene resumen completo

## Output Esperado

```markdown
✅ Memoria actualizada correctamente

**CHANGELOG.md**
- Añadida entrada para 2026-01-10
- 2 features añadidas, 1 bug corregido

**CONTEXT.md**
- Estado actualizado
- 3 tareas marcadas como completadas
- 2 nuevos próximos pasos añadidos

**SESSION_LOG.md**
- Sesión de hoy documentada
- 5 tareas registradas
```

## Importancia

Este skill es **CRÍTICO** para:
- Mantener continuidad entre sesiones
- No perder contexto de decisiones
- Facilitar onboarding de nuevos desarrolladores
- Documentar el progreso del proyecto

## Frecuencia Recomendada

- **Mínimo**: Al final de cada sesión significativa
- **Ideal**: Después de cada cambio importante
- **Obligatorio**: Antes de cerrar una sesión de trabajo
