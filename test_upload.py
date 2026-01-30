#!/usr/bin/env python3
"""
Test completo de upload de Excel de nómina en Arari-PRO
Test suite for salary statement Excel upload
"""

import os
import sys
import time
import requests
from pathlib import Path
from datetime import datetime

# Ruta del archivo Excel de nómina real
EXCEL_FILE = r"d:\Arari-PROv3.0\docs\給与明細(派遣社員)2025.1(0217支給).xlsx"
API_URL = "http://localhost:8877/api/upload"
HEALTH_CHECK_URL = "http://localhost:8877/api/health"

def check_server_health():
    """Verificar si el servidor está corriendo"""
    print("[INFO] Verificando salud del servidor...")
    try:
        response = requests.get(HEALTH_CHECK_URL, timeout=5)
        if response.status_code == 200:
            print(f"[✓] Servidor OK: {response.status_code}")
            return True
    except Exception as e:
        print(f"[✗] Servidor no disponible: {e}")
        return False

def upload_salary_excel(file_path):
    """
    Hacer POST del archivo Excel al endpoint /api/upload
    Procesa la respuesta NDJSON stream
    """
    print(f"\n[INFO] Iniciando upload: {file_path}")
    print(f"[INFO] URL destino: {API_URL}")
    
    if not os.path.exists(file_path):
        print(f"[✗] Archivo no encontrado: {file_path}")
        return False
    
    file_size = os.path.getsize(file_path)
    print(f"[INFO] Tamaño del archivo: {file_size / 1024:.1f} KB")
    
    try:
        with open(file_path, 'rb') as f:
            files = {'file': f}
            print("[INFO] Enviando POST...")
            start_time = time.time()
            
            response = requests.post(
                API_URL,
                files=files,
                timeout=60,
                stream=True  # Para procesar NDJSON streaming
            )
            
            elapsed = time.time() - start_time
            print(f"[✓] Respuesta recibida en {elapsed:.2f}s")
            print(f"[INFO] Status HTTP: {response.status_code}")
            print(f"[INFO] Headers: {dict(response.headers)}")
            
            # Procesar respuesta NDJSON stream
            print("\n" + "="*60)
            print("RESPUESTA DEL SERVIDOR (NDJSON Stream):")
            print("="*60)
            
            records_parsed = 0
            errors = []
            success = False
            
            for line_num, line in enumerate(response.iter_lines(), 1):
                if not line:
                    continue
                
                print(f"\n[Línea {line_num}] {line.decode('utf-8')}")
                
                # Parsear JSON para análisis
                try:
                    import json
                    data = json.loads(line)
                    
                    if 'status' in data:
                        if data['status'] == 'success':
                            success = True
                            print(f"  ✓ Status: SUCCESS")
                        else:
                            print(f"  Status: {data['status']}")
                    
                    if 'parsed_records' in data:
                        records_parsed = data['parsed_records']
                        print(f"  Registros parseados: {records_parsed}")
                    
                    if 'error' in data and data['error']:
                        errors.append(data['error'])
                        print(f"  ✗ Error: {data['error']}")
                    
                    if 'message' in data:
                        print(f"  Mensaje: {data['message']}")
                        
                except json.JSONDecodeError:
                    pass
            
            print("\n" + "="*60)
            print("RESUMEN DEL TEST:")
            print("="*60)
            print(f"Status HTTP: {response.status_code}")
            print(f"Upload exitoso: {'SÍ ✓' if response.status_code in [200, 201, 202] else 'NO ✗'}")
            print(f"Status API: {'SUCCESS ✓' if success else 'FAILED ✗'}")
            print(f"Registros parseados: {records_parsed}")
            print(f"Errores encontrados: {len(errors)}")
            
            if errors:
                print("\nErrores detallados:")
                for idx, err in enumerate(errors, 1):
                    print(f"  {idx}. {err}")
            
            return response.status_code in [200, 201, 202] and success
            
    except requests.exceptions.ConnectionError as e:
        print(f"[✗] Error de conexión: {e}")
        return False
    except Exception as e:
        print(f"[✗] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Función principal"""
    print("="*60)
    print("TEST COMPLETO DE UPLOAD - NÓMINA EXCEL")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Verificar servidor
    if not check_server_health():
        print("\n[⚠] Servidor no disponible. Abortando test.")
        return False
    
    # Hacer upload
    success = upload_salary_excel(EXCEL_FILE)
    
    print("\n" + "="*60)
    if success:
        print("✓ TEST COMPLETADO EXITOSAMENTE")
    else:
        print("✗ TEST FALLIDO")
    print("="*60)
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
