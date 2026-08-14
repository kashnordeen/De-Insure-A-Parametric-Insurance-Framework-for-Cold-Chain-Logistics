# 🛡️ De-Insure: A Parametric Insurance Framework for Cold Chain Logistics

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PlatformIO](https://img.shields.io/badge/PlatformIO-ESP32-orange.svg)](https://platformio.org/)
[![AWS IoT Core](https://img.shields.io/badge/AWS-IoT%20Core-yellow.svg)](https://aws.amazon.com/iot-core/)
[![PyTorch](https://img.shields.io/badge/PyTorch-ML-ee4c2c.svg)](https://pytorch.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

**De-Insure** is an end-to-end, hardware-to-blockchain parametric insurance ecosystem designed to protect temperature-sensitive cargo (pharmaceuticals, perishable foods, vaccines) during transit. 

By combining real-time IoT physical telemetry, ECDSA cryptographic device signatures, PyTorch machine learning spoilage prediction models, and decentralized 2-out-of-3 Oracle consensus, De-Insure automates instant claim payouts (<2 seconds) directly to cargo owners without manual insurance adjuster delays.

---

## 🌟 Key Features

- 🛰️ **Hardware IoT Telemetry**: Physical ESP32 microcontroller with DHT22 temperature/humidity sensing, NEO-6M GPS 3D satellite tracking, and real-time battery voltage monitoring.
- 🔐 **Cryptographic Security**: Hardware-level ECDSA `secp256k1` digital signatures on SHA-256 telemetry payloads to eliminate data spoofing or MITM tampering.
- ☁️ **Cloud Infrastructure**: Seamless MQTT TLS 1.2 streaming to AWS IoT Core with automated CloudWatch alert rules.
- 🧠 **PyTorch ML Spoilage Model**: Predicts cargo shelf-life degradation and thermal risk vectors in real time.
- ⚡ **Multi-Sig Oracle Vault**: 2-out-of-3 decentralized Oracle consensus triggering instant EVM Smart Contract payout execution.
- 📊 **Real-Time Web Dashboard**: Interactive React + Vite management dashboard featuring live Leaflet GPS map tracking, thermal alert history, and detailed architecture showcases.

---

## 🛠️ Tech Stack

- **Hardware**: ESP32, DHT22, NEO-6M GPS, C++ (PlatformIO)
- **Cloud & IoT**: AWS IoT Core (MQTT over TLS 1.2), Python 3.11
- **Machine Learning**: PyTorch, Scikit-learn, NumPy, Pandas
- **Smart Contracts**: Solidity ^0.8.20, Hardhat, Ethers.js, OpenZeppelin
- **Frontend**: React 18, Vite, Leaflet Maps, Lucide Icons, Vanilla CSS

---

## 🏗️ System Architecture

```text
+-----------------------+      MQTT / TLS 1.2     +------------------------+
|   ESP32 Hardware      | ----------------------> |    AWS IoT Core        |
| (DHT22, GPS, ECDSA)   |                         |  (Broker & CloudWatch) |
+-----------------------+                         +------------------------+
                                                              |
                                                              v
+-----------------------+       HTTP / JSON       +------------------------+
|  React Web Dashboard  | <---------------------- |   Python Oracle API    |
| (Vite, Leaflet Maps)  |                         |  (PyTorch Spoilage ML) |
+-----------------------+                         +------------------------+
                                                              |
                                                              v  2/3 Oracle Consensus
                                                  +------------------------+
                                                  |  EVM Smart Contracts   |
                                                  | (Parametric Escrow)    |
                                                  +------------------------+
```

---

## 🚀 Quick Start & How to Run

De-Insure provides **1-click automated launchers** as well as step-by-step manual execution options.

### ⚡ Method 1: 1-Click Launch (Recommended for Windows)

Double-click the included batch launcher script in the project root:

```cmd
start_deinsure.bat
```

> **What this does automatically:**
> 1. Launches the **Python Oracle AWS Server** in the background.
> 2. Starts the **React + Vite Web Dashboard** local server on `http://localhost:5173/`.
> 3. Automatically opens the dashboard in your default browser!

---

### 🐍 Method 2: Python Master Launcher (Cross-Platform)

Runs seamlessly on Windows, macOS, and Linux:

```bash
python run_all.py
```

---

### 🛠️ Method 3: Manual Step-by-Step Launch

If you prefer running each module individually in separate terminals:

#### 1. Start the React Web Dashboard
```bash
cd dashboard
npm install
npm run dev
```
*Open [http://localhost:5173/](http://localhost:5173/) in your browser.*

#### 2. Start the AWS IoT & ML Oracle Listener
```bash
python ml/oracle_aws.py
```
*Listens to AWS IoT Core MQTT streams and serves the telemetry REST API on `http://127.0.0.1:5001/telemetry`.*

#### 3. Run Smart Contracts Locally (Optional)
```bash
# Terminal 3: Local Hardhat Node
npx hardhat node

# Terminal 4: Deploy Contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### 4. Flash ESP32 Hardware Firmware (PlatformIO)
```bash
cd firmware
pio run --target upload
```

---

## 📂 Repository Structure

```text
De-Insure/
├── dashboard/           # React + Vite Web Dashboard (Leaflet, Charts, Presentation Showcase)
├── firmware/            # ESP32 C++ Firmware (DHT22, GPS, ECDSA, AWS IoT MQTT)
├── ml/                  # PyTorch ML Spoilage Model & Oracle API Server
├── contracts/           # Solidity Smart Contracts (Parametric Insurance Escrow)
├── start_deinsure.bat   # Windows 1-Click Startup Launcher
├── run_all.py           # Cross-Platform Python Master Launcher
├── setup_deinsure.bat   # Automated Setup Script
└── README.md            # Project Documentation
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
