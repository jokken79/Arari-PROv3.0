#!/usr/bin/env python3
"""
Database Health Check - Análisis completo de arari_pro.db (VERSIÓN MEJORADA)
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = r"d:\Arari-PROv3.0\arari-app\api\arari_pro.db"

def get_db_connection():
    """Conectarse a la base de datos"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        return None

def analyze_database():
    """Análisis completo de la base de datos"""
    
    # Verificar existencia
    if not os.path.exists(DB_PATH):
        print("ERROR: Base de datos no existe")
        return
    
    size_kb = os.path.getsize(DB_PATH) / 1024
    mod_time = datetime.fromtimestamp(os.path.getmtime(DB_PATH))
    
    print("\n" + "="*80)
    print("DATABASE HEALTH REPORT - REPORTE DE SALUD")
    print("="*80)
    print(f"\nArchivo: {DB_PATH}")
    print(f"Tamaño: {size_kb:.2f} KB")
    print(f"Última actualización: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    conn = get_db_connection()
    if not conn:
        print("ERROR: No se pudo conectar")
        return
    
    cursor = conn.cursor()
    
    # 1. INFORMACIÓN DE TABLAS
    print("\n" + "-"*80)
    print("1. INVENTARIO DE TABLAS")
    print("-"*80)
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    
    table_dict = {}
    total_records = 0
    
    for table in tables:
        table_name = table[0]
        if table_name == 'sqlite_sequence':
            continue
        
        cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
        count = cursor.fetchone()[0]
        table_dict[table_name] = count
        total_records += count
        
        status = "✓" if count > 0 else "○"
        print(f"  {status} {table_name:30} {count:>6} registros")
    
    print(f"\n  TOTAL: {len(table_dict)} tablas, {total_records} registros")
    
    # 2. ANÁLISIS DETALLADO PAYROLL_RECORDS
    print("\n" + "-"*80)
    print("2. TABLA 'PAYROLL_RECORDS' - ANÁLISIS DETALLADO")
    print("-"*80)
    
    payroll_count = table_dict.get('payroll_records', 0)
    print(f"Registros: {payroll_count}")
    
    if payroll_count == 0:
        print("ADVERTENCIA: La tabla está VACÍA - No hay registros de nómina")
    else:
        cursor.execute("SELECT MIN(period), MAX(period), COUNT(DISTINCT period) FROM payroll_records")
        min_period, max_period, unique_periods = cursor.fetchone()
        print(f"Período min: {min_period}")
        print(f"Período max: {max_period}")
        print(f"Períodos únicos: {unique_periods}")
        
        cursor.execute("SELECT COUNT(DISTINCT employee_id) FROM payroll_records")
        unique_emps = cursor.fetchone()[0]
        print(f"Empleados en nómina: {unique_emps}")
    
    # 3. ANÁLISIS DETALLADO EMPLOYEES
    print("\n" + "-"*80)
    print("3. TABLA 'EMPLOYEES' - ANÁLISIS DETALLADO")
    print("-"*80)
    
    emp_count = table_dict.get('employees', 0)
    print(f"Total de empleados: {emp_count}")
    
    if emp_count > 0:
        # Status de empleados
        cursor.execute("""
            SELECT status, COUNT(*) as count
            FROM employees
            GROUP BY status
            ORDER BY count DESC
        """)
        print("\nEmpleados por estado:")
        for row in cursor.fetchall():
            print(f"  {row[0]:15} {row[1]:>5}")
        
        # Departamentos
        cursor.execute("""
            SELECT department, COUNT(*) as count
            FROM employees
            GROUP BY department
            ORDER BY count DESC
            LIMIT 10
        """)
        depts = cursor.fetchall()
        if depts and depts[0][0] is not None:
            print("\nTop 10 departamentos:")
            for row in depts:
                print(f"  {row[0]:25} {row[1]:>5}")
    
    # 4. BÚSQUEDA DE PROBLEMAS
    print("\n" + "-"*80)
    print("4. DETECCIÓN DE PROBLEMAS")
    print("-"*80)
    
    problems = []
    
    # Duplicados
    if payroll_count > 0:
        cursor.execute("""
            SELECT employee_id, period, COUNT(*) as count
            FROM payroll_records
            GROUP BY employee_id, period
            HAVING count > 1
        """)
        dups = cursor.fetchall()
        if dups:
            problems.append(f"DUPLICADOS: {len(dups)} combinaciones employee_id+period duplicadas")
    
    # Foreign Keys
    if payroll_count > 0 and emp_count > 0:
        cursor.execute("""
            SELECT COUNT(*) FROM payroll_records pr
            WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = pr.employee_id)
        """)
        orphaned = cursor.fetchone()[0]
        if orphaned > 0:
            problems.append(f"FK INVÁLIDAS: {orphaned} registros sin employee relacionado")
    
    # NULLs críticos
    if payroll_count > 0:
        cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE employee_id IS NULL")
        if cursor.fetchone()[0] > 0:
            problems.append("NULLS: employee_id contiene NULLs")
        
        cursor.execute("SELECT COUNT(*) FROM payroll_records WHERE period IS NULL")
        if cursor.fetchone()[0] > 0:
            problems.append("NULLS: period contiene NULLs")
    
    if emp_count > 0:
        cursor.execute("SELECT COUNT(*) FROM employees WHERE employee_id IS NULL")
        if cursor.fetchone()[0] > 0:
            problems.append("NULLS: employees.employee_id contiene NULLs")
    
    if problems:
        print("PROBLEMAS ENCONTRADOS:")
        for i, p in enumerate(problems, 1):
            print(f"  {i}. {p}")
    else:
        print("✓ No se encontraron problemas de integridad")
    
    # 5. INTEGRIDAD SQLite
    print("\n" + "-"*80)
    print("5. CHEQUEO DE INTEGRIDAD SQLITE")
    print("-"*80)
    
    cursor.execute("PRAGMA integrity_check")
    integrity = cursor.fetchone()[0]
    print(f"PRAGMA integrity_check: {integrity}")
    
    # 6. INFORMACIÓN DE ALMACENAMIENTO
    print("\n" + "-"*80)
    print("6. ESTADÍSTICAS DE ALMACENAMIENTO")
    print("-"*80)
    
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
    print(f"Páginas libres: {free_pages}")
    print(f"Espacio usado: {used_kb:.2f} KB")
    print(f"Espacio total: {total_kb:.2f} KB")
    
    # 7. ESTADÍSTICAS FINANCIERAS
    print("\n" + "-"*80)
    print("7. ESTADÍSTICAS FINANCIERAS (PAYROLL)")
    print("-"*80)
    
    if payroll_count > 0:
        cursor.execute("""
            SELECT 
                ROUND(SUM(COALESCE(gross_salary, 0)), 2) as total_gross,
                ROUND(AVG(COALESCE(gross_salary, 0)), 2) as avg_gross,
                ROUND(SUM(COALESCE(net_salary, 0)), 2) as total_net,
                ROUND(AVG(COALESCE(net_salary, 0)), 2) as avg_net,
                ROUND(SUM(COALESCE(total_company_cost, 0)), 2) as total_cost
            FROM payroll_records
        """)
        stats = cursor.fetchone()
        if stats[0]:
            print(f"Total Gross Salary: ¥{stats[0]:,.2f}")
            print(f"Promedio Gross: ¥{stats[1]:,.2f}")
            print(f"Total Net Salary: ¥{stats[2]:,.2f}")
            print(f"Promedio Net: ¥{stats[3]:,.2f}")
            print(f"Total Company Cost: ¥{stats[4]:,.2f}")
    else:
        print("No hay datos de nómina para mostrar estadísticas")
    
    # 8. ACTIVIDAD RECIENTE
    print("\n" + "-"*80)
    print("8. ACTIVIDAD RECIENTE")
    print("-"*80)
    
    print(f"Última actualización de DB: {mod_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Buscar registros más recientes
    if payroll_count > 0:
        cursor.execute("SELECT MAX(created_at) FROM payroll_records WHERE created_at IS NOT NULL")
        last_payroll = cursor.fetchone()[0]
        if last_payroll:
            print(f"Último payroll record: {last_payroll}")
    
    if emp_count > 0:
        cursor.execute("SELECT MAX(updated_at) FROM employees WHERE updated_at IS NOT NULL")
        last_emp = cursor.fetchone()[0]
        if last_emp:
            print(f"Última actualización de employees: {last_emp}")
    
    # 9. RESUMEN Y CALIFICACIÓN
    print("\n" + "-"*80)
    print("9. RESUMEN Y CALIFICACIÓN")
    print("-"*80)
    
    health_score = 100
    warnings = []
    
    if payroll_count == 0:
        health_score -= 50
        warnings.append("⚠ CRÍTICO: Tabla payroll_records vacía")
    
    if emp_count == 0:
        health_score -= 40
        warnings.append("⚠ CRÍTICO: Tabla employees vacía")
    
    if problems:
        health_score -= 20
        warnings.append(f"⚠ {len(problems)} problema(s) de integridad detectado(s)")
    
    if integrity != "ok":
        health_score -= 30
        warnings.append(f"⚠ CRÍTICO: Integridad comprometida: {integrity}")
    
    # Calificación visual
    if health_score >= 90:
        rating = "🟢 EXCELENTE"
    elif health_score >= 70:
        rating = "🟡 BUENO"
    elif health_score >= 50:
        rating = "🟠 ACEPTABLE"
    else:
        rating = "🔴 CRÍTICO"
    
    print(f"\nEstado General: {rating}")
    print(f"Puntuación de Salud: {health_score}/100")
    
    if warnings:
        print(f"\nADVERTENCIAS ({len(warnings)}):")
        for w in warnings:
            print(f"  {w}")
    else:
        print("\n✓ No hay advertencias críticas")
    
    # 10. RECOMENDACIONES
    print("\n" + "-"*80)
    print("10. RECOMENDACIONES")
    print("-"*80)
    
    recommendations = []
    
    if payroll_count == 0:
        recommendations.append("⚠ URGENTE: Cargar datos de nómina en payroll_records")
    
    if size_kb > 1000:
        recommendations.append("Considerar vaciar tablas antiguas o hacer VACUUM para optimizar")
    
    if payroll_count > 0 and emp_count > 0:
        ratio = payroll_count / emp_count
        if ratio < 1:
            recommendations.append(f"Bajo ratio de registros por empleado ({ratio:.2f})")
        recommendations.append("✓ Realizar backups regulares de la base de datos")
    
    recommendations.append("✓ Monitorear crecimiento de payroll_records")
    
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
    
    # RESUMEN FINAL
    print("\n" + "="*80)
    print("RESUMEN EJECUTIVO")
    print("="*80)
    print(f"""
    Archivo:               {DB_PATH}
    Tamaño:                {size_kb:.2f} KB
    Tablas:                {len(table_dict)}
    Registros Totales:     {total_records}
    
    PAYROLL_RECORDS:       {payroll_count} registros
    EMPLOYEES:             {emp_count} registros
    
    Estado:                {rating}
    Salud:                 {health_score}/100
    Problemas:             {len(problems)} detectados
    Integridad SQLite:     {integrity}
    
    Última modificación:   {mod_time.strftime('%Y-%m-%d %H:%M:%S')}
""")
    print("="*80 + "\n")
    
    conn.close()

if __name__ == "__main__":
    analyze_database()
