# Docker Deployment - Arari-PRO (10 Instancias)

## Resumen rápido

Hemos generado una configuración **completa y automática** para ejecutar **10 instancias** de Arari-PRO (frontend + backend) en Docker **sin conflictos** con otras apps ya en ejecución.

**Flujo de deployment:**
1. **`docker-check.ps1`** — Detecta puertos ocupados y verifica disponibilidad.
2. **`docker-deploy.ps1`** — Automatiza build, deployment y validación.

## Archivos generados

### Configuración de servicios
- **`docker-compose.generated.yml`** — Define 10 instancias (frontend + backend), puertos (3000-3009 / 8000-8009), volúmenes y variables.
- **`.env.instance00` ... `.env.instance09`** — Variables de entorno por instancia (puertos, URLs de API).
- **`compose_generation_report.json`** — Resumen del mapeo de puertos y resoluciones aplicadas.

### Dockerfiles
- **`arari-app/Dockerfile.backend`** — Imagen Python/FastAPI (uvicorn, puerto 8000).
- **`arari-app/Dockerfile.frontend`** — Imagen Next.js/Node.js (puerto 3000).

### Scripts de deployment
- **`docker-check.ps1`** — Verifica Docker, lista contenedores y detecta puertos ocupados.
- **`docker-deploy.ps1`** — Automatiza construcción, deployment y validación.
- **`docker-deploy.bat`** — Alternativa en batch (Windows CMD).

---

## 🚀 PASO 1: Verificar puertos disponibles (IMPORTANTE)

Ejecuta esto **primero** para detectar conflictos con otras apps en Docker:

```powershell
# En D:\Arari-PRO, abre PowerShell y ejecuta:
powershell -ExecutionPolicy Bypass -File .\docker-check.ps1
```

Este script:
- ✓ Verifica que Docker está instalado
- ✓ Lista **todos los contenedores en ejecución**
- ✓ Detecta si los puertos 3000-3009 y 8000-8009 están **ocupados**
- ✓ Te recomienda si puedes proceder o necesitas cambiar puertos

### Ejemplo de salida:
```
[OK] Docker disponible: Docker version 24.0.0

Contenedores en ejecución:
  some-app        0.0.0.0:3000->3000/tcp
  postgres        0.0.0.0:5432->5432/tcp

⚠️  PUERTOS OCUPADOS DETECTADOS:
  - Puerto 3000

Opciones:
  1) Detener otros contenedores que usan esos puertos
  2) Cambiar el rango de puertos base (usa -FrontendBasePort y -BackendBasePort)
  3) Generar configuración con puertos alternativos automáticamente
```

### Si hay conflictos, usa puertos alternativos:
```powershell
# Ejemplo: cambiar a puertos 4000-4009 (frontend) y 9000-9009 (backend)
powershell -ExecutionPolicy Bypass -File .\docker-check.ps1 -FrontendBasePort 4000 -BackendBasePort 9000
```

---

## 🚀 PASO 2: Deploy automático

Una vez confirmado que los puertos están libres, ejecuta el deploy:

```powershell
# En D:\Arari-PRO
powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1
```

### Flags adicionales (opcionales)
```powershell
# Saltar construcción de imágenes (si ya las tienes construidas)
powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1 -SkipBuild

# Forzar deployment aunque haya puertos ocupados
powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1 -Force

# Usar puertos alternativos
powershell -ExecutionPolicy Bypass -File .\docker-deploy.ps1 -FrontendBasePort 4000 -BackendBasePort 9000
```

---

## O ejecutar con Batch (Windows CMD)

```batch
REM En D:\Arari-PRO, abre CMD y ejecuta:
docker-deploy.bat
```

---

## Qué hace cada script

### `docker-check.ps1`
1. Verifica Docker está instalado
2. Lista contenedores en ejecución
3. Detecta puertos ocupados
4. Recomienda puertos alternativos si hay conflictos

### `docker-deploy.ps1`
1. Verifica Docker
2. Construye imágenes `arari-pro-backend:latest` y `arari-pro-frontend:latest`
3. Verifica puertos disponibles
4. Levanta `docker compose up -d` con 10 instancias
5. Muestra resumen, URLs accesibles y comandos útiles

---

## Estructura de puertos (Opción A - defecto)

### Frontend (Next.js)
| Instancia | Puerto Host | Puerto Contenedor |
|-----------|------------|-----------------|
| 00        | 3000       | 3000            |
| 01        | 3001       | 3000            |
| 02        | 3002       | 3000            |
| 03-09     | 3003-3009  | 3000            |

### Backend (FastAPI)
| Instancia | Puerto Host | Puerto Contenedor |
|-----------|------------|-----------------|
| 00        | 8000       | 8000            |
| 01        | 8001       | 8000            |
| 02        | 8002       | 8000            |
| 03-09     | 8003-8009  | 8000            |

---

## Acceso a instancias

Una vez levantados los contenedores:

**Frontend (Next.js):**
- `http://localhost:3000` (instancia 00)
- `http://localhost:3001` (instancia 01)
- `http://localhost:3002` (instancia 02)
- etc.

**Backend (FastAPI):**
- `http://localhost:8000` (instancia 00)
- `http://localhost:8001` (instancia 01)
- `http://localhost:8002` (instancia 02)
- etc.

---

## Comandos útiles después del deployment

### Ver logs en tiempo real
```bash
docker compose -f docker-compose.generated.yml logs -f
```

### Ver logs de un servicio específico
```bash
docker compose -f docker-compose.generated.yml logs -f arari_app_frontend_00
docker compose -f docker-compose.generated.yml logs -f arari_app_backend_00
```

### Parar contenedores (sin eliminar volúmenes)
```bash
docker compose -f docker-compose.generated.yml down
```

### Limpiar todo (contenedores + volúmenes)
```bash
docker compose -f docker-compose.generated.yml down -v
```

### Verificar estado de contenedores
```bash
docker ps
docker ps -a
```

### Verificar puertos en uso
```powershell
# PowerShell (Windows)
Get-NetTCPConnection -LocalPort 3000..3009
Get-NetTCPConnection -LocalPort 8000..8009
```

---

## Solución de problemas

### Error: "Docker no está instalado"
- Descarga e instala **Docker Desktop**: https://www.docker.com/products/docker-desktop
- Reinicia PowerShell/CMD después de instalar.

### Error: "Puerto ya en uso"
- Ejecuta primero: `powershell -ExecutionPolicy Bypass -File .\docker-check.ps1` para identificar cuáles.
- Opción A: Detén el contenedor que usa ese puerto.
- Opción B: Cambia puertos base (usa `-FrontendBasePort` y `-BackendBasePort`).
- Opción C: Edita `docker-compose.generated.yml` manualmente.

### Error: "Dockerfile no encontrado"
- Verifica que existen:
  - `.\arari-app\Dockerfile.backend`
  - `.\arari-app\Dockerfile.frontend`

### Los contenedores no inician
- Revisa logs: `docker compose -f docker-compose.generated.yml logs`
- Verifica dependencias en `arari-app/requirements.txt` (backend) y `arari-app/package.json` (frontend).

---

## Notas importantes

1. **Cada instancia tiene su propio volumen** — Los datos no se comparten entre instancias.
2. **Las imágenes se etiquetan como `latest`** — Reconstruir si cambias el código.
3. **Base de datos por instancia** — Cada instancia apunta a su propio volumen BD. Para BD compartida, edita `docker-compose.generated.yml`.
4. **Verifica puertos antes de deploy** — Usa `docker-check.ps1` primero.

---

## Script de generación (si necesitas regenerar config)

Si necesitas regenerar `docker-compose.generated.yml` con diferentes puertos/instancias:

```powershell
# Desde D:\Arari-PRO
.\scripts\generate-compose.ps1 -Prefix arari_app -Instances 10 -Force

# O con build automático
.\scripts\generate-compose.ps1 -Prefix arari_app -Instances 10 -Build -Force
```

---

**Creado**: 2025-12-02  
**Versión**: 2.0  
**Instancias**: 10 (frontend + backend)  
**Verificación**: Pre-deployment checker incluido

