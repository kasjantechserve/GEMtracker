import sqlite3

def migrate():
    conn = sqlite3.connect('gemtracker.db')
    cursor = conn.cursor()

    try:
        cursor.execute("ALTER TABLE tenders ADD COLUMN nickname VARCHAR")
        conn.commit()
        print("Added nickname column.")
    except sqlite3.OperationalError:
        print("Nickname column already exists.")

    try:
        cursor.execute("ALTER TABLE tenders ADD COLUMN file_path VARCHAR")
        conn.commit()
        print("Added file_path column.")
    except sqlite3.OperationalError:
        print("File_path column already exists.")

    conn.close()

if __name__ == "__main__":
    migrate()
