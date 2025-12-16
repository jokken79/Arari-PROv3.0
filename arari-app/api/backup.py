"""
BackupAgent - Database Backup System
Automated backups and restoration for 粗利 PRO
"""

import hashlib
import json
import shutil
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# Backup configuration
BACKUP_DIR = Path(__file__).parent / "backups"
MAX_BACKUPS = 30  # Keep last 30 backups
DB_PATH = Path(__file__).parent / "arari_pro.db"


def init_backup_system():
    """Initialize backup directory"""
    BACKUP_DIR.mkdir(exist_ok=True)


def get_backup_filename(prefix: str = "arari_pro") -> str:
    """Generate backup filename with timestamp"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{prefix}_{timestamp}.db"


def calculate_checksum(file_path: Path) -> str:
    """Calculate MD5 checksum of file"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def validate_backup_filename(filename: str, backup_dir: Path) -> Optional[Path]:
    """
    Validate backup filename to prevent path traversal attacks.
    Returns the safe path if valid, None if invalid.

    Security checks:
    1. No path separators allowed in filename
    2. No parent directory references (..)
    3. Must end with .db extension
    4. Resolved path must be within backup_dir
    """
    import re

    # Reject filenames with path separators or parent references
    if "/" in filename or "\\" in filename or ".." in filename:
        return None

    # Must be a .db file
    if not filename.endswith(".db"):
        return None

    # Only allow safe characters: alphanumeric, underscore, hyphen, dot
    if not re.match(r"^[a-zA-Z0-9_\-\.]+$", filename):
        return None

    # Construct the path
    backup_path = backup_dir / filename

    # Ensure resolved path is within backup_dir (prevent symlink attacks)
    try:
        resolved_path = backup_path.resolve()
        resolved_backup_dir = backup_dir.resolve()

        if not str(resolved_path).startswith(str(resolved_backup_dir)):
            return None

        return backup_path
    except Exception:
        return None


class BackupService:
    """Service for database backups"""

    def __init__(self, db_path: Path = None, backup_dir: Path = None):
        self.db_path = db_path or DB_PATH
        self.backup_dir = backup_dir or BACKUP_DIR
        self.backup_dir.mkdir(exist_ok=True)

    def create_backup(self, description: str = None) -> Dict[str, Any]:
        """Create a new backup"""
        if not self.db_path.exists():
            return {"error": "Database file not found"}

        # Generate filename
        backup_filename = get_backup_filename()
        backup_path = self.backup_dir / backup_filename

        try:
            # Copy database file
            shutil.copy2(self.db_path, backup_path)

            # Calculate checksum
            checksum = calculate_checksum(backup_path)

            # Get file size
            file_size = backup_path.stat().st_size

            # Get record counts
            conn = sqlite3.connect(str(backup_path))
            cursor = conn.cursor()

            cursor.execute("SELECT COUNT(*) FROM employees")
            employee_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM payroll_records")
            payroll_count = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM factory_templates")
            template_count = cursor.fetchone()[0]

            conn.close()

            # Save metadata
            metadata = {
                "filename": backup_filename,
                "created_at": datetime.now().isoformat(),
                "description": description,
                "checksum": checksum,
                "file_size": file_size,
                "records": {
                    "employees": employee_count,
                    "payroll_records": payroll_count,
                    "templates": template_count,
                },
            }

            metadata_path = backup_path.with_suffix(".json")
            with open(metadata_path, "w") as f:
                json.dump(metadata, f, indent=2)

            # Clean old backups
            self.cleanup_old_backups()

            return {"success": True, "backup": metadata}

        except Exception as e:
            return {"error": str(e)}

    def restore_backup(self, backup_filename: str) -> Dict[str, Any]:
        """Restore from a backup"""
        # Validate filename to prevent path traversal attacks
        backup_path = validate_backup_filename(backup_filename, self.backup_dir)

        if backup_path is None:
            return {"error": "Invalid backup filename"}

        if not backup_path.exists():
            return {"error": f"Backup not found: {backup_filename}"}

        try:
            # Verify backup integrity
            metadata_path = backup_path.with_suffix(".json")
            if metadata_path.exists():
                with open(metadata_path) as f:
                    metadata = json.load(f)

                expected_checksum = metadata.get("checksum")
                if expected_checksum:
                    actual_checksum = calculate_checksum(backup_path)
                    if actual_checksum != expected_checksum:
                        return {"error": "Backup file corrupted (checksum mismatch)"}

            # Verify backup is valid SQLite
            test_conn = sqlite3.connect(str(backup_path))
            test_conn.execute("PRAGMA integrity_check")
            test_conn.close()

            # Create backup of current database before restore
            if self.db_path.exists():
                pre_restore_backup = self.db_path.with_suffix(".pre_restore.db")
                shutil.copy2(self.db_path, pre_restore_backup)

            # Restore
            shutil.copy2(backup_path, self.db_path)

            return {
                "success": True,
                "message": f"Restored from {backup_filename}",
                "pre_restore_backup": (
                    str(pre_restore_backup) if self.db_path.exists() else None
                ),
            }

        except sqlite3.DatabaseError:
            return {"error": "Backup file is not a valid SQLite database"}
        except Exception as e:
            return {"error": str(e)}

    def list_backups(self) -> List[Dict[str, Any]]:
        """List all available backups"""
        backups = []

        for backup_file in sorted(self.backup_dir.glob("*.db"), reverse=True):
            metadata_file = backup_file.with_suffix(".json")

            if metadata_file.exists():
                with open(metadata_file) as f:
                    metadata = json.load(f)
            else:
                # Generate basic metadata
                stat = backup_file.stat()
                metadata = {
                    "filename": backup_file.name,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "file_size": stat.st_size,
                    "records": {},
                }

            backups.append(metadata)

        return backups

    def get_backup_info(self, backup_filename: str) -> Optional[Dict[str, Any]]:
        """Get detailed info about a backup"""
        # Validate filename to prevent path traversal attacks
        backup_path = validate_backup_filename(backup_filename, self.backup_dir)

        if backup_path is None or not backup_path.exists():
            return None

        metadata_path = backup_path.with_suffix(".json")

        if metadata_path.exists():
            with open(metadata_path) as f:
                return json.load(f)

        # Generate basic info
        stat = backup_path.stat()
        return {
            "filename": backup_filename,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "file_size": stat.st_size,
        }

    def verify_backup(self, backup_filename: str) -> Dict[str, Any]:
        """Verify backup integrity"""
        # Validate filename to prevent path traversal attacks
        backup_path = validate_backup_filename(backup_filename, self.backup_dir)

        if backup_path is None:
            return {"valid": False, "error": "Invalid backup filename"}

        if not backup_path.exists():
            return {"valid": False, "error": "Backup not found"}

        try:
            # Check SQLite integrity
            conn = sqlite3.connect(str(backup_path))
            cursor = conn.cursor()
            cursor.execute("PRAGMA integrity_check")
            result = cursor.fetchone()[0]
            conn.close()

            if result != "ok":
                return {
                    "valid": False,
                    "error": f"SQLite integrity check failed: {result}",
                }

            # Check checksum if metadata exists
            metadata_path = backup_path.with_suffix(".json")
            if metadata_path.exists():
                with open(metadata_path) as f:
                    metadata = json.load(f)

                expected_checksum = metadata.get("checksum")
                if expected_checksum:
                    actual_checksum = calculate_checksum(backup_path)
                    if actual_checksum != expected_checksum:
                        return {"valid": False, "error": "Checksum mismatch"}

            return {"valid": True, "message": "Backup is valid"}

        except Exception as e:
            return {"valid": False, "error": str(e)}

    def delete_backup(self, backup_filename: str) -> Dict[str, Any]:
        """Delete a backup"""
        # Validate filename to prevent path traversal attacks
        backup_path = validate_backup_filename(backup_filename, self.backup_dir)

        if backup_path is None:
            return {"error": "Invalid backup filename"}

        metadata_path = backup_path.with_suffix(".json")

        if not backup_path.exists():
            return {"error": "Backup not found"}

        try:
            backup_path.unlink()
            if metadata_path.exists():
                metadata_path.unlink()

            return {"success": True, "message": f"Deleted {backup_filename}"}
        except Exception as e:
            return {"error": str(e)}

    def cleanup_old_backups(self, keep: int = None) -> Dict[str, Any]:
        """Remove old backups, keeping only the most recent N"""
        keep = keep or MAX_BACKUPS

        backups = sorted(
            self.backup_dir.glob("*.db"), key=lambda p: p.stat().st_mtime, reverse=True
        )

        deleted = 0
        for backup in backups[keep:]:
            try:
                backup.unlink()
                metadata = backup.with_suffix(".json")
                if metadata.exists():
                    metadata.unlink()
                deleted += 1
            except:
                pass

        return {"kept": min(len(backups), keep), "deleted": deleted}

    def get_backup_stats(self) -> Dict[str, Any]:
        """Get backup statistics"""
        backups = list(self.backup_dir.glob("*.db"))

        if not backups:
            return {"total_backups": 0, "total_size": 0, "oldest": None, "newest": None}

        total_size = sum(b.stat().st_size for b in backups)
        oldest = min(backups, key=lambda p: p.stat().st_mtime)
        newest = max(backups, key=lambda p: p.stat().st_mtime)

        return {
            "total_backups": len(backups),
            "total_size": total_size,
            "total_size_mb": round(total_size / 1024 / 1024, 2),
            "oldest": {
                "filename": oldest.name,
                "date": datetime.fromtimestamp(oldest.stat().st_mtime).isoformat(),
            },
            "newest": {
                "filename": newest.name,
                "date": datetime.fromtimestamp(newest.stat().st_mtime).isoformat(),
            },
        }


def scheduled_backup():
    """Function to be called by scheduler for automatic backups"""
    service = BackupService()
    result = service.create_backup(description="Scheduled automatic backup")

    if result.get("success"):
        print(f"[BACKUP] Created: {result['backup']['filename']}")
    else:
        print(f"[BACKUP] Failed: {result.get('error')}")

    return result
