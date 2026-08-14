# 🛡️ De-Insure: Autonomous Cold Chain Parametric Insurance Framework

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PlatformIO](https://img.shields.io/badge/PlatformIO-ESP32-orange.svg)](https://platformio.org/)
[![AWS IoT Core](https://img.shields.io/badge/AWS-IoT%20Core-yellow.svg)](https://aws.amazon.com/iot-core/)
[![PyTorch](https://img.shields.io/badge/PyTorch-ML-ee4c2c.svg)](https://pytorch.org/)
[![Solidity](https://img.shields.io/badge/Solidity-%5E0.8.20-363636.svg)](https://soliditylang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)

**De-Insure** is an enterprise-grade, hardware-to-blockchain parametric insurance ecosystem designed to protect temperature-sensitive cargo (pharmaceuticals, vaccines, perishable foods) during transit. 

By combining real-time IoT physical telemetry, fail-closed sensor policies, hardware ECDSA cryptographic signatures, multi-epoch PyTorch ML spoilage prediction models, and decentralized 2-out-of-3 Oracle consensus, De-Insure automates instant claim payouts (<2 seconds) directly to cargo owners without manual insurance adjuster delays.

---

## 🌟 Architecture & Enterprise Security Highlights

- 🛰️ **Hardware Fail-Closed Policy (`device/`)**: Physical ESP32 microcontroller with DHT22 temperature/humidity sensing, UART2 GPS tracking, and ADC battery monitoring. Rejects dummy fallbacks—explicitly reports `SENSOR_ERROR`, `GPS_UNAVAILABLE`, and `BATTERY_ERROR`.
- 🔐 **Anti-Replay & Cryptographic Defense (`ingestion/`)**: Hardware-level ECDSA `secp256k1` digital signatures on SHA-256 telemetry payloads. Nonce bloom filter tracking and a 60-second timestamp freshness window prevent replay and tampering attacks.
- 🧠 **Multi-Epoch ML Training Pipeline (`ml/`)**: 5-Fold Stratified Cross-Validation across 50 epochs based on WHO/FDA pharmaceutical cold-chain excursion standards (2°C–8°C baseline, Haynes MKT Mean Kinetic Temperature calculations). Exported metrics in `ml/metrics_report.json` report 100% Precision, Recall, F1 Score, and ROC-AUC.
- ⚡ **3 Independent Oracle Worker Nodes (`oracle/`)**:
  - **Oracle Node A**: Ingest & ECDSA Crypto / Freshness Validator.
  - **Oracle Node B**: PyTorch ML Spoilage Evaluator.
  - **Oracle Node C**: Deterministic Thermal Excursion Policy Validator.
- 📜 **Hardened EVM Smart Contracts (`contracts/`)**: Solidity `DeInsure.sol` hardened with OpenZeppelin `ReentrancyGuard`, zero-address validation, non-reentrant payouts, and Hardhat test suite (100% pass rate).
- 📊 **Traceable Web Dashboard (`dashboard/`)**: Interactive React 18 + Vite dashboard with live Leaflet map tracking, 3-Oracle vote status breakdown, and verifiable transaction hashes.
- 🧪 **Comprehensive Automated Test Suite (`tests/`)**: Automated integration tests covering sensor failures, replay attacks, invalid signatures, 2/3 oracle consensus, and end-to-end parametric claim payouts.

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
|  React Web Dashboard  | <---------------------- |  Ingestion & DB Engine |
| (Vite, Leaflet Maps)  |                         |  (Replay & Schema Val) |
+-----------------------+                         +------------------------+
                                                              |
                                                              v
                                                  +------------------------+
                                                  |   3 Independent        |
                                                  |   Oracle Nodes         |
                                                  | (A: Crypto, B: PyTorch |
                                                  |  C: Excursion Policy)  |
                                                  +------------------------+
                                                              |
                                                              v 2/3 On-Chain Consensus
                                                  +------------------------+
                                                  |  EVM Smart Contracts   |
                                                  | (ReentrancyGuard)      |
                                                  +------------------------+
```

---

## 📂 Repository Structure

```text
De-Insure/
├── device/              # ESP32 firmware, fail-closed drivers, hardware ECDSA signing
├── ingestion/           # MQTT subscriber, schema validator, anti-replay nonce DB
├── ml/                  # Real cold-chain WHO/FDA datasets, multi-epoch 5-fold ML pipeline
├── oracle/              # 3 Independent Oracle Worker Services & 2/3 Consensus Engine
├── contracts/           # Hardhat Solidity smart contracts, tests, & testnet deployers
├── dashboard/           # React 18 + Vite dashboard with 3-Oracle vote breakdown & logs
├── tests/               # Automated test suite (crypto, sensors, consensus, E2E)
├── start_deinsure.bat   # Windows 1-Click Startup Launcher
├── run_all.py           # Cross-Platform Master System Launcher
└── README.md            # Project Documentation
```

---

## 🧪 Testing Suite

### 1. Run Smart Contract Unit Tests (Hardhat)
```bash
cd contracts
npx hardhat test
```
*Output: 10 passing tests (100% success).*

### 2. Run Multi-Epoch ML Training & Cross-Validation
```bash
python ml/train.py
```
*Output: Saves model weights to `ml/spoilage_nn.pth` and metrics report to `ml/metrics_report.json`.*

### 3. Run Python Security, Sensor Failure, & E2E Tests
```bash
python -m unittest discover -s tests -v
```
*Output: 7 passing integration & security tests.*

---

## 🚀 Quick Start & How to Run

### ⚡ Method 1: 1-Click Launch (Recommended for Windows)

Double-click the included batch launcher script in the project root:

```cmd
start_deinsure.bat
```

---

### 🐍 Method 2: Python Master Launcher (Cross-Platform)

Runs seamlessly on Windows, macOS, and Linux:

```bash
python run_all.py
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
