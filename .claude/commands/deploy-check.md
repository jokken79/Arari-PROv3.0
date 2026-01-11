# Deploy Check Skill

Verifica que Arari PRO v3.0 está listo para desplegar a producción.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Build Check**:
   - Frontend: `npm run build`
   - Backend: Verificar sintaxis Python
   - Lint: `npm run lint` + `ruff check .`

2. **Tests Check**:
   - Ejecutar suite completa de tests
   - Verificar coverage mínimo
   - No tests fallidos permitidos

3. **Security Check**:
   - Verificar .env no commiteado
   - Revisar credenciales por defecto
   - Verificar CORS config

4. **Config Check**:
   - Variables de entorno definidas
   - URLs de producción correctas
   - DB connection string

## Uso

```
/deploy-check [environment]
```

Environments:
- `production` - Verificar para Railway/Vercel (default)
- `staging` - Verificar para staging
- `local` - Verificar desarrollo local

## Checklist de Deploy

### Pre-Deploy

```bash
# 1. Build frontend
cd arari-app && npm run build
# ✓ Build completado sin errores

# 2. Lint frontend
npm run lint
# ✓ Sin errores de ESLint

# 3. Lint backend
cd arari-app/api && python -m ruff check .
# ✓ Sin errores de Ruff

# 4. Tests backend
python -m pytest tests/ -v
# ✓ 48/48 tests pasados

# 5. Tests frontend
cd arari-app && npm test
# ✓ Tests pasados
```

### Variables de Entorno

#### Railway (Backend)
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
ADMIN_USERNAME=admin              # ⚠️ Cambiar en prod
ADMIN_PASSWORD=<secure-password>  # ⚠️ CAMBIAR
ADMIN_EMAIL=admin@company.com
FRONTEND_URL=https://arari-pr-ov2-0.vercel.app
```

#### Vercel (Frontend)
```env
NEXT_PUBLIC_API_URL=https://arari-prov20-production.up.railway.app
NEXT_PUBLIC_ENABLE_AUTH=true
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

### Seguridad

- [ ] Credenciales admin cambiadas
- [ ] .env no en git
- [ ] CORS solo permite frontend URL
- [ ] HTTPS habilitado
- [ ] Rate limiting funcionando

### Base de Datos

- [ ] PostgreSQL en Railway
- [ ] Migrations aplicadas
- [ ] Índices creados
- [ ] Backup configurado

## Servicios de Producción

| Servicio | URL | Dashboard |
|----------|-----|-----------|
| Frontend | https://arari-pr-ov2-0.vercel.app | Vercel |
| Backend | https://arari-prov20-production.up.railway.app | Railway |
| BD | PostgreSQL Railway | Railway |

## Comandos de Deploy

```bash
# Deploy automático (push a main)
git push origin main

# Verificar deploy manual
# Railway: railway up
# Vercel: vercel --prod
```

## Rollback

```bash
# Railway
railway rollback

# Vercel
vercel rollback
```

## Output

Genera reporte con:
- ✓/✗ para cada check
- Errores encontrados
- Warnings
- Recomendaciones pre-deploy
- Comando de deploy sugerido
