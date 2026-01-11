# Code Review Skill

Realiza revisiones de código profesionales para Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Obtener Cambios**:
   - Leer diff de PR/branch
   - Identificar archivos modificados
   - Entender contexto del cambio

2. **Revisar Código**:
   - Verificar estilo y convenciones
   - Buscar bugs potenciales
   - Evaluar seguridad
   - Verificar tests

3. **Verificar Lógica de Negocio**:
   - Cálculos correctos (billing, costs, margin)
   - Reglas de Japón (insurance rates)
   - No double-counting
   - Period formatting

4. **Generar Feedback**:
   - Comentarios constructivos
   - Sugerencias de mejora
   - Aprobación o cambios requeridos

## Uso

```
/code-review [branch|file|PR]
```

Ejemplos:
- `/code-review` - Revisar cambios uncommitted
- `/code-review feature/new-report` - Revisar branch
- `/code-review services.py` - Revisar archivo específico
- `/code-review PR#123` - Revisar Pull Request

## Checklist de Revisión

### General
- [ ] Código legible y bien nombrado
- [ ] No hay código duplicado
- [ ] Comentarios útiles (no obvios)
- [ ] Imports ordenados

### Python (Backend)
- [ ] Type hints presentes
- [ ] Docstrings en funciones públicas
- [ ] Excepciones manejadas correctamente
- [ ] Sin SQL injection (queries parametrizadas)
- [ ] Decoradores auth donde corresponde

### TypeScript (Frontend)
- [ ] Types definidos (no `any`)
- [ ] Hooks usados correctamente
- [ ] No memory leaks (cleanup effects)
- [ ] Keys en listas
- [ ] Accesibilidad básica

### Lógica de Negocio
- [ ] Fórmulas de billing correctas
- [ ] Insurance rates 2025 (0.90%, 0.30%)
- [ ] Night hours como EXTRA (+0.25×)
- [ ] Overtime split at 60h
- [ ] Period format "YYYY年M月"

### Seguridad
- [ ] No secrets en código
- [ ] Auth required donde necesario
- [ ] Input validado
- [ ] Output sanitizado

### Tests
- [ ] Tests añadidos para cambios
- [ ] Tests existentes pasan
- [ ] Edge cases cubiertos

## Formato de Feedback

```markdown
## 📋 Code Review: [Título]

### ✅ Aspectos Positivos
- ...

### 🔧 Cambios Sugeridos
#### Archivo: `path/to/file.py:123`
```diff
- código actual
+ código sugerido
```
**Razón**: Explicación

### ⚠️ Issues Potenciales
- ...

### 📝 Comentarios Menores
- ...

### Veredicto
- [ ] ✅ Aprobado
- [ ] 🔄 Aprobar con cambios menores
- [ ] ❌ Requiere cambios antes de merge
```

## Convenciones del Proyecto

### Python
```python
# Imports: stdlib, third-party, local
import os
from typing import Optional, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from database import get_connection
from services import PayrollService

# Functions: snake_case
def calculate_billing_amount():
    pass

# Classes: PascalCase
class PayrollService:
    pass
```

### TypeScript
```typescript
// Imports: react, third-party, local
import React, { useState, useEffect } from 'react'

import { useQuery } from '@tanstack/react-query'

import { formatYen } from '@/lib/utils'
import type { Employee } from '@/types'

// Components: PascalCase
function EmployeeTable() {}

// Hooks: camelCase con use prefix
function useEmployees() {}
```

## Output

Genera revisión completa con:
- Resumen de cambios
- Issues encontrados (severity)
- Sugerencias de código
- Veredicto final
