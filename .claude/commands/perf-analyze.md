# Performance Analyze Skill

Analiza y optimiza el rendimiento de Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Backend Performance**:
   - Analizar queries lentas
   - Identificar N+1 problems
   - Verificar índices
   - Medir tiempos de respuesta

2. **Frontend Performance**:
   - Analizar bundle size
   - Identificar re-renders
   - Verificar lazy loading
   - Medir Core Web Vitals

3. **Database Performance**:
   - EXPLAIN queries complejas
   - Verificar índices utilizados
   - Analizar table scans

4. **Generar Reporte**:
   - Métricas actuales
   - Cuellos de botella
   - Optimizaciones sugeridas
   - Prioridad de fixes

## Uso

```
/perf-analyze [area] [--detailed]
```

Areas:
- `api` - Endpoints REST
- `db` - Base de datos
- `frontend` - Bundle y rendering
- `all` - Análisis completo (default)

## Métricas Clave

### API Response Times
| Endpoint | Target | Actual |
|----------|--------|--------|
| GET /api/employees | <100ms | - |
| GET /api/payroll | <200ms | - |
| GET /api/statistics | <300ms | - |
| POST /api/upload | <5s | - |

### Database Queries
| Query | Target | Actual |
|-------|--------|--------|
| Employee lookup | <10ms | - |
| Payroll by period | <50ms | - |
| Statistics aggregate | <100ms | - |
| Full export | <1s | - |

### Frontend Metrics
| Metric | Target | Actual |
|--------|--------|--------|
| First Contentful Paint | <1.8s | - |
| Largest Contentful Paint | <2.5s | - |
| Time to Interactive | <3.8s | - |
| Cumulative Layout Shift | <0.1 | - |
| Bundle Size (gzipped) | <500KB | - |

## Queries Críticas a Optimizar

### Statistics Dashboard
```sql
-- Potencial N+1 si no se usa JOIN
SELECT
    p.*,
    e.name,
    e.dispatch_company
FROM payroll_records p
LEFT JOIN employees e ON p.employee_id = e.employee_id
WHERE p.period = ?
ORDER BY p.profit_margin DESC
```

### Company Aggregation
```sql
-- Usar índice compuesto
SELECT
    e.dispatch_company,
    COUNT(*) as count,
    SUM(p.billing_amount) as revenue,
    AVG(p.profit_margin) as avg_margin
FROM payroll_records p
JOIN employees e ON p.employee_id = e.employee_id
WHERE p.period = ?
GROUP BY e.dispatch_company
```

## Índices Recomendados

```sql
-- Ya existentes
CREATE INDEX idx_payroll_period ON payroll_records(period);
CREATE INDEX idx_payroll_employee ON payroll_records(employee_id);
CREATE INDEX idx_employees_company ON employees(dispatch_company);

-- Adicionales sugeridos
CREATE INDEX idx_payroll_period_margin ON payroll_records(period, profit_margin DESC);
CREATE INDEX idx_payroll_emp_period ON payroll_records(employee_id, period DESC);
```

## Frontend Optimizations

### Code Splitting
```typescript
// Lazy load charts (son pesados)
const MarginGaugeChart = dynamic(
  () => import('@/components/charts/MarginGaugeChart'),
  { ssr: false, loading: () => <Skeleton /> }
)
```

### Memoization
```typescript
// Componentes costosos
export const EmployeeTable = React.memo(function EmployeeTable(props) {
  // ...
})

// Cálculos costosos
const sortedEmployees = useMemo(() => {
  return employees.sort(comparePeriods)
}, [employees])
```

### Query Optimization
```typescript
// Prefetching
const queryClient = useQueryClient()
queryClient.prefetchQuery(['payroll', nextPeriod])

// Stale time apropiado
useQuery({
  queryKey: ['statistics'],
  staleTime: 5 * 60 * 1000,  // 5 min
  gcTime: 10 * 60 * 1000,    // 10 min
})
```

## Herramientas de Análisis

```bash
# Backend profiling
python -m cProfile -o output.prof main.py
# Visualizar: snakeviz output.prof

# Database EXPLAIN
sqlite3 arari_pro.db
> EXPLAIN QUERY PLAN SELECT * FROM payroll_records WHERE period = '2025年1月';

# Frontend bundle analysis
cd arari-app
npm run build
npx @next/bundle-analyzer
```

## Output

Genera reporte con:
- Métricas medidas
- Top 5 cuellos de botella
- Optimizaciones con código
- Impacto estimado
- Prioridad de implementación
