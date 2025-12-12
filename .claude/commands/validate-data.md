# Validate Data Skill

Valida la integridad y consistencia de datos en 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Verificar integridad** de la base de datos
2. **Detectar anomalías** en datos:
   - Márgenes negativos o >50%
   - Horas imposibles (>400/mes)
   - Salarios inconsistentes
   - Empleados sin 単価
   - Registros duplicados

3. **Validar cálculos**:
   - billing_amount = fórmula correcta
   - total_company_cost = gross_salary + seguros
   - gross_profit = billing - cost
   - profit_margin = profit / billing × 100

4. **Generar reporte** de problemas encontrados

## Uso

```
/validate-data [tipo] [fix]
```

Ejemplos:
- `/validate-data` - Validación completa
- `/validate-data employees` - Solo empleados
- `/validate-data payroll` - Solo nómina
- `/validate-data calculations` - Solo cálculos
- `/validate-data fix` - Validar y corregir automáticamente

## Validaciones Realizadas

### Empleados
| Check | Descripción | Severidad |
|-------|-------------|-----------|
| billing_rate > 0 | 単価 debe existir | 🔴 ERROR |
| hourly_rate > 0 | 時給 debe existir | 🔴 ERROR |
| billing > hourly | 単価 > 時給 | 🟠 WARNING |
| status válido | active/inactive | 🟡 INFO |

### Nómina
| Check | Descripción | Severidad |
|-------|-------------|-----------|
| work_hours ≤ 400 | Horas razonables | 🟠 WARNING |
| overtime ≤ 100 | OT razonable | 🟠 WARNING |
| margin 0-50% | Margen realista | 🔴 ERROR |
| margin ≥ 0 | No negativo | 🔴 ERROR |
| gross_salary > 0 | Salario existe | 🔴 ERROR |

### Cálculos
| Check | Fórmula |
|-------|---------|
| billing | Σ(horas × 単価 × multiplicador) |
| company_cost | gross + 社保 + 雇用 + 労災 |
| profit | billing - cost |
| margin | profit / billing × 100 |

## Output Esperado

```
=== VALIDACIÓN DE DATOS - 2025-12-10 ===

RESUMEN:
├── Total registros: 1,409
├── Errores: 3
├── Warnings: 12
└── Info: 5

🔴 ERRORES (3):
├── EMP-999999: billing_rate = 0 (sin 単価)
├── Payroll 250213/2025年11月: margin = -5.2% (negativo)
└── Payroll 240321/2025年10月: work_hours = 450 (>400)

🟠 WARNINGS (12):
├── EMP-230916: hourly_rate > billing_rate (¥1,800 > ¥1,700)
├── 5 empleados con margen < 10%
├── 3 registros con overtime > 80h
└── 3 empleados inactivos con registros recientes

🟡 INFO (5):
├── 2 empleados sin registros en 3 meses
└── 3 templates sin usar

ACCIONES SUGERIDAS:
1. Corregir billing_rate de EMP-999999
2. Verificar datos de 250213/2025年11月
3. Revisar horas de 240321/2025年10月

¿Ejecutar correcciones automáticas? [fix]
```
