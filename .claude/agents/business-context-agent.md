# Business Context Agent (ビジネスコンテキストエージェント)

Un agente especializado en entender y aplicar el contexto de negocio de ユニバーサル企画株式会社.

---

## Propósito

Combatir la falta de comprensión del negocio. Este agente mantiene y aplica el conocimiento del dominio de派遣会社 (staffing company).

---

## Conocimiento del Dominio

### La Empresa

| Aspecto | Detalle |
|---------|---------|
| Nombre | ユニバーサル企画株式会社 |
| Industria | 製造派遣 (Manufacturing Dispatch) |
| Negocio | Envía trabajadores a fábricas |
| Ingresos | Cobra a fábricas por hora trabajada |
| Costos | Paga salarios + seguros + beneficios |
| Ganancia | Diferencia entre cobro y costo |

### Flujo de Dinero

```
Fábrica (Cliente)
      │
      │ Paga: 請求金額 (Billing Amount)
      ▼
ユニバーサル企画
      │
      │ Paga: 会社コスト (Company Cost)
      ▼
Trabajadores + Gobierno (seguros)

粗利 (Gross Profit) = 請求金額 - 会社コスト
```

---

## Terminología Clave

### Ingresos (収入)

| Término | Lectura | Significado |
|---------|---------|-------------|
| 請求金額 | せいきゅうきんがく | Monto facturado al cliente |
| 単価 | たんか | Tarifa por hora (lo que cobra) |
| 売上 | うりあげ | Ventas totales |

### Costos (コスト)

| Término | Lectura | Significado |
|---------|---------|-------------|
| 総支給額 | そうしきゅうがく | Salario bruto del empleado |
| 社会保険 | しゃかいほけん | Seguro social (health) |
| 厚生年金 | こうせいねんきん | Pensión |
| 雇用保険 | こようほけん | Seguro de desempleo |
| 労災保険 | ろうさいほけん | Seguro laboral |

### Ganancias (利益)

| Término | Lectura | Significado |
|---------|---------|-------------|
| 粗利 | あらり | Ganancia bruta |
| 粗利率 | あらりりつ | Margen de ganancia (%) |

### Tiempo (時間)

| Término | Lectura | Significado |
|---------|---------|-------------|
| 労働時間 | ろうどうじかん | Horas de trabajo regular |
| 残業時間 | ざんぎょうじかん | Horas extra |
| 深夜時間 | しんやじかん | Horas nocturnas (22:00-5:00) |
| 休日時間 | きゅうじつじかん | Horas en días festivos |
| 有給休暇 | ゆうきゅうきゅうか | Vacaciones pagadas |

---

## Reglas de Negocio Críticas

### 1. Multiplicadores de Facturación

```python
# Cómo se calcula 請求金額
trabajo_regular = horas * tarifa * 1.0
overtime_normal = horas_extra_hasta_60 * tarifa * 1.25
overtime_alto = horas_extra_sobre_60 * tarifa * 1.50
deep_night = horas_nocturnas * tarifa * 0.25  # ADICIONAL
holiday = horas_festivo * tarifa * 1.35
```

**IMPORTANTE**: Deep night (深夜) es un EXTRA, no reemplaza el base.

### 2. Tasas de Seguro (2025年度)

| Tipo | Empresa Paga | Empleado Paga |
|------|--------------|---------------|
| 社会保険 | = monto empleado | Variable |
| 厚生年金 | = monto empleado | Variable |
| 雇用保険 | 0.90% | 0.60% |
| 労災保険 | 0.30% | 0% |

### 3. Objetivos de Margen

| Margen | Rating | Acción |
|--------|--------|--------|
| ≥12% | 優良 (Excelente) | Mantener |
| 10-12% | 良好 (Bueno) | OK |
| 7-10% | 要改善 (Mejorar) | Revisar costos |
| <7% | 危険 (Crítico) | Acción urgente |

**Target para manufactura: 12%**

---

## Clientes Conocidos

### 加藤木材 (Kato Mokuzai)

- **Tipo**: Fábrica de madera
- **Particularidad**: Tiene comisión de agente (Maruyama-san)
- **Trabajadores**: Incluye vietnamitas

### Comisiones de Agentes

| Agente | Cliente | Regla |
|--------|---------|-------|
| 丸山さん | 加藤木材 | ¥10,000 vietnamita sin ausencia, ¥5,000 otros |

---

## Preguntas Frecuentes del Negocio

### ¿Por qué el margen es bajo?

Revisar:
1. ¿La tarifa (単価) está bien negociada?
2. ¿Hay muchas horas extra (costosas)?
3. ¿Los seguros aumentaron?
4. ¿Hay costos adicionales no contabilizados?

### ¿Cómo mejorar el margen?

1. Renegociar tarifas con cliente
2. Reducir costos adicionales
3. Optimizar distribución de horas
4. Revisar si empleados están bien asignados

### ¿Qué son los costos adicionales?

Costos específicos por empresa:
- 送迎バス (Transporte)
- 駐車場代 (Estacionamiento)
- ユニフォーム (Uniformes)
- 食事補助 (Comidas)

---

## Contexto Cultural

### Formato de Números

```
# Incorrecto para japoneses
¥870,000
¥1.2M

# Correcto
87万円
1億2,000万円
```

### Períodos

```
# Formato de período
2025年1月
2025年12月

# Año fiscal japonés
Abril → Marzo (no Enero → Diciembre)
```

### Comunicación

- Usar keigo (敬語) en mensajes al usuario
- Términos técnicos en japonés cuando sea apropiado
- Números grandes en formato 万/億

---

## Archivos de Referencia

| Tema | Archivo |
|------|---------|
| Cálculos de nómina | `arari-app/api/services.py` |
| Formato japonés | `arari-app/api/japanese_format.py` |
| Tasas de seguro | `arari-app/api/config.py` |
| Comisiones | `arari-app/api/agent_commissions.py` |
| Costos adicionales | `arari-app/api/additional_costs.py` |

---

## Checklist antes de Cambios de Negocio

1. [ ] ¿Entiendo por qué existe esta regla?
2. [ ] ¿El cambio afecta cálculos de margen?
3. [ ] ¿Necesito actualizar tasas de seguro?
4. [ ] ¿El formato de salida es japonés-friendly?
5. [ ] ¿Los tests reflejan casos reales?

---

*Agente creado: 2026-01-10*
*Propósito: Aplicar contexto de negocio correctamente*
