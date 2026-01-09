# Security Specialist Agent

Agente especializado en seguridad para Arari PRO v3.0.

## Expertise

- Authentication & Authorization
- OWASP Top 10
- JWT/Token security
- SQL Injection prevention
- XSS mitigation
- CORS configuration
- Rate limiting
- Audit logging

## Responsabilidades

1. **Autenticación**
   - Verificar implementación de bcrypt
   - Validar generación de tokens
   - Configurar expiración
   - Implementar rate limiting

2. **Autorización**
   - Revisar decoradores de protección
   - Verificar roles y permisos
   - Auditar rutas protegidas

3. **Vulnerabilidades**
   - Detectar SQL injection
   - Mitigar XSS
   - Configurar CORS correctamente
   - Proteger contra CSRF

4. **Compliance**
   - Audit logging
   - Data encryption
   - Secure configuration

## Archivos Clave

```
arari-app/api/
├── auth.py                 # AuthService, hashing, tokens
├── auth_dependencies.py    # @require_auth, @require_admin
├── audit.py                # Audit logging
└── main.py                 # CORS config

arari-app/src/
├── hooks/useAuth.ts        # Frontend auth
├── components/auth/        # AuthGuard
└── middleware.ts           # Route protection
```

## Implementación de Seguridad Actual

### Password Hashing (Bcrypt)
```python
# auth.py
def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed.encode("utf-8")
    )
```

### Token Generation
```python
# secrets.token_urlsafe(32) = 256 bits entropy
def generate_token() -> str:
    return secrets.token_urlsafe(32)  # ~43 caracteres
```

### Rate Limiting
```python
RATE_LIMIT_WINDOW = 60  # segundos
RATE_LIMIT_MAX_REQUESTS = 5  # por IP

def rate_limit_login(request: Request):
    client_ip = get_client_ip(request)
    if not check_rate_limit(client_ip, "login"):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts",
            headers={"Retry-After": "60"}
        )
```

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.environ.get("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## Vulnerabilidades Conocidas y Mitigaciones

### 1. Rate Limiting en Memoria
**Riesgo**: Se pierde al reiniciar, no escala con múltiples workers
**Mitigación**: Implementar con Redis en producción

### 2. Tokens en localStorage
**Riesgo**: Vulnerable a XSS
**Mitigación**: Migrar a HttpOnly cookies

### 3. Credenciales por Defecto
**Riesgo**: admin/admin123 es débil
**Mitigación**: Forzar cambio en primer login, usar secretos de Railway

## Decoradores de Protección

```python
# auth_dependencies.py

async def require_auth(
    authorization: str = Header(None),
    db: sqlite3.Connection = Depends(get_db)
) -> Dict[str, Any]:
    """Require valid auth token"""
    token = get_token_from_header(authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = AuthService(db).validate_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    return user

async def require_admin(
    current_user: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """Require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user
```

## Checklist de Seguridad

### Crítico
- [x] Bcrypt para passwords
- [x] Tokens criptográficamente seguros
- [x] Rate limiting en login
- [x] CORS configurado
- [ ] HttpOnly cookies (pendiente)
- [ ] Redis para rate limiting (pendiente)

### Alto
- [x] Queries parametrizadas (no SQL injection)
- [x] Decoradores @require_auth/@require_admin
- [x] Token expiration (24h)
- [x] Audit logging

### Medio
- [x] Roles y permisos
- [x] Input validation (Pydantic)
- [ ] 2FA (pendiente)
- [ ] CSP headers (pendiente)

## Roles y Permisos

```python
ROLES = {
    "admin": 100,   # Full access
    "manager": 50,  # Edit + view
    "viewer": 10,   # View only
}

ROLE_PERMISSIONS = {
    "admin": ["*"],
    "manager": [
        "view:employees", "edit:employees",
        "view:payroll", "edit:payroll",
        "view:reports", "generate:reports",
    ],
    "viewer": [
        "view:employees", "view:payroll", "view:reports",
    ],
}
```

## Recomendaciones de Mejora

1. **Migrar a HttpOnly Cookies**
2. **Implementar Redis Rate Limiting**
3. **Añadir 2FA (TOTP)**
4. **Configurar CSP Headers**
5. **Implementar Refresh Tokens**
6. **Forzar HTTPS en producción**
