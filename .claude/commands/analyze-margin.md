# Analyze Margin Skill

Analiza los márgenes de beneficio de empleados o períodos específicos en 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill, debes:

1. **Leer la base de datos** para obtener datos actuales
2. **Calcular métricas clave**:
   - Margen promedio vs objetivo (15%)
   - Top 5 empleados con mejor margen
   - Bottom 5 empleados con peor margen
   - Tendencia mensual (últimos 6 meses)

3. **Identificar problemas**:
   - Empleados con margen < 10% (crítico)
   - Empleados con margen < 15% (bajo objetivo)
   - Clientes (派遣先) menos rentables

4. **Generar recomendaciones**:
   - Ajustes de 単価 sugeridos
   - Empleados que necesitan atención
   - Clientes a renegociar

## Uso

```
/analyze-margin [período] [empleado_id]
```

Ejemplos:
- `/analyze-margin` - Análisis general del período actual
- `/analyze-margin 2025年11月` - Análisis de noviembre 2025
- `/analyze-margin 2025年11月 250213` - Análisis específico de empleado

## Output esperado

Genera un reporte en formato markdown con:
- Resumen ejecutivo
- Métricas clave
- Gráfico ASCII de distribución
- Lista de acciones recomendadas
