import os
import shutil
import subprocess

def build_deploy():
    # Paths
    BASE_DIR = os.getcwd()
    FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
    BACKEND_DIR = os.path.join(BASE_DIR, "backend")
    STATIC_DIR = os.path.join(BACKEND_DIR, "static")

    print(f"Building Frontend in {FRONTEND_DIR}...")
    
    # Run npm install (if needed) and build
    # Assuming node_modules exists, skipping install to save time, or we can run it.
    # subprocess.run(["npm", "install"], cwd=FRONTEND_DIR, shell=True, check=True)
    subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, shell=True, check=True)

    # Clean existing static dir
    if os.path.exists(STATIC_DIR):
        print(f"Removing existing static content at {STATIC_DIR}...")
        shutil.rmtree(STATIC_DIR)

    # Copy output to backend/static
    FRONTEND_OUT = os.path.join(FRONTEND_DIR, "out")
    if not os.path.exists(FRONTEND_OUT):
        print("Build failed: 'out' directory not found.")
        return

    print(f"Copying {FRONTEND_OUT} to {STATIC_DIR}...")
    shutil.copytree(FRONTEND_OUT, STATIC_DIR)
    
    print("Deployment preparation complete!")
    print("Run 'python run_backend.py' in backend/ directory to test.")

if __name__ == "__main__":
    build_deploy()
