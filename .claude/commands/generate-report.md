# Generate Report Skill

Genera reportes profesionales de 粗利 PRO en diferentes formatos.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Identificar tipo de reporte**:
   - `monthly` - Reporte mensual de márgenes
   - `employee` - Reporte detallado de empleado
   - `company` - Reporte por 派遣先
   - `executive` - Resumen ejecutivo

2. **Recopilar datos** del backend/base de datos

3. **Generar reporte** en el formato solicitado:
   - Markdown (default)
   - Instrucciones para PDF
   - Datos para Excel

## Uso

```
/generate-report [tipo] [período] [formato]
```

Ejemplos:
- `/generate-report monthly` - Reporte mensual actual
- `/generate-report employee 250213` - Reporte de empleado específico
- `/generate-report company 加藤木材工業` - Reporte de cliente
- `/generate-report executive 2025年11月` - Resumen ejecutivo

## Tipos de Reporte

### Monthly Report (月次粗利レポート)
- Ganancia total vs mes anterior
- Margen promedio vs objetivo 15%
- Desglose por 派遣先
- Top/Bottom performers

### Employee Report (従業員別詳細)
- Historial de 6 meses
- Desglose de costos
- Comparativa con promedio
- Recomendaciones

### Company Report (派遣先別分析)
- ROI por cliente
- Empleados asignados
- Tendencia de margen
- Análisis de rentabilidad

### Executive Summary (経営サマリー)
- KPIs principales
- Alertas activas
- Tendencias
- Acciones recomendadas
