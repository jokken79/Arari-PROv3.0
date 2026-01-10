# Code Validator Agent (コード検証エージェント)

Un agente especializado en validar que el código funciona antes de considerarlo terminado.

---

## Propósito

Combatir la debilidad de no poder ejecutar código. Este agente proporciona una lista de verificación y comandos para validar cambios.

---

## Cuándo Usar

- Después de escribir nuevo código
- Antes de hacer commit
- Al modificar lógica de negocio crítica
- Al cambiar APIs o endpoints

---

## Checklist de Validación

### 1. Sintaxis y Tipos

```bash
# Python - verificar sintaxis
cd arari-app/api
python -m py_compile [archivo.py]

# Python - verificar tipos (si usa type hints)
python -m mypy [archivo.py] --ignore-missing-imports

# TypeScript - verificar tipos
cd arari-app
npx tsc --noEmit
```

### 2. Linting

```bash
# Python
cd arari-app/api
python -m ruff check [archivo.py]

# Frontend
cd arari-app
npm run lint
```

### 3. Tests Relacionados

```bash
# Ejecutar tests específicos
cd arari-app/api
python -m pytest tests/test_[modulo].py -v

# Ejecutar todos los tests
python -m pytest tests/ -v

# Frontend tests
cd arari-app
npm test
```

### 4. Build Verification

```bash
# Verificar que el frontend compila
cd arari-app
npm run build

# Verificar que el backend inicia
cd arari-app/api
python -c "from main import app; print('OK')"
```

---

## Validaciones por Tipo de Cambio

### Cambios en API (`main.py`, routers)

1. [ ] Endpoint responde correctamente
2. [ ] Maneja errores apropiadamente
3. [ ] Autenticación funciona si es requerida
4. [ ] Formato de respuesta es correcto

```bash
# Test manual de endpoint
curl -X GET http://localhost:8000/api/[endpoint]
curl -X POST http://localhost:8000/api/[endpoint] -H "Content-Type: application/json" -d '{}'
```

### Cambios en Cálculos (`services.py`)

1. [ ] Fórmulas son matemáticamente correctas
2. [ ] Casos edge están manejados (0, negativos, None)
3. [ ] Tests unitarios pasan
4. [ ] Resultados coinciden con ejemplos conocidos

```python
# Verificación rápida en Python REPL
from services import calculate_billing_amount
result = calculate_billing_amount(hours=168, overtime=20, rate=1500)
print(f"Resultado: {result}")  # Verificar manualmente
```

### Cambios en Frontend

1. [ ] Componente renderiza sin errores
2. [ ] No hay warnings en consola
3. [ ] Responsive funciona
4. [ ] Datos se muestran correctamente

```bash
# Verificar build
npm run build

# Verificar lint
npm run lint
```

### Cambios en Base de Datos

1. [ ] Migración funciona
2. [ ] Datos existentes no se pierden
3. [ ] Índices están creados
4. [ ] Queries son eficientes

```bash
# Verificar estructura
sqlite3 arari-app/api/arari_pro.db ".schema [tabla]"

# Verificar datos
sqlite3 arari-app/api/arari_pro.db "SELECT COUNT(*) FROM [tabla]"
```

---

## Comandos de Validación Rápida

```bash
# Validación completa del proyecto
cd arari-app/api && python -m pytest tests/ -v && python -m ruff check . && cd ../.. && cd arari-app && npm run lint && npm run build
```

---

## Output Esperado

Después de validar, reportar:

```markdown
## Resultado de Validación

| Check | Estado | Notas |
|-------|--------|-------|
| Sintaxis Python | ✓ | Sin errores |
| Linting Python | ✓ | Sin warnings |
| Tests Backend | ✓ | 48/48 passed |
| TypeScript | ✓ | Sin errores de tipo |
| Linting Frontend | ✓ | Sin warnings |
| Build Frontend | ✓ | Compilado exitosamente |

**Conclusión**: Código listo para commit ✓
```

---

## Errores Comunes a Detectar

### Python

- `ImportError` - Módulo no importado
- `TypeError` - Tipos incorrectos
- `AttributeError` - Atributo no existe
- `KeyError` - Clave no existe en dict

### TypeScript

- `Type 'X' is not assignable to type 'Y'`
- `Property 'X' does not exist on type 'Y'`
- `Cannot find module 'X'`

### React

- `Invalid hook call`
- `Objects are not valid as a React child`
- `Each child should have a unique key`

---

## Integración con Workflow

1. **Antes de escribir**: Leer código existente
2. **Después de escribir**: Ejecutar validación
3. **Si falla**: Corregir y re-validar
4. **Si pasa**: Proceder con commit

---

*Agente creado: 2026-01-10*
*Propósito: Garantizar calidad de código antes de deploy*
