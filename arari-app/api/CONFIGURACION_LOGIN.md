# Configuración de Login - Arari PRO

## Credenciales Configuradas

**Usuario:** Admin
**Password:** Admin123

## Archivos Modificados

### 1. `/arari-app/api/auth.py` (Líneas 87-96)

**Cambio:** Actualizado el usuario y password por defecto

```python
# Create default admin user if not exists
cursor.execute("SELECT COUNT(*) FROM users WHERE username = 'Admin'")
if cursor.fetchone()[0] == 0:
    default_password = "Admin123"  # Change in production!
    password_hash = hash_password(default_password)
    cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, email)
        VALUES (?, ?, ?, ?, ?)
    """, ("Admin", password_hash, "Administrator", "admin", "admin@arari-pro.local"))
    print("[AUTH] Created default admin user (username: Admin, password: Admin123)")
```

**Antes:**
- Username: 'admin' (minúscula)
- Password: 'admin123' (minúscula)

**Después:**
- Username: 'Admin' (con A mayúscula)
- Password: 'Admin123' (con A y 1 mayúsculas)

---

### 2. `/arari-app/api/.env` (NUEVO)

**Archivo creado** para guardar el SECRET_KEY de forma consistente.

```env
# Arari PRO - Environment Variables
# ⚠️ IMPORTANTE: En producción, cambiar este SECRET_KEY por uno seguro y único

# Secret key para hashing de passwords y tokens JWT
ARARI_SECRET_KEY=arari_pro_secret_key_2025_do_not_use_in_production_change_this

# Puerto del servidor (opcional)
# PORT=8000

# Environment
# ENV=development
```

**Importancia:** El SECRET_KEY debe ser consistente para que los hashes de password se generen siempre igual.

---

### 3. `/arari-app/api/main.py` (Líneas 6-8)

**Cambio:** Agregado carga de variables de entorno al inicio

```python
# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()
```

**Razón:** Para cargar el SECRET_KEY del archivo .env antes de importar el módulo auth.py

---

### 4. `/arari-app/api/requirements.txt` (Línea 7)

**Cambio:** Agregada dependencia python-dotenv

```
python-dotenv>=1.0.0
```

---

## Verificación

### Opción 1: Script de Prueba (Recomendado)

Ejecutar el script de prueba incluido:

```bash
cd /home/user/Arari-PROv1.0/arari-app/api
python3 test_login.py
```

**Resultado esperado:**
```
============================================================
TEST DE LOGIN - Arari PRO
============================================================

✅ SECRET_KEY cargado desde .env: arari_pro_secret_key_2025_do_n...

TEST 1: Login con credenciales correctas
------------------------------------------------------------
Username: Admin
Password: Admin123

✅ LOGIN EXITOSO!

[...]

🎉 TODAS LAS PRUEBAS PASARON

Para usar el sistema:
  Username: Admin
  Password: Admin123
============================================================
```

---

### Opción 2: API Endpoint

1. **Iniciar el servidor FastAPI:**

```bash
cd /home/user/Arari-PROv1.0/arari-app/api
python3 -m uvicorn main:app --reload --port 8000
```

2. **Probar el endpoint de login:**

```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "Admin",
    "password": "Admin123"
  }'
```

**Respuesta esperada:**

```json
{
  "user": {
    "id": 2,
    "username": "Admin",
    "role": "admin",
    "full_name": "Administrator",
    "email": "admin@arari-pro.local"
  },
  "token": "dTUOFJbI00jBoD2xg6MR7XIVQRyuGTGm6EM-df7_...",
  "token_type": "bearer",
  "expires_at": "2025-12-13T06:39:28.617572"
}
```

---

### Opción 3: Frontend (Login Page)

1. **Iniciar el servidor backend:**

```bash
cd /home/user/Arari-PROv1.0/arari-app/api
python3 -m uvicorn main:app --reload --port 8000
```

2. **Iniciar el servidor frontend:**

```bash
cd /home/user/Arari-PROv1.0/arari-app
npm run dev
```

3. **Abrir el navegador:**

```
http://localhost:3000/login
```

4. **Ingresar credenciales:**
   - Username: `Admin`
   - Password: `Admin123`

5. **Verificar:** Debe redirigir al dashboard con sesión iniciada

---

## Base de Datos

**Ubicación:** `/home/user/Arari-PROv1.0/arari-app/api/arari_pro.db`

**Tabla:** `users`

**Usuario Admin:**
```
ID: 2
Username: Admin
Password Hash: d3ba9c0256dd0deb6f04bd8edcac75eeabca5fb5... (SHA256)
Role: admin
Is Active: 1
Full Name: Administrator
Email: admin@arari-pro.local
```

---

## Seguridad

### Password Hashing

El sistema usa SHA256 con salt para hashear passwords:

```python
def hash_password(password: str) -> str:
    """Hash password with salt"""
    salt = SECRET_KEY[:16]
    return hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
```

### Token JWT

El sistema genera tokens seguros con expiración de 24 horas:

```python
TOKEN_EXPIRE_HOURS = 24
```

### Roles

- **admin:** Acceso completo (permisos: `["*"]`)
- **manager:** Ver + editar + reportes
- **viewer:** Solo lectura

---

## Notas Importantes

1. **SECRET_KEY en Producción:**
   - ⚠️ **CAMBIAR** el SECRET_KEY en `/arari-app/api/.env` antes de desplegar en producción
   - Usar un valor seguro generado con: `python3 -c "import secrets; print(secrets.token_hex(32))"`

2. **Password en Producción:**
   - ⚠️ **CAMBIAR** el password por defecto después del primer login
   - Usar el endpoint `/api/auth/change-password`

3. **Archivo .env:**
   - ⚠️ **NO COMMITAR** el archivo `.env` al repositorio Git
   - Agregar `.env` al `.gitignore`

---

## Troubleshooting

### Error: "Credenciales incorrectas"

**Causa:** El SECRET_KEY no se está cargando correctamente.

**Solución:**
1. Verificar que existe el archivo `/arari-app/api/.env`
2. Verificar que `python-dotenv` está instalado: `pip install python-dotenv`
3. Verificar que `main.py` tiene `load_dotenv()` al inicio

### Error: "User account is disabled"

**Causa:** El usuario está desactivado en la base de datos.

**Solución:**
```sql
UPDATE users SET is_active = 1 WHERE username = 'Admin';
```

### Error: Hashes diferentes en cada ejecución

**Causa:** SECRET_KEY se genera aleatoriamente porque .env no se carga.

**Solución:**
1. Crear archivo `.env` con SECRET_KEY fijo
2. Instalar `python-dotenv`
3. Agregar `load_dotenv()` en main.py
4. Reinicializar la base de datos con `init_db()`

---

## Testing

El archivo `test_login.py` incluye 3 tests:

1. **Test 1:** Login con credenciales correctas (Admin/Admin123) → Debe pasar ✅
2. **Test 2:** Login con password incorrecto → Debe fallar ✅
3. **Test 3:** Login con username incorrecto (admin en minúscula) → Debe fallar ✅

**Ejecutar:**
```bash
cd /home/user/Arari-PROv1.0/arari-app/api
python3 test_login.py
```

---

**Última actualización:** 2025-12-12
**Configurado por:** Claude Code Agent
