#!/usr/bin/env python3
"""
Database Health Check - Análisis completo de arari_pro.db
"""

import sqlite3
import os
from datetime import datetime
from collections import defaultdict

DB_PATH = r"d:\Arari-PROv3.0\arari-app\api\arari_pro.db"

def get_db_connection():
    """Conectarse a la base de datos"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ ERROR: No se pudo conectar a la DB: {e}")
        return None

def print_section(title):
    """Imprime un encabezado de sección"""
    print(f"\n{'='*80}")
    print(f"  {title}")
    print(f"{'='*80}")

def analyze_database():
    """Análisis completo de la base de datos"""
    
    # 1. INFO BÁSICA
    print_section("1️⃣  INFORMACIÓN BÁSICA")
    
    if not os.path.exists(DB_PATH):
        print(f"❌ El archivo NO existe: {DB_PATH}")
        return
    
    size_kb = os.path.getsize(DB_PATH) / 1024
    mod_time = datetime.fromtimestamp(os.path.getmtime(DB_PATH))
    
    print(f"✅ Archivo existe: {DB_PATH}")
    print(f"📊 Tamaño: {size_kb:.2f} KB")
    print(f"⏰ Última modificación: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    
    # 2. TABLAS DISPONIBLES
    print_section("2️⃣  TABLAS DISPONIBLES")
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    tables = cursor.fetchall()
    
    if not tables:
        print("❌ No hay tablas en la base de datos")
        conn.close()
        return
    
    table_dict = {}
    for table in tables:
        table_name = table[0]
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        count = cursor.fetchone()[0]
        table_dict[table_name] = count
        print(f"  📋 {table_name:25} - {count:8} registros")
    
    # 3. REGISTROS EN PAYROLL_RECORDS
    print_section("3️⃣  TABLA 'PAYROLL_RECORDS'")
    
    if 'payroll_records' in table_dict:
        print(f"Total de registros: {table_dict['payroll_records']}")
        
        # Estructura de la tabla
        cursor.execute("PRAGMA table_info(payroll_records)")
        columns = cursor.fetchall()
        print("\nEstructura de columnas:")
        for col in columns:
            print(f"  - {col[1]:25} ({col[2]})")
    else:
        print("⚠️  Tabla 'payroll_records' NO existe")
    
    # 4. REGISTROS EN EMPLOYEES
    print_section("4️⃣  TABLA 'EMPLOYEES'")
    
    if 'employees' in table_dict:
        print(f"Total de registros: {table_dict['employees']}")
        
        cursor.execute("PRAGMA table_info(employees)")
        columns = cursor.fetchall()
        print("\nEstructura de columnas:")
        for col in columns:
            print(f"  - {col[1]:25} ({col[2]})")
    else:
        print("⚠️  Tabla 'employees' NO existe")
    
    # 5. DUPLICADOS (employee_id + period)
    print_section("5️⃣  BÚSQUEDA DE DUPLICADOS")
    
    if 'payroll_records' in table_dict:
        try:
            cursor.execute("""
                SELECT employee_id, period, COUNT(*) as count
                FROM payroll_records
                GROUP BY employee_id, period
                HAVING count > 1
                ORDER BY count DESC
            """)
            duplicates = cursor.fetchall()
            
            if duplicates:
                print(f"⚠️  ENCONTRADOS {len(duplicates)} GRUPOS CON DUPLICADOS:")
                for dup in duplicates:
                    print(f"  - Employee {dup[0]}, Period {dup[1]}: {dup[2]} registros")
            else:
                print("✅ No hay duplicados (employee_id + period)")
        except Exception as e:
            print(f"⚠️  Error al buscar duplicados: {e}")
    
    # 6. VALORES NULL EN CAMPOS CRÍTICOS
    print_section("6️⃣  VALORES NULL EN CAMPOS CRÍTICOS")
    
    if 'payroll_records' in table_dict:
        cursor.execute("PRAGMA table_info(payroll_records)")
        columns = [col[1] for col in cursor.fetchall()]
        
        critical_fields = ['employee_id', 'period', 'gross_salary', 'net_salary']
        null_issues = []
        
        for field in critical_fields:
            if field in columns:
                cursor.execute(f"SELECT COUNT(*) FROM payroll_records WHERE {field} IS NULL")
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    null_issues.append((field, null_count))
                    print(f"⚠️  {field:25} - {null_count} NULLs")
        
        if not null_issues:
            print("✅ No hay NULLs en campos críticos de payroll_records")
    
    if 'employees' in table_dict:
        cursor.execute("PRAGMA table_info(employees)")
        columns = [col[1] for col in cursor.fetchall()]
        
        critical_fields = ['id', 'name', 'employee_number']
        null_issues = []
        
        for field in critical_fields:
            if field in columns:
                cursor.execute(f"SELECT COUNT(*) FROM employees WHERE {field} IS NULL")
                null_count = cursor.fetchone()[0]
                if null_count > 0:
                    null_issues.append((field, null_count))
                    print(f"⚠️  {field:25} - {null_count} NULLs")
        
        if not null_issues:
            print("✅ No hay NULLs en campos críticos de employees")
    
    # 7. INTEGRIDAD DE FOREIGN KEYS
    print_section("7️⃣  INTEGRIDAD DE FOREIGN KEYS")
    
    try:
        if 'payroll_records' in table_dict and 'employees' in table_dict:
            cursor.execute("""
                SELECT COUNT(*) FROM payroll_records pr
                WHERE NOT EXISTS (
                    SELECT 1 FROM employees e WHERE e.id = pr.employee_id
                )
            """)
            orphaned = cursor.fetchone()[0]
            
            if orphaned > 0:
                print(f"⚠️  INTEGRIDAD COMPROMETIDA: {orphaned} registros sin employee relacionado")
                cursor.execute("""
                    SELECT DISTINCT employee_id FROM payroll_records pr
                    WHERE NOT EXISTS (
                        SELECT 1 FROM employees e WHERE e.id = pr.employee_id
                    )
                    LIMIT 10
                """)
                for row in cursor.fetchall():
                    print(f"    - employee_id {row[0]}")
            else:
                print("✅ Todos los payroll_records tienen employee válido")
    except Exception as e:
        print(f"⚠️  Error al verificar FK: {e}")
    
    # 8. REGISTROS RECIENTES (HOY)
    print_section("8️⃣  REGISTROS RECIENTES (HOY)")
    
    today = datetime.now().strftime('%Y-%m-%d')
    
    if 'payroll_records' in table_dict:
        try:
            # Probar diferentes formatos de fecha
            cursor.execute(f"""
                SELECT COUNT(*) FROM payroll_records
                WHERE DATE(created_at) = '{today}' OR DATE(updated_at) = '{today}'
            """)
            recent_count = cursor.fetchone()[0]
            print(f"Payroll records actualizados hoy: {recent_count}")
        except:
            print("⚠️  No se pudo determinar si hay registros de hoy (columnas de fecha no encontradas)")
    
    # 9. DISTRIBUCIÓN DE DATOS
    print_section("9️⃣  DISTRIBUCIÓN DE DATOS")
    
    if 'payroll_records' in table_dict:
        try:
            cursor.execute("SELECT MIN(period), MAX(period), COUNT(DISTINCT period) FROM payroll_records")
            result = cursor.fetchone()
            if result:
                print(f"  Período mínimo: {result[0]}")
                print(f"  Período máximo: {result[1]}")
                print(f"  Períodos únicos: {result[2]}")
            
            cursor.execute("SELECT COUNT(DISTINCT employee_id) FROM payroll_records")
            distinct_emp = cursor.fetchone()[0]
            print(f"  Empleados únicos: {distinct_emp}")
        except Exception as e:
            print(f"⚠️  Error: {e}")
    
    # 10. ESTADÍSTICAS FINANCIERAS
    print_section("🔟  ESTADÍSTICAS FINANCIERAS")
    
    if 'payroll_records' in table_dict:
        try:
            cursor.execute("""
                SELECT 
                    ROUND(SUM(COALESCE(gross_salary, 0)), 2) as total_gross,
                    ROUND(AVG(COALESCE(gross_salary, 0)), 2) as avg_gross,
                    ROUND(SUM(COALESCE(net_salary, 0)), 2) as total_net,
                    ROUND(AVG(COALESCE(net_salary, 0)), 2) as avg_net
                FROM payroll_records
            """)
            stats = cursor.fetchone()
            if stats and stats[0] is not None:
                print(f"Total Gross Salary: ${stats[0]:,.2f}")
                print(f"Promedio Gross: ${stats[1]:,.2f}")
                print(f"Total Net Salary: ${stats[2]:,.2f}")
                print(f"Promedio Net: ${stats[3]:,.2f}")
        except Exception as e:
            print(f"⚠️  Error: {e}")
    
    # 11. CHEQUEO DE INTEGRIDAD
    print_section("1️⃣1️⃣  CHEQUEO DE INTEGRIDAD")
    
    try:
        cursor.execute("PRAGMA integrity_check")
        integrity = cursor.fetchone()[0]
        if integrity == "ok":
            print("✅ INTEGRIDAD: OK - Base de datos íntegra")
        else:
            print(f"❌ INTEGRIDAD: {integrity}")
    except Exception as e:
        print(f"⚠️  Error: {e}")
    
    # 12. ESPACIO UTILIZADO
    print_section("1️⃣2️⃣  USO DE ESPACIO")
    
    try:
        cursor.execute("PRAGMA page_count")
        pages = cursor.fetchone()[0]
        cursor.execute("PRAGMA page_size")
        page_size = cursor.fetchone()[0]
        cursor.execute("PRAGMA freelist_count")
        free_pages = cursor.fetchone()[0]
        
        used_kb = (pages - free_pages) * page_size / 1024
        total_kb = pages * page_size / 1024
        
        print(f"Páginas totales: {pages}")
        print(f"Tamaño página: {page_size} bytes")
        print(f"Páginas usadas: {pages - free_pages}")
        print(f"Espacio usado: {used_kb:.2f} KB")
        print(f"Espacio total: {total_kb:.2f} KB")
    except Exception as e:
        print(f"⚠️  Error: {e}")
    
    # 13. RESUMEN DE SALUD
    print_section("1️⃣3️⃣  RESUMEN DE SALUD DE LA BASE DE DATOS")
    
    health_score = 100
    issues = []
    
    if orphaned > 0:
        health_score -= 20
        issues.append("❌ Integridad comprometida (FKs inválidos)")
    if null_issues:
        health_score -= 15
        issues.append("⚠️  Valores NULL en campos críticos")
    if duplicates:
        health_score -= 10
        issues.append("⚠️  Registros duplicados encontrados")
    
    if health_score >= 90:
        status = "🟢 EXCELENTE"
    elif health_score >= 70:
        status = "🟡 BUENO"
    elif health_score >= 50:
        status = "🟠 ACEPTABLE"
    else:
        status = "🔴 CRÍTICO"
    
    print(f"\n{status}")
    print(f"Puntuación de salud: {health_score}/100")
    
    if issues:
        print(f"\nProblemas encontrados:")
        for issue in issues:
            print(f"  {issue}")
    else:
        print("\n✅ No se encontraron problemas críticos")
    
    print(f"\n📊 Registros totales: {sum(table_dict.values())}")
    print(f"🔍 Tablas: {len(table_dict)}")
    
    # 14. RECOMENDACIONES
    print_section("1️⃣4️⃣  RECOMENDACIONES")
    
    recommendations = []
    
    if size_kb > 1000:
        recommendations.append("💾 Base de datos grande (>1MB) - Considere optimizar índices")
    if table_dict.get('payroll_records', 0) > 10000:
        recommendations.append("📈 Muchos registros - Considere archivar datos antiguos")
    if not null_issues and not duplicates and orphaned == 0:
        recommendations.append("✅ Base de datos saludable - Mantenga realizar backups regulares")
    
    if recommendations:
        for rec in recommendations:
            print(f"  {rec}")
    else:
        print("  ✅ Base de datos en buen estado. Continúe monitoreándola regularmente.")
    
    conn.close()

if __name__ == "__main__":
    analyze_database()
