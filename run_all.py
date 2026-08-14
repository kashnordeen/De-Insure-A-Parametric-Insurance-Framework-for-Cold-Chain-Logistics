import subprocess
import time
import webbrowser
import sys
import os

def main():
    print("=" * 60)
    print("  LAUNCHING DE-INSURE PARAMETRIC COLD-CHAIN PLATFORM  ")
    print("=" * 60)

    root_dir = os.path.dirname(os.path.abspath(__file__))

    # 1. Start Python Oracle Daemon
    print("[1/3] Starting Python Telemetry Oracle API (Port 5001)...")
    oracle_script = os.path.join(root_dir, "ml", "oracle_aws.py")
    oracle_proc = subprocess.Popen([sys.executable, oracle_script])

    # 2. Start Vite Web Dashboard
    print("[2/3] Starting React Web Dashboard (Port 5173)...")
    dashboard_dir = os.path.join(root_dir, "dashboard")
    dashboard_proc = subprocess.Popen(["npm", "run", "dev"], cwd=dashboard_dir, shell=True)

    # 3. Wait 3s and open browser
    time.sleep(3)
    print("[3/3] Opening Web Dashboard at http://localhost:5173/ ...")
    webbrowser.open("http://localhost:5173/")

    print("\n" + "=" * 60)
    print("  DE-INSURE PLATFORM IS NOW OPERATIONAL!  ")
    print("  - Dashboard: http://localhost:5173/")
    print("  - Oracle API: http://127.0.0.1:5001/telemetry")
    print("  (Press Ctrl+C to stop all services)")
    print("=" * 60 + "\n")

    try:
        oracle_proc.wait()
        dashboard_proc.wait()
    except KeyboardInterrupt:
        print("\nShutting down De-Insure platform services...")
        oracle_proc.terminate()
        dashboard_proc.terminate()
        print("Shutdown complete.")

if __name__ == "__main__":
    main()
