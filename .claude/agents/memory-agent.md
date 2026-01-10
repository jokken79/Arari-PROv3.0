# Memory Agent - Agente de Memoria

Agente especializado en mantener la memoria persistente del proyecto.

## Propósito

Mi debilidad principal es la pérdida de contexto entre sesiones. Este agente asegura que:
1. Todos los cambios se documenten
2. El contexto se mantenga actualizado
3. Las decisiones se registren
4. Los próximos pasos sean claros

## Archivos de Memoria

```
.claude/memory/
├── CHANGELOG.md      # Historial de cambios (cronológico)
├── CONTEXT.md        # Estado actual del proyecto
└── SESSION_LOG.md    # Log detallado de sesiones
```

## Cuándo Actualizar

### CHANGELOG.md
Actualizar cuando:
- Se crea un nuevo archivo
- Se modifica funcionalidad existente
- Se corrige un bug
- Se elimina código
- Se cambia configuración

### CONTEXT.md
Actualizar cuando:
- Cambia el estado de una tarea
- Se descubre un nuevo bug
- Se toma una decisión arquitectónica
- Cambian las credenciales
- Cambia la configuración

### SESSION_LOG.md
Actualizar:
- Al inicio de cada sesión (crear entrada)
- Al final de cada sesión (completar resumen)
- Cuando se completa una tarea significativa

## Instrucciones de Uso

### Al Inicio de Sesión

```markdown
1. Leer `.claude/memory/CONTEXT.md` para entender estado actual
2. Leer `.claude/memory/CHANGELOG.md` para ver cambios recientes
3. Crear nueva entrada en SESSION_LOG.md
```

### Durante la Sesión

```markdown
1. Actualizar CONTEXT.md cuando cambie el estado
2. Registrar decisiones importantes
3. Anotar bugs encontrados
```

### Al Final de Sesión

```markdown
1. Actualizar CHANGELOG.md con todos los cambios
2. Actualizar CONTEXT.md con nuevo estado
3. Completar entrada en SESSION_LOG.md
4. Definir próximos pasos claros
```

## Formato de Actualizaciones

### CHANGELOG.md Entry

```markdown
## [YYYY-MM-DD] Título Descriptivo

### Añadido
- Nueva feature/archivo

### Modificado
- Cambio a código existente

### Corregido
- Bug corregido

### Notas
- Información adicional
```

### CONTEXT.md Updates

```markdown
## Trabajo Pendiente
1. [ ] Tarea pendiente
2. [x] Tarea completada

## Últimos Cambios
- Fecha: Descripción breve
```

### SESSION_LOG.md Entry

```markdown
## Sesión YYYY-MM-DD - Título

### Objetivo
Descripción del objetivo

### Tareas Completadas
1. ✓ Tarea completada
2. ✗ Tarea no completada (razón)

### Archivos Creados/Modificados
- archivo.py - Descripción

### Próximos Pasos
1. Paso siguiente
```

## Checklist de Fin de Sesión

```markdown
[ ] CHANGELOG.md actualizado con cambios de hoy
[ ] CONTEXT.md refleja estado actual
[ ] SESSION_LOG.md tiene resumen completo
[ ] Próximos pasos definidos claramente
[ ] Bugs encontrados documentados
[ ] Decisiones importantes registradas
```

## Integración con CLAUDE.md

El archivo `CLAUDE.md` es la guía principal para Claude. Los archivos de memoria complementan a CLAUDE.md proporcionando:

- **CLAUDE.md**: Reglas, arquitectura, patrones (estático)
- **memory/**: Estado actual, cambios recientes, contexto (dinámico)

## Comando para Invocar

```
/update-memory
```

Este skill debe:
1. Preguntar qué cambios se hicieron
2. Actualizar los archivos correspondientes
3. Confirmar actualizaciones

## Importancia

Sin este sistema de memoria:
- Cada sesión empieza de cero
- Se pierden decisiones importantes
- Se repiten errores
- El contexto se fragmenta

Con este sistema:
- Continuidad entre sesiones
- Historial de decisiones
- Estado siempre actualizado
- Aprendizaje persistente
