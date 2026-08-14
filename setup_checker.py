import os
import sys
import shutil
import subprocess
import threading
import time
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

# --- Config & Dependencies ---
REQUIRED_PYTHON_PKGS = [
    ("torch", "torch"),
    ("xgboost", "xgboost"),
    ("scikit-learn", "sklearn"),
    ("pandas", "pandas"),
    ("numpy", "numpy"),
    ("imbalanced-learn", "imblearn"),
    ("paho-mqtt", "paho.mqtt"),
    ("web3", "web3"),
    ("eth-account", "eth_account")
]

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
DASHBOARD_DIR = os.path.join(ROOT_DIR, "dashboard")
CONTRACTS_DIR = os.path.join(ROOT_DIR, "contracts")
ML_DIR = os.path.join(ROOT_DIR, "ml")
ENV_FILE = os.path.join(ROOT_DIR, ".env")
ENV_EXAMPLE = os.path.join(ROOT_DIR, ".env.example")
DEPLOYED_CONTRACT = os.path.join(CONTRACTS_DIR, "deployed_contract.json")

class DeInsureSetupApp:
    def __init__(self, root):
        self.root = root
        self.root.title("De-Insure System Readiness & Portable Launcher")
        self.root.geometry("820x680")
        self.root.minsize(780, 620)
        self.root.configure(bg="#0f172a") # Dark Slate Blue

        # Custom Styling
        self.style = ttk.Style()
        self.style.theme_use("clam")
        self.style.configure("TFrame", background="#0f172a")
        self.style.configure("Header.TLabel", background="#0f172a", foreground="#38bdf8", font=("Segoe UI", 16, "bold"))
        self.style.configure("SubHeader.TLabel", background="#0f172a", foreground="#94a3b8", font=("Segoe UI", 10))
        self.style.configure("Section.TLabelframe", background="#1e293b", foreground="#f8fafc")
        self.style.configure("Section.TLabelframe.Label", background="#1e293b", foreground="#38bdf8", font=("Segoe UI", 11, "bold"))
        self.style.configure("Item.TLabel", background="#1e293b", foreground="#f1f5f9", font=("Segoe UI", 10))

        self.statuses = {}
        self.is_running = False

        self.build_ui()
        self.run_all_checks()

    def build_ui(self):
        # Header Container
        header_frame = ttk.Frame(self.root, padding="15 15 15 10")
        header_frame.pack(fill="x")

        lbl_title = ttk.Label(header_frame, text="🛡️ De-Insure Platform Portable Setup & Checker", style="Header.TLabel")
        lbl_title.pack(anchor="w")

        lbl_sub = ttk.Label(header_frame, text="Verifies PC requirements, installs dependencies, & launches the parametric insurance system.", style="SubHeader.TLabel")
        lbl_sub.pack(anchor="w", pady=(2, 0))

        # Main Scrollable / Grid Frame
        content_frame = ttk.Frame(self.root, padding="15 5 15 5")
        content_frame.pack(fill="both", expand=True)

        # Section 1: System Tools & Runtime
        sys_group = ttk.LabelFrame(content_frame, text=" System Tools & Runtimes ", style="Section.TLabelframe", padding=12)
        sys_group.pack(fill="x", pady=6)

        self.lbl_python = ttk.Label(sys_group, text="Python 3.x: Checking...", style="Item.TLabel")
        self.lbl_python.pack(anchor="w", pady=2)
        self.lbl_node = ttk.Label(sys_group, text="Node.js: Checking...", style="Item.TLabel")
        self.lbl_node.pack(anchor="w", pady=2)
        self.lbl_npm = ttk.Label(sys_group, text="npm Package Manager: Checking...", style="Item.TLabel")
        self.lbl_npm.pack(anchor="w", pady=2)

        # Section 2: Python Libraries & Config Files
        pkg_group = ttk.LabelFrame(content_frame, text=" Python Packages & Configuration ", style="Section.TLabelframe", padding=12)
        pkg_group.pack(fill="x", pady=6)

        self.lbl_py_deps = ttk.Label(pkg_group, text="Python AI & Web3 Packages: Checking...", style="Item.TLabel")
        self.lbl_py_deps.pack(anchor="w", pady=2)
        self.lbl_dash_deps = ttk.Label(pkg_group, text="React Dashboard (node_modules): Checking...", style="Item.TLabel")
        self.lbl_dash_deps.pack(anchor="w", pady=2)
        self.lbl_env = ttk.Label(pkg_group, text="Environment Configuration (.env): Checking...", style="Item.TLabel")
        self.lbl_env.pack(anchor="w", pady=2)
        self.lbl_contract = ttk.Label(pkg_group, text="Smart Contract JSON (deployed_contract.json): Checking...", style="Item.TLabel")
        self.lbl_contract.pack(anchor="w", pady=2)

        # Section 3: Action Buttons Bar
        btn_frame = ttk.Frame(content_frame, padding="0 10 0 5")
        btn_frame.pack(fill="x")

        self.btn_fix = tk.Button(
            btn_frame, text="🛠️ Install Missing Dependencies", font=("Segoe UI", 10, "bold"),
            bg="#2563eb", fg="white", activebackground="#1d4ed8", activeforeground="white",
            relief="flat", padx=12, pady=6, command=self.on_fix_dependencies
        )
        self.btn_fix.pack(side="left", padx=(0, 10))

        self.btn_env = tk.Button(
            btn_frame, text="📄 Create .env File", font=("Segoe UI", 10),
            bg="#475569", fg="white", activebackground="#334155", activeforeground="white",
            relief="flat", padx=12, pady=6, command=self.on_create_env
        )
        self.btn_env.pack(side="left", padx=(0, 10))

        self.btn_launch = tk.Button(
            btn_frame, text="🚀 START DE-INSURE PLATFORM", font=("Segoe UI", 11, "bold"),
            bg="#16a34a", fg="white", activebackground="#15803d", activeforeground="white",
            relief="flat", padx=18, pady=6, command=self.on_launch_platform
        )
        self.btn_launch.pack(side="right")

        # Section 4: Installation & Output Log Console
        log_group = ttk.LabelFrame(content_frame, text=" Output & Setup Log ", style="Section.TLabelframe", padding=8)
        log_group.pack(fill="both", expand=True, pady=8)

        self.log_text = scrolledtext.ScrolledText(
            log_group, height=8, bg="#090d16", fg="#38bdf8",
            insertbackground="white", font=("Consolas", 9), wrap="word"
        )
        self.log_text.pack(fill="both", expand=True)
        self.log_msg("De-Insure Setup Tool Initialized. Scanning system...\n")

    def log_msg(self, msg):
        self.log_text.insert(tk.END, msg + "\n")
        self.log_text.see(tk.END)

    def run_command(self, cmd, cwd=None):
        self.log_msg(f"> Executing: {cmd}")
        process = subprocess.Popen(
            cmd, cwd=cwd, shell=True,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
        )
        for line in iter(process.stdout.readline, ''):
            if line:
                self.log_msg(line.strip())
        process.wait()
        return process.returncode

    # --- System Readiness Checking ---
    def find_and_register_node_path(self):
        # Common Windows Node.js paths
        possible_node_dirs = [
            r"C:\Program Files\nodejs",
            r"C:\Program Files (x86)\nodejs",
            os.path.expandvars(r"%AppData%\npm"),
            os.path.expandvars(r"%LocalAppData%\Programs\node")
        ]
        for ndir in possible_node_dirs:
            if os.path.exists(ndir) and ndir.lower() not in os.environ.get("PATH", "").lower():
                os.environ["PATH"] = ndir + os.pathsep + os.environ["PATH"]

    def check_cmd(self, command):
        try:
            res = subprocess.run(command, shell=True, capture_output=True, text=True)
            return res.returncode == 0, res.stdout.strip()
        except Exception:
            return False, ""

    def run_all_checks(self):
        self.find_and_register_node_path()

        # 1. Check Python
        py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        if sys.version_info.major >= 3:
            self.lbl_python.config(text=f"Python: ✅ INSTALLED (v{py_ver})", foreground="#4ade80")
            self.statuses['python'] = True
        else:
            self.lbl_python.config(text="Python: ❌ NOT FOUND / UNSUPPORTED", foreground="#f87171")
            self.statuses['python'] = False

        # 2. Check Node.js
        node_ok, node_out = self.check_cmd("node -v")
        if node_ok:
            self.lbl_node.config(text=f"Node.js: ✅ INSTALLED ({node_out})", foreground="#4ade80")
            self.statuses['node'] = True
        else:
            self.lbl_node.config(text="Node.js: ❌ NOT FOUND (Required for React Dashboard)", foreground="#f87171")
            self.statuses['node'] = False

        # 3. Check npm
        npm_ok, npm_out = self.check_cmd("npm -v")
        if npm_ok:
            self.lbl_npm.config(text=f"npm Package Manager: ✅ INSTALLED (v{npm_out})", foreground="#4ade80")
            self.statuses['npm'] = True
        else:
            self.lbl_npm.config(text="npm: ❌ NOT FOUND", foreground="#f87171")
            self.statuses['npm'] = False

        # 4. Check Python packages
        missing_py_pkgs = []
        for pkg_name, module_name in REQUIRED_PYTHON_PKGS:
            try:
                __import__(module_name)
            except ImportError:
                missing_py_pkgs.append(pkg_name)

        if not missing_py_pkgs:
            self.lbl_py_deps.config(text="Python AI & Web3 Packages: ✅ ALL INSTALLED", foreground="#4ade80")
            self.statuses['py_pkgs'] = True
        else:
            self.lbl_py_deps.config(
                text=f"Python Packages: ⚠️ MISSING {len(missing_py_pkgs)} ({', '.join(missing_py_pkgs[:3])}...)",
                foreground="#fbbf24"
            )
            self.statuses['py_pkgs'] = False

        # 5. Check Dashboard node_modules
        dash_node_modules = os.path.join(DASHBOARD_DIR, "node_modules")
        if os.path.exists(dash_node_modules):
            self.lbl_dash_deps.config(text="React Dashboard Dependencies: ✅ INSTALLED (node_modules present)", foreground="#4ade80")
            self.statuses['dashboard'] = True
        else:
            self.lbl_dash_deps.config(text="React Dashboard Dependencies: ⚠️ MISSING (node_modules not found)", foreground="#fbbf24")
            self.statuses['dashboard'] = False

        # 6. Check .env File
        if os.path.exists(ENV_FILE):
            self.lbl_env.config(text="Environment Config (.env): ✅ READY", foreground="#4ade80")
            self.statuses['env'] = True
        else:
            self.lbl_env.config(text="Environment Config (.env): ⚠️ MISSING (Click 'Create .env File')", foreground="#fbbf24")
            self.statuses['env'] = False

        # 7. Check Deployed Contract JSON
        if os.path.exists(DEPLOYED_CONTRACT):
            self.lbl_contract.config(text="Smart Contract JSON: ✅ DEPLOYED CONTRACT FOUND", foreground="#4ade80")
            self.statuses['contract'] = True
        else:
            self.lbl_contract.config(text="Smart Contract JSON: ⚠️ MISSING contracts/deployed_contract.json", foreground="#fbbf24")
            self.statuses['contract'] = False

        # Status Summary
        all_ready = (
            self.statuses.get('python') and
            self.statuses.get('node') and
            self.statuses.get('py_pkgs') and
            self.statuses.get('dashboard') and
            self.statuses.get('env')
        )
        if all_ready:
            self.log_msg("✅ ALL SYSTEM CHECKS PASSED! Click 'START DE-INSURE PLATFORM' to run.")
        else:
            self.log_msg("⚠️ Some requirements or packages are missing. Click 'Install Missing Dependencies' to resolve automatically.")

    # --- Actions ---
    def on_create_env(self):
        if os.path.exists(ENV_FILE):
            messagebox.showinfo("Config Ready", ".env file already exists!")
            return
        if os.path.exists(ENV_EXAMPLE):
            shutil.copy(ENV_EXAMPLE, ENV_FILE)
            self.log_msg("📄 Created .env file from .env.example successfully.")
            self.run_all_checks()
            messagebox.showinfo("Success", ".env file created successfully!")
        else:
            messagebox.showerror("Error", ".env.example file was not found in the root directory.")

    def on_fix_dependencies(self):
        def worker():
            self.btn_fix.config(state="disabled")
            self.btn_launch.config(state="disabled")

            # 1. Install missing Python packages
            missing_py_pkgs = []
            for pkg_name, module_name in REQUIRED_PYTHON_PKGS:
                try:
                    __import__(module_name)
                except ImportError:
                    missing_py_pkgs.append(pkg_name)

            if missing_py_pkgs:
                self.log_msg(f"\n📦 Installing Python packages: {' '.join(missing_py_pkgs)}...")
                cmd = f'"{sys.executable}" -m pip install ' + ' '.join(missing_py_pkgs)
                self.run_command(cmd)

            # 2. Install Dashboard node_modules if missing
            dash_node_modules = os.path.join(DASHBOARD_DIR, "node_modules")
            if not os.path.exists(dash_node_modules):
                if self.statuses.get('node') and self.statuses.get('npm'):
                    self.log_msg("\n📦 Installing React Dashboard Node.js modules (npm install)...")
                    self.run_command("npm install", cwd=DASHBOARD_DIR)
                else:
                    self.log_msg("❌ Cannot install dashboard dependencies because Node.js or npm is missing.")

            # 3. Create .env if missing
            if not os.path.exists(ENV_FILE) and os.path.exists(ENV_EXAMPLE):
                shutil.copy(ENV_EXAMPLE, ENV_FILE)
                self.log_msg("📄 Auto-created .env file from template.")

            self.log_msg("\n✅ Dependency setup process finished!")
            self.root.after(0, self.finish_fix)

        threading.Thread(target=worker, daemon=True).start()

    def finish_fix(self):
        self.btn_fix.config(state="normal")
        self.btn_launch.config(state="normal")
        self.run_all_checks()

    def on_launch_platform(self):
        if not self.statuses.get('node'):
            messagebox.showerror("Node.js Required", "Node.js is missing! Please install Node.js (https://nodejs.org) to run the Web Dashboard.")
            return

        if not self.statuses.get('py_pkgs'):
            if not messagebox.askyesno("Warning", "Some Python packages are still missing. Do you want to try launching anyway?"):
                return

        self.log_msg("\n🚀 Launching De-Insure Parametric Platform...")

        # 1. Launch Oracle Service
        oracle_script = os.path.join(ML_DIR, "oracle_aws.py")
        self.log_msg("[1/2] Starting Telemetry Oracle API daemon (Port 5001)...")
        subprocess.Popen([sys.executable, oracle_script])

        # 2. Launch Vite React Dashboard
        self.log_msg("[2/2] Starting React Web Dashboard (Port 5173)...")
        subprocess.Popen("npm run dev", cwd=DASHBOARD_DIR, shell=True)

        # 3. Open Browser
        time.sleep(3)
        webbrowser.open("http://localhost:5173/")
        self.log_msg("\n========================================================")
        self.log_msg("  DE-INSURE PLATFORM IS NOW OPERATIONAL!")
        self.log_msg("  - Web Dashboard: http://localhost:5173/")
        self.log_msg("  - Telemetry Oracle: http://127.0.0.1:5001/telemetry")
        self.log_msg("========================================================\n")
        messagebox.showinfo("De-Insure Running", "De-Insure Platform launched!\n\nDashboard: http://localhost:5173\nOracle API: http://127.0.0.1:5001/telemetry")

if __name__ == "__main__":
    root = tk.Tk()
    app = DeInsureSetupApp(root)
    root.mainloop()
