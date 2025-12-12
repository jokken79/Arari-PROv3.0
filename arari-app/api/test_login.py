#!/usr/bin/env python3
"""
Test script para verificar login con credenciales Admin/Admin123
"""

import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

from auth import AuthService
from database import get_connection

def test_login():
    """Prueba de login con credenciales Admin/Admin123"""
    print("=" * 60)
    print("TEST DE LOGIN - Arari PRO")
    print("=" * 60)
    print()

    # Verificar que el SECRET_KEY esté cargado
    secret_key = os.getenv('ARARI_SECRET_KEY')
    if secret_key:
        print(f"✅ SECRET_KEY cargado desde .env: {secret_key[:30]}...")
    else:
        print("⚠️  SECRET_KEY no encontrado en .env (se usará uno aleatorio)")
    print()

    # Conectar a la base de datos
    conn = get_connection()
    auth_service = AuthService(conn)

    # Prueba 1: Login con credenciales correctas
    print("TEST 1: Login con credenciales correctas")
    print("-" * 60)
    print("Username: Admin")
    print("Password: Admin123")
    print()

    result = auth_service.login("Admin", "Admin123")

    if result and "error" not in result:
        print("✅ LOGIN EXITOSO!")
        print()
        print("Información del usuario:")
        print(f"  ID: {result['user']['id']}")
        print(f"  Username: {result['user']['username']}")
        print(f"  Role: {result['user']['role']}")
        print(f"  Full Name: {result['user']['full_name']}")
        print(f"  Email: {result['user']['email']}")
        print()
        print("Token de autenticación:")
        print(f"  Token: {result['token'][:40]}...")
        print(f"  Type: {result['token_type']}")
        print(f"  Expires: {result['expires_at']}")
        print()
        success_1 = True
    else:
        print("❌ LOGIN FALLIDO")
        if result:
            print(f"   Error: {result.get('error', 'Credenciales incorrectas')}")
        else:
            print("   Error: Credenciales incorrectas")
        print()
        success_1 = False

    # Prueba 2: Login con password incorrecto
    print()
    print("TEST 2: Login con password incorrecto (debe fallar)")
    print("-" * 60)
    print("Username: Admin")
    print("Password: WrongPassword")
    print()

    result_wrong = auth_service.login("Admin", "WrongPassword")

    if result_wrong and "error" not in result_wrong:
        print("❌ ERROR: Login debería fallar con password incorrecto")
        success_2 = False
    else:
        print("✅ CORRECTO: Login rechazado con password incorrecto")
        success_2 = True

    print()

    # Prueba 3: Login con username incorrecto
    print()
    print("TEST 3: Login con username incorrecto (debe fallar)")
    print("-" * 60)
    print("Username: admin (minúscula)")
    print("Password: Admin123")
    print()

    result_wrong_user = auth_service.login("admin", "Admin123")

    if result_wrong_user and "error" not in result_wrong_user:
        print("⚠️  ADVERTENCIA: Login con username 'admin' (minúscula) funciona")
        print("    Se esperaba que solo 'Admin' (mayúscula) funcionara")
        success_3 = False
    else:
        print("✅ CORRECTO: Login rechazado con username incorrecto")
        success_3 = True

    print()

    # Resumen
    print("=" * 60)
    print("RESUMEN DE PRUEBAS")
    print("=" * 60)
    print(f"Test 1 (Login correcto):        {'✅ PASS' if success_1 else '❌ FAIL'}")
    print(f"Test 2 (Password incorrecto):   {'✅ PASS' if success_2 else '❌ FAIL'}")
    print(f"Test 3 (Username incorrecto):   {'✅ PASS' if success_3 else '❌ FAIL'}")
    print()

    if success_1 and success_2 and success_3:
        print("🎉 TODAS LAS PRUEBAS PASARON")
        print()
        print("Para usar el sistema:")
        print("  Username: Admin")
        print("  Password: Admin123")
    else:
        print("⚠️  ALGUNAS PRUEBAS FALLARON - Revisar configuración")

    print("=" * 60)

    conn.close()

if __name__ == "__main__":
    test_login()
