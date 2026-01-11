# Optimize Frontend Skill

Optimiza el rendimiento y la experiencia de usuario del frontend Next.js de Arari PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Analizar rendimiento actual**:
   - Verificar bundle size (`npm run build`)
   - Identificar re-renders innecesarios
   - Analizar uso de memoization
   - Revisar lazy loading y code splitting

2. **Optimizar TanStack Query**:
   - Revisar staleTime y cacheTime
   - Identificar queries duplicadas
   - Optimizar refetch strategies
   - Implementar prefetching donde sea necesario

3. **Optimizar componentes**:
   - Aplicar React.memo donde corresponda
   - Usar useMemo para cálculos costosos
   - Usar useCallback para handlers
   - Virtualizar listas largas

4. **Optimizar assets**:
   - Comprimir imágenes
   - Lazy load de gráficos Recharts
   - Optimizar fuentes

## Uso

```
/optimize-frontend [area]
```

Areas disponibles:
- `bundle` - Analizar y reducir bundle size
- `queries` - Optimizar TanStack Query
- `components` - Optimizar componentes React
- `charts` - Optimizar gráficos Recharts
- `all` - Análisis completo (default)

## Archivos Clave

```
arari-app/src/
├── hooks/                    # TanStack Query hooks
├── components/charts/        # Recharts (optimizar lazy load)
├── components/ui/            # Componentes base
├── store/appStore.ts         # Zustand store
└── providers/QueryProvider   # Config de React Query
```

## Métricas Objetivo

| Métrica | Actual | Objetivo |
|---------|--------|----------|
| First Contentful Paint | - | < 1.8s |
| Largest Contentful Paint | - | < 2.5s |
| Time to Interactive | - | < 3.8s |
| Bundle size | - | < 500KB gzipped |

## Output

Genera un reporte con:
- Problemas encontrados
- Soluciones implementadas
- Métricas antes/después
- Recomendaciones adicionales
