"""
De-Insure Cross-Platform Master Launcher
Launches:
1. Ingestion Server & SQLite Telemetry Persistence (Port 5001)
2. 3 Independent Oracle Worker Nodes (Node A, Node B, Node C)
3. React + Vite Web Dashboard (Port 5173)
"""

import os
import sys
import subprocess
import time
import webbrowser

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 65)
    print("  De-Insure Enterprise Master System Launcher")
    print("=" * 65)

    python_exe = sys.executable

    # 1. Start Ingestion API Daemon (Port 5001)
    print("\n[1/3] Launching AWS IoT Telemetry Ingestion & Oracle Server (Port 5001)...")
    ingestion_cmd = [python_exe, os.path.join(root_dir, "ml", "oracle_aws.py")]
    ingestion_proc = subprocess.Popen(ingestion_cmd, cwd=root_dir)

    time.sleep(2)

    # 2. Start Dashboard Dev Server (Port 5173)
    dashboard_dir = os.path.join(root_dir, "dashboard")
    print("[2/3] Launching React + Vite Web Dashboard (Port 5173)...")
    npm_cmd = "npm run dev"
    dashboard_proc = subprocess.Popen(npm_cmd, shell=True, cwd=dashboard_dir)

    time.sleep(3)

    # 3. Open Web Dashboard in Browser
    print("[3/3] Opening Web Dashboard at http://localhost:5173/ ...")
    webbrowser.open("http://localhost:5173/")

    print("\n[SYSTEM ACTIVE] All De-Insure services are running smoothly.")
    print("Press Ctrl+C in this terminal to shut down all background services.\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down De-Insure background services...")
        ingestion_proc.terminate()
        dashboard_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
