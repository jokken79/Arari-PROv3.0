# Add Feature Skill

Implementa nuevas funcionalidades en Arari PRO v3.0 siguiendo la arquitectura existente.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Entender Requerimiento**:
   - Clarificar funcionalidad deseada
   - Identificar componentes afectados
   - Evaluar impacto en sistema existente

2. **Diseñar Solución**:
   - Definir endpoints necesarios (si API)
   - Diseñar componentes UI (si frontend)
   - Planificar cambios de BD (si necesario)
   - Considerar seguridad y permisos

3. **Implementar**:
   - Backend: FastAPI endpoints + servicios
   - Frontend: Hooks + componentes + páginas
   - BD: Migraciones si necesario
   - Tests: Unitarios + integración

4. **Integrar**:
   - Añadir a navegación si es página
   - Actualizar permisos si es necesario
   - Documentar en CLAUDE.md

## Uso

```
/add-feature [descripcion]
```

Ejemplos:
- `/add-feature Añadir exportación a PDF`
- `/add-feature Dashboard para gerentes`
- `/add-feature Notificaciones por email`
- `/add-feature Sistema de vacaciones`

## Arquitectura de Referencia

### Backend (Nueva Feature)

```python
# 1. Router (routers/new_feature.py)
from fastapi import APIRouter, Depends
from auth_dependencies import require_auth

router = APIRouter(prefix="/api/new-feature", tags=["new-feature"])

@router.get("/")
async def get_items(current_user = Depends(require_auth)):
    pass

# 2. Service (services/new_feature_service.py)
class NewFeatureService:
    def __init__(self, db):
        self.db = db

    def get_items(self):
        pass

# 3. Models (models.py)
class NewFeatureBase(BaseModel):
    field: str

# 4. Registrar en main.py
from routers import new_feature
app.include_router(new_feature.router)
```

### Frontend (Nueva Feature)

```typescript
// 1. Hook (hooks/useNewFeature.ts)
export function useNewFeature() {
  return useQuery({
    queryKey: ['new-feature'],
    queryFn: async () => newFeatureApi.getAll(),
    staleTime: 5 * 60 * 1000,
  })
}

// 2. Page (app/new-feature/page.tsx)
'use client'
import { useNewFeature } from '@/hooks'

export default function NewFeaturePage() {
  const { data, isLoading } = useNewFeature()
  // ...
}

// 3. Navegación (Sidebar.tsx)
const mainNavigation = [
  // ... existing
  { name: '新機能', href: '/new-feature', icon: Star },
]
```

## Checklist de Nueva Feature

### Backend
- [ ] Endpoint creado con decoradores auth
- [ ] Service con lógica de negocio
- [ ] Models Pydantic definidos
- [ ] Tests añadidos
- [ ] Documentación OpenAPI

### Frontend
- [ ] Hook TanStack Query creado
- [ ] Página creada en app/
- [ ] Componentes UI necesarios
- [ ] Navegación actualizada
- [ ] Permisos verificados

### General
- [ ] Migraciones de BD (si aplica)
- [ ] CLAUDE.md actualizado
- [ ] No rompe features existentes

## Output

Genera:
1. Plan de implementación
2. Archivos a crear/modificar
3. Código completo
4. Tests sugeridos
5. Documentación
