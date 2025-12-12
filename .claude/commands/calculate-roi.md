# Calculate ROI Skill

Calcula el ROI (Return on Investment) por cliente/派遣先 en 粗利 PRO.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Recopilar datos** por cliente:
   - Total facturado (請求金額)
   - Total costo empresa (会社総コスト)
   - Número de empleados
   - Horas totales trabajadas

2. **Calcular métricas**:
   - ROI = (Ganancia / Costo) × 100
   - Ganancia por empleado
   - Ganancia por hora
   - Margen promedio

3. **Ranking** de clientes por rentabilidad

4. **Recomendaciones** basadas en datos

## Uso

```
/calculate-roi [cliente] [período]
```

Ejemplos:
- `/calculate-roi` - ROI de todos los clientes
- `/calculate-roi 加藤木材工業` - ROI específico
- `/calculate-roi all 2025年11月` - Todos, mes específico

## Fórmulas

```
ROI = (粗利 / 会社総コスト) × 100

Ganancia/Empleado = 粗利 / Número de empleados

Ganancia/Hora = 粗利 / Total horas trabajadas

Eficiencia = Margen real / Margen objetivo (15%)
```

## Output Esperado

```
=== ROI POR CLIENTE - 2025年11月 ===

RANKING DE RENTABILIDAD:

#1 株式会社コーリツ
├── 単価: ¥1,990/h
├── Empleados: 12
├── Facturación: ¥4,250,000
├── Costo: ¥3,612,500
├── Ganancia: ¥637,500
├── Margen: 15.0% ✅
├── ROI: 17.6%
└── Eficiencia: 100%

#2 株式会社オーツカ
├── 単価: ¥1,782/h
├── Empleados: 8
├── Facturación: ¥2,850,000
├── Costo: ¥2,479,500
├── Ganancia: ¥370,500
├── Margen: 13.0% ⚠️
├── ROI: 14.9%
└── Eficiencia: 87%

#3 加藤木材工業
├── 単価: ¥1,700/h
├── Empleados: 15
├── Facturación: ¥5,100,000
├── Costo: ¥4,590,000
├── Ganancia: ¥510,000
├── Margen: 10.0% ❌
├── ROI: 11.1%
└── Eficiencia: 67%

RECOMENDACIONES:
1. 加藤木材工業: Renegociar 単価 a ¥1,850 para alcanzar 15%
2. 株式会社オーツカ: Revisar costos, optimizar horas extras
```
