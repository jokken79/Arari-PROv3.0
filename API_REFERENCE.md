# Arari PRO API Reference Guide

API エンドポイント リファレンスガイド

---

## 📌 Important Notes (Updated 2026-01-23)

### ✅ API Endpoints Ready
- All endpoints documented below are implemented and tested in v3.0.0
- Health check endpoint enhanced with response time metrics
- HttpOnly cookie authentication secured
- See [SETUP.md](./SETUP.md) for development API access on `http://localhost:8000/docs`
- Production API: `https://arari-prov20-production.up.railway.app/api/`

---

## 📚 Table of Contents

1. [Authentication](#authentication)
2. [2FA Endpoints](#2fa-endpoints)
3. [Health Check](#health-check)
4. [Common Response Codes](#common-response-codes)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Authentication

### Authentication Method: HttpOnly Cookies

All authenticated endpoints require an HttpOnly cookie set during login.

**Login Request:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }' \
  -c cookies.txt
```

**Using Cookies in Subsequent Requests:**
```bash
curl http://localhost:8000/api/2fa/status \
  -b cookies.txt
```

**Frontend (TypeScript):**
```typescript
const response = await fetch('/api/2fa/status', {
  credentials: 'include',  // Include cookies
  headers: {
    'Content-Type': 'application/json'
  }
})
```

**API Base URLs:**
- Development: `http://localhost:8000/api/`
- Production: `https://arari-prov20-production.up.railway.app/api/`

---

## 2FA Endpoints

### 1. GET `/api/2fa/status` - Check 2FA Status

Get current user's 2FA configuration status.

**Request:**
```bash
curl -X GET http://localhost:8000/api/2fa/status \
  -b cookies.txt
```

**Response (200 OK):**
```json
{
  "is_enabled": false,
  "backup_codes_remaining": 0,
  "created_at": null
}
```

**Response (401 Unauthorized):**
```json
{
  "detail": "Not authenticated"
}
```

### 2. POST `/api/2fa/setup` - Start 2FA Setup

Initiate 2FA setup process. Returns TOTP secret and backup codes.

**Request:**
```bash
curl -X POST http://localhost:8000/api/2fa/setup \
  -b cookies.txt \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "totp_secret": "JBSWY3DPEBLW64TMMQ======",
  "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/admin@arari-pro.local?secret=JBSWY3DPEBLW64TMMQ%3D%3D%3D%3D%3D%3D&issuer=Arari%20PRO",
  "backup_codes": [
    "1234-5678",
    "2345-6789",
    "3456-7890",
    "4567-8901",
    "5678-9012",
    "6789-0123",
    "7890-1234",
    "8901-2345",
    "9012-3456",
    "0123-4567"
  ]
}
```

### 3. POST `/api/2fa/verify` - Verify 2FA Code

Verify TOTP code or backup code to complete setup.

**Request (TOTP):**
```bash
curl -X POST http://localhost:8000/api/2fa/verify \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "method": "totp"
  }'
```

**Request (Backup Code):**
```bash
curl -X POST http://localhost:8000/api/2fa/verify \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1234-5678",
    "method": "backup"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA verification successful"
}
```

**Response (400 Bad Request):**
```json
{
  "detail": "Invalid verification code"
}
```

### 4. POST `/api/2fa/verify-code` - Verify Code During Login

Verify TOTP or backup code when logging in with 2FA enabled.

**Request:**
```bash
curl -X POST http://localhost:8000/api/2fa/verify-code \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "123456",
    "method": "totp"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Code verified successfully",
  "next_redirect": "/dashboard"
}
```

### 5. POST `/api/2fa/disable` - Disable 2FA

Disable 2FA for current user (requires password confirmation).

**Request:**
```bash
curl -X POST http://localhost:8000/api/2fa/disable \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "password": "admin123"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "2FA disabled successfully"
}
```

**Response (401 Unauthorized):**
```json
{
  "detail": "Incorrect password"
}
```

---

## Health Check

### GET `/api/health` - System Health Status

Check backend health and connectivity.

**Request:**
```bash
curl -X GET http://localhost:8000/api/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "version": "3.0.0",
  "timestamp": "2025-01-23T10:30:45.123456",
  "database": "connected",
  "environment": "development",
  "response_time_ms": 15.42,
  "api_endpoints": {
    "docs": "/docs",
    "redoc": "/redoc",
    "openapi": "/openapi.json"
  }
}
```

**Response (degraded - database error):**
```json
{
  "status": "degraded",
  "version": "3.0.0",
  "timestamp": "2025-01-23T10:30:45.123456",
  "database": "error: unable to connect to database",
  "environment": "production",
  "response_time_ms": 2500.15
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "database": "error: database offline"
}
```

---

## Common Response Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 204 | No Content | Success, no response body |
| 400 | Bad Request | Invalid input, malformed JSON |
| 401 | Unauthorized | Missing/invalid auth cookie |
| 403 | Forbidden | User lacks permission (needs admin) |
| 404 | Not Found | Endpoint doesn't exist |
| 409 | Conflict | Resource already exists (2FA already enabled) |
| 429 | Too Many Requests | Rate limited (login attempts) |
| 500 | Server Error | Backend exception |
| 503 | Service Unavailable | Database offline |

---

## Error Handling

### Standard Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Rate Limiting

**Rate Limits:**
- Login endpoint: 5 requests per 60 seconds per IP
- 2FA verification: 10 requests per 60 seconds
- Other endpoints: 100 requests per 60 seconds

**Response (429 Too Many Requests):**
```json
{
  "detail": "Rate limit exceeded. Try again in 30 seconds."
}
```

### Retry Strategy

Implement exponential backoff:

```typescript
async function retryRequest(url: string, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        credentials: 'include',
        ...options
      })

      if (response.ok) return response

      if (response.status === 429) {
        // Rate limited - wait before retry
        const delay = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error

      // Network error - wait before retry
      const delay = Math.pow(2, i) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

---

## Examples

### Example 1: Complete 2FA Setup Flow

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# 2. Start 2FA setup
curl -X POST http://localhost:8000/api/2fa/setup \
  -b cookies.txt \
  -H "Content-Type: application/json"

# 3. (User scans QR code with authenticator app)
# 4. Get TOTP code from authenticator (e.g., 123456)

# 5. Verify code
curl -X POST http://localhost:8000/api/2fa/verify \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","method":"totp"}'

# 6. Check status (should show 2FA enabled)
curl -X GET http://localhost:8000/api/2fa/status \
  -b cookies.txt
```

### Example 2: Login with 2FA

```bash
# 1. Login with credentials
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c cookies.txt

# 2. At this point, 2FA is required
# 3. Get TOTP code from authenticator

# 4. Verify 2FA code
curl -X POST http://localhost:8000/api/2fa/verify-code \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","method":"totp"}'

# 5. Now authenticated with 2FA
curl -X GET http://localhost:8000/api/employees \
  -b cookies.txt
```

### Example 3: Disable 2FA

```bash
# 1. Disable 2FA (requires password)
curl -X POST http://localhost:8000/api/2fa/disable \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}'

# 2. Verify disabled
curl -X GET http://localhost:8000/api/2fa/status \
  -b cookies.txt
```

### Example 4: Use Backup Code

```bash
# If TOTP code is not available, use backup code
curl -X POST http://localhost:8000/api/2fa/verify-code \
  -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{
    "code": "1234-5678",
    "method": "backup"
  }'
```

### Example 5: Health Check Monitoring

```bash
# Simple health check for monitoring (no auth needed)
curl -X GET http://localhost:8000/api/health

# Parse response
curl -s http://localhost:8000/api/health | jq '.status'
# Output: "healthy"

# Check database status
curl -s http://localhost:8000/api/health | jq '.database'
# Output: "connected"

# Monitor response time
curl -s http://localhost:8000/api/health | jq '.response_time_ms'
# Output: 15.42
```

### Example 6: Integration Test Script

```bash
#!/bin/bash
# Integration test script for 2FA API

API_URL="http://localhost:8000/api"
COOKIES="cookies.txt"

echo "🧪 Testing Arari PRO 2FA API..."

# Clean up old cookies
rm -f $COOKIES

# Test 1: Health check
echo -n "✓ Health check... "
curl -s "$API_URL/health" | jq '.status' | grep -q "healthy" && echo "OK" || echo "FAILED"

# Test 2: Login
echo -n "✓ Login... "
curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c $COOKIES | jq '.token' > /dev/null && echo "OK" || echo "FAILED"

# Test 3: Check 2FA status
echo -n "✓ Get 2FA status... "
curl -s -X GET "$API_URL/2fa/status" -b $COOKIES | jq '.is_enabled' > /dev/null && echo "OK" || echo "FAILED"

# Test 4: Start 2FA setup
echo -n "✓ Start 2FA setup... "
curl -s -X POST "$API_URL/2fa/setup" -b $COOKIES -H "Content-Type: application/json" \
  | jq '.backup_codes' > /dev/null && echo "OK" || echo "FAILED"

echo "✅ API integration tests complete!"
```

---

## 🔗 Documentation Links

| Resource | URL |
|----------|-----|
| FastAPI Docs | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| OpenAPI Schema | http://localhost:8000/openapi.json |
| GitHub Repo | https://github.com/jokken79/arari-pro |
| SETUP Guide | ./SETUP.md |
| DEPLOYMENT Guide | ./DEPLOYMENT.md |
| MONITORING Guide | ./MONITORING.md |

---

## ⚠️ Important Notes

1. **Always use HTTPS in production** - Never send credentials over HTTP
2. **Cookies are HttpOnly** - Cannot be accessed by JavaScript (protects from XSS)
3. **CSRF Protection** - Ensure CORS is configured correctly
4. **Rate Limiting** - Login endpoint has strict rate limits
5. **Token Expiration** - Tokens expire after 24 hours (refresh tokens expire after 7 days)

---

**Last Updated:** 2026-01-23
**API Version:** 3.0.0
