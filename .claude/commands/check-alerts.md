# Check Alerts Skill

Verifica y muestra alertas activas del sistema 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Consultar la base de datos** para detectar:
   - Empleados con margen < 10% (CRÍTICO)
   - Empleados con margen < 15% (BAJO OBJETIVO)
   - Clientes con margen promedio < 12%
   - Anomalías en datos (horas > 200, margen negativo)
   - Cambios significativos mes a mes (>5%)

2. **Clasificar alertas** por severidad:
   - 🔴 CRÍTICO - Requiere acción inmediata
   - 🟠 WARNING - Requiere atención
   - 🟡 INFO - Informativo

3. **Mostrar resumen** con acciones sugeridas

## Uso

```
/check-alerts [período] [tipo]
```

Ejemplos:
- `/check-alerts` - Todas las alertas del período actual
- `/check-alerts 2025年11月` - Alertas de noviembre
- `/check-alerts critical` - Solo alertas críticas

## Thresholds Configurados

| Alerta | Threshold | Severidad |
|--------|-----------|-----------|
| Margen muy bajo | < 10% | 🔴 CRÍTICO |
| Margen bajo | < 15% | 🟠 WARNING |
| Horas excesivas | > 200h | 🟠 WARNING |
| Margen negativo | < 0% | 🔴 CRÍTICO |
| Cambio drástico | ±5% vs mes anterior | 🟡 INFO |
| Cliente poco rentable | < 12% promedio | 🟠 WARNING |

## Output

```
=== ALERTAS ACTIVAS - 2025年11月 ===

🔴 CRÍTICAS (2)
├── EMP-250213: Margen 8.5% (objetivo 15%)
└── 加藤木材工業: Margen promedio 9.2%

🟠 WARNINGS (5)
├── EMP-240321: Margen 12.3%
├── EMP-230916: Horas totales 215h
...

🟡 INFO (3)
├── Ganancia mensual -3.2% vs octubre
...

ACCIONES RECOMENDADAS:
1. Revisar 単価 de empleados en 加藤木材工業
2. Verificar horas de EMP-230916
```
