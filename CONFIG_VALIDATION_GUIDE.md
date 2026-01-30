# Configuration Validation Guide - 粗利 PRO v3.0

## 🔍 Purpose

This document serves as a reference for AI assistants and developers to prevent common configuration errors when modifying the Arari PRO codebase.

---

## ⚠️ Critical Configuration Rules

### 1. API Base URL Configuration

**Rule:** Always use the centralized config from `arari-app/src/lib/config.ts`

**✅ Correct:**
```typescript
import { API_BASE_URL } from '@/lib/api'
// or
import { API_BASE_URL } from '@/lib/config'

const response = await fetch(`${API_BASE_URL}/api/endpoint`, {
  credentials: 'include'
})
```

**❌ Incorrect:**
```typescript
// NEVER use process.env directly in hooks or components
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/endpoint`)
```

**Files to check:**
- `arari-app/src/hooks/*.ts`
- `arari-app/src/components/**/*.tsx`
- `arari-app/src/app/**/*.tsx`

---

### 2. Authentication Cookie Requirements

**Rule:** Always include `credentials: 'include'` for authenticated endpoints

**✅ Correct:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/upload`, {
  method: 'POST',
  credentials: 'include',  // ← REQUIRED for auth
  body: formData
})
```

**❌ Incorrect:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/upload`, {
  method: 'POST',
  body: formData  // Missing credentials!
})
```

**Protected endpoints (require auth):**
- `/api/upload`
- `/api/import-employees`
- `/api/employees/*` (write operations)
- `/api/payroll/*` (write operations)
- `/api/2fa/*`
- Any endpoint with `Depends(require_auth)` or `Depends(require_admin)`

---

### 3. Docker Environment Configuration

**Rule:** `NEXT_PUBLIC_API_URL` must be browser-accessible, not Docker network hostname

**✅ Correct (docker/.env):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
# Or production domain:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

**❌ Incorrect:**
```bash
NEXT_PUBLIC_API_URL=http://backend:8000  # ← Only works INSIDE Docker network!
```

**Why:** The browser runs on the host machine and cannot resolve Docker service names.

---

### 4. CORS Configuration

**Rule:** Ensure `FRONTEND_URL` matches the actual frontend origin

**Backend (arari-app/api/main.py):**
```python
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
# Must match the origin where frontend is served
```

**Common scenarios:**
- Local dev: `http://localhost:3000`
- Vercel: `https://arari-pro.vercel.app`
- Custom domain: `https://app.yourdomain.com`

**Cookie settings (arari-app/api/auth_dependencies.py):**
- Development: `COOKIE_SECURE=false`, `COOKIE_SAMESITE=lax`
- Production same-origin: `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax`
- Production cross-domain: `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`

---

### 5. Database Path Consistency

**Rule:** Docker volumes must mount the actual database location

**SQLite location:** `arari-app/api/arari_pro.db`

**✅ Correct (docker-compose.yml):**
```yaml
volumes:
  - arari_pro_db:/app/api  # ← Matches DB path
```

**❌ Incorrect:**
```yaml
volumes:
  - arari_pro_db:/var/lib/arari  # ← Wrong path!
```

**Files to verify:**
- `docker/docker-compose.yml`
- `docker-compose.generated.yml`
- `arari-app/api/database_config.py` (DB_PATH)

---

### 6. Script Configuration

**Rule:** Scripts should use environment variables for backend URL and auth

**Python scripts (arari-app/scripts/*.py):**
```python
import os

# Backend URL
url = os.environ.get("ARARI_BACKEND_URL", "http://localhost:8000") + "/api/upload"

# Optional auth token
auth_token = os.environ.get("ARARI_TOKEN", "").strip()
if auth_token:
    headers['Authorization'] = f'Bearer {auth_token}'
```

**Usage:**
```bash
# Set environment variables
set ARARI_BACKEND_URL=http://localhost:8000
set ARARI_TOKEN=your-token-here
python scripts/manual_payroll_upload.py
```

---

## 🔧 Validation Checklist

Before deploying or merging changes, verify:

### Frontend
- [ ] All fetch calls to protected endpoints include `credentials: 'include'`
- [ ] All API calls use `API_BASE_URL` from centralized config
- [ ] No hardcoded `process.env.NEXT_PUBLIC_API_URL` in hooks/components
- [ ] `.env.local` has correct `NEXT_PUBLIC_API_URL` (no `/api` suffix)

### Backend
- [ ] `FRONTEND_URL` env var matches actual frontend origin
- [ ] CORS configuration includes all required origins
- [ ] Cookie settings appropriate for deployment environment
- [ ] Database path in code matches Docker volume mounts

### Docker
- [ ] `NEXT_PUBLIC_API_URL` in docker/.env is browser-accessible
- [ ] Volume mounts point to actual file locations
- [ ] `.env.instance*` files exist for generated compose file

### Scripts
- [ ] Backend URL configurable via environment variable
- [ ] Auth token support added for protected endpoints
- [ ] No hardcoded ports (use env vars or defaults)

---

## 🐛 Common Issues and Solutions

### Issue: "Upload failed: Unauthorized (401)"

**Cause:** Missing `credentials: 'include'` in fetch request

**Fix:**
```typescript
fetch(`${API_BASE_URL}/api/upload`, {
  method: 'POST',
  credentials: 'include',  // ← Add this
  body: formData
})
```

---

### Issue: "Failed to fetch" or CORS error

**Cause:** `NEXT_PUBLIC_API_URL` points to unreachable host

**Fix (Docker):**
```bash
# Change from:
NEXT_PUBLIC_API_URL=http://backend:8000

# To:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

### Issue: 2FA endpoints return undefined URL

**Cause:** Using `process.env.NEXT_PUBLIC_API_URL` directly instead of centralized config

**Fix:**
```typescript
// Change from:
fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/2fa/setup`)

// To:
import { API_BASE_URL } from '@/lib/api'
fetch(`${API_BASE_URL}/api/2fa/setup`)
```

---

### Issue: Database not persisting in Docker

**Cause:** Volume mount path doesn't match actual DB location

**Fix:**
```yaml
# Check database_config.py for actual path (e.g., api/arari_pro.db)
volumes:
  - arari_pro_db:/app/api  # ← Must match DB directory
```

---

## 🤖 AI Assistant Guidelines

When modifying code, always:

1. **Check if endpoint requires authentication**
   - If yes, ensure `credentials: 'include'` is present
   - Look for `Depends(require_auth)` or `Depends(require_admin)` in backend

2. **Use centralized configuration**
   - Never use `process.env` directly for API URLs
   - Import from `@/lib/api` or `@/lib/config`

3. **Validate URL construction**
   - API_BASE_URL should NOT end with `/api`
   - Endpoints should start with `/`
   - Result: `http://localhost:8000/api/endpoint`

4. **Consider deployment environment**
   - Local dev: `localhost`
   - Docker: `localhost` (from host perspective)
   - Production: Full domain with protocol

5. **Test in different environments**
   - Run runtime config validation (check browser console)
   - Test auth flows with cookies
   - Verify CORS settings match deployment

---

## 📝 Automated Validation

**Runtime checks (already implemented in `arari-app/src/lib/config.ts`):**

```typescript
// Warns if API_BASE_URL misconfigured
if (API_BASE_URL.endsWith('/api')) {
  console.warn('[Config] NEXT_PUBLIC_API_URL should not end with /api')
}

if (/^https?:\/\/backend(:\d+)?/i.test(API_BASE_URL)) {
  console.warn('[Config] "backend" hostname not reachable from browser')
}
```

**Check browser console for these warnings after startup!**

---

## 📚 Reference Files

- **API Config:** `arari-app/src/lib/config.ts`
- **API Client:** `arari-app/src/lib/api.ts`
- **Auth Dependencies:** `arari-app/api/auth_dependencies.py`
- **CORS Setup:** `arari-app/api/main.py` (lines 285-315)
- **Database Config:** `arari-app/api/database_config.py`
- **Docker Env:** `docker/.env`
- **Example Env:** `arari-app/.env.example`

---

## ✅ Summary

**Always remember:**
- ✅ Use centralized API_BASE_URL
- ✅ Include credentials for auth endpoints
- ✅ Use browser-accessible URLs in env vars
- ✅ Match Docker volumes to actual paths
- ✅ Check console warnings for config issues

**Never:**
- ❌ Hardcode `process.env.NEXT_PUBLIC_API_URL`
- ❌ Forget `credentials: 'include'` for auth
- ❌ Use Docker hostnames in browser URLs
- ❌ Ignore backend path when mounting volumes
- ❌ Skip environment-specific CORS/cookie config

---

*Last updated: 2026-01-30*
*Document version: 1.0*
