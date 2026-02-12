import shutil
import os
import datetime

def backup_data():
    # Define paths (assuming this script is in GEMtracker/backend/)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_file = os.path.join(base_dir, 'gemtracker.db')
    uploads_dir = os.path.join(base_dir, 'uploads')
    
    # Create backups directory if it doesn't exist
    backups_base = os.path.join(base_dir, 'backups')
    if not os.path.exists(backups_base):
        os.makedirs(backups_base)
        print(f"Created backups directory: {backups_base}")

    # Create timestamped folder for this backup
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_folder = os.path.join(backups_base, f"backup_{timestamp}")
    os.makedirs(backup_folder)
    print(f"Created backup folder: {backup_folder}")

    # Backup Database using VACUUM INTO for safer online backup
    if os.path.exists(db_file):
        dst_db = os.path.join(backup_folder, 'gemtracker.db')
        try:
            import sqlite3
            conn = sqlite3.connect(db_file)
            conn.execute(f"VACUUM INTO '{dst_db}'")
            conn.close()
            print(f"Database backed up (VACUUM INTO) to: {dst_db}")
        except Exception as e:
            print(f"Error backing up database with VACUUM INTO: {e}")
            print("Falling back to file copy...")
            try:
                shutil.copy2(db_file, dst_db)
                print(f"Database backed up (copy) to: {dst_db}")
            except Exception as copy_e:
                print(f"Error copying database file: {copy_e}")
    else:
        print(f"Warning: Database file not found at {db_file}")

    # Backup Uploads
    if os.path.exists(uploads_dir):
        dst_uploads = os.path.join(backup_folder, 'uploads')
        shutil.copytree(uploads_dir, dst_uploads)
        print(f"Uploads backed up to: {dst_uploads}")
    else:
        print(f"Warning: Uploads directory not found at {uploads_dir}")

    print("\nBackup completed successfully!")
    print(f"Location: {backup_folder}")

if __name__ == "__main__":
    backup_data()
