# Security Audit Skill

Realiza una auditoría de seguridad completa de Arari PRO v3.0.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Auditoría de Autenticación**:
   - Verificar implementación de bcrypt
   - Revisar generación de tokens
   - Analizar rate limiting
   - Verificar expiración de tokens

2. **Auditoría de Autorización**:
   - Revisar decoradores @require_auth y @require_admin
   - Verificar protección de rutas en frontend
   - Analizar roles y permisos
   - Verificar separación admin/viewer

3. **Vulnerabilidades Comunes**:
   - SQL Injection (parametrized queries)
   - XSS (localStorage tokens)
   - CSRF (verificar SameSite cookies)
   - CORS misconfiguration

4. **Configuración de Producción**:
   - Verificar .env no expuesto
   - Revisar credenciales por defecto
   - Analizar headers de seguridad
   - Verificar HTTPS

## Uso

```
/security-audit [area] [--fix]
```

Areas:
- `auth` - Sistema de autenticación
- `api` - Endpoints REST
- `frontend` - Seguridad del cliente
- `config` - Configuración y secretos
- `all` - Auditoría completa (default)

Flag `--fix`: Aplicar correcciones automáticas

## Archivos Clave

```
arari-app/api/
├── auth.py                   # Autenticación
├── auth_dependencies.py      # Decoradores
├── main.py                   # CORS config
└── .env                      # Secretos

arari-app/src/
├── hooks/useAuth.ts          # Auth frontend
├── components/auth/          # AuthGuard
└── middleware.ts             # Next.js middleware
```

## Checklist de Seguridad

### Crítico
- [ ] Rate limiting funciona correctamente
- [ ] Tokens expiran en 24h
- [ ] Bcrypt para contraseñas
- [ ] CORS configurado correctamente

### Alto
- [ ] No hay SQL injection
- [ ] XSS mitigado
- [ ] Secretos no en código
- [ ] HTTPS en producción

### Medio
- [ ] Audit logging habilitado
- [ ] Contraseña admin cambiada
- [ ] Headers de seguridad
- [ ] 2FA disponible (opcional)

## Output

Genera reporte con:
- Severidad de vulnerabilidades (CRÍTICO/ALTO/MEDIO/BAJO)
- Descripción del problema
- Impacto potencial
- Remediación sugerida
- Código de ejemplo para fix
