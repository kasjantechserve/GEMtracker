import uvicorn
import os
import sys

# Add the current directory to sys.path to ensure app module is found
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    try:
        uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
    except Exception as e:
        print(f"Error running server: {e}")
