"""
De-Insure Oracle Service (AWS IoT Core & Web3 Integration)
Subscribes to AWS IoT Core telemetry stream ('deinsure/telemetry'),
runs PyTorch LSTM + XGBoost risk evaluation on incoming sensor streams,
executes smart contract spoilage vote transactions on-chain,
and serves live hardware telemetry to the React Dashboard via CORS HTTP API.
"""

import os
import sys
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure UTF-8 output encoding for Windows compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import torch
import xgboost as xgb
from web3 import Web3
from eth_account import Account
from model import LSTMFeatureExtractor, build_xgboost_classifier

# --- Configuration & Paths ---
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
LSTM_PATH = os.path.join(MODEL_DIR, "lstm_model.pth")
XGB_PATH = os.path.join(MODEL_DIR, "xgboost_model.json")
CONTRACT_JSON_PATH = os.path.join(MODEL_DIR, "../contracts/deployed_contract.json")

# AWS IoT Certificates
AWS_ENDPOINT = os.getenv("AWS_IOT_ENDPOINT", "avlxhxuyvpb4m-ats.iot.eu-north-1.amazonaws.com")
AWS_PORT = 8883
AWS_TOPIC = "deinsure/telemetry"
AWS_ROOT_CA = os.path.join(MODEL_DIR, "certs/AmazonRootCA1.pem")
AWS_CLIENT_CERT = os.path.join(MODEL_DIR, "certs/certificate.pem.crt")
AWS_PRIVATE_KEY = os.path.join(MODEL_DIR, "certs/private.pem.key")

# EVM Node & Oracle Key
RPC_URL = os.getenv("EVM_RPC_URL", "http://127.0.0.1:8545")
ORACLE_PRIVATE_KEY = os.getenv("ORACLE_PRIVATE_KEY", "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d")

# Live telemetry state for Dashboard API (Default updated=0 until real ESP32 publishes)
latest_telemetry = {
    "temp": 0.0,
    "hum": 0.0,
    "lat": 30.3528,
    "lng": 76.3598,
    "battery": 0,
    "sig": "0x",
    "updated": 0
}

class TelemetryAPIHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Consider device online if last MQTT update was within 15 seconds
        is_online = (time.time() - latest_telemetry.get("updated", 0)) < 15.0
        response_data = {
            **latest_telemetry,
            "online": is_online
        }
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def log_message(self, format, *args):
        return

def start_http_api_server():
    server = HTTPServer(('127.0.0.1', 5001), TelemetryAPIHandler)
    print("[Telemetry API] Serving live hardware data at http://127.0.0.1:5001/telemetry...")
    server.serve_forever()

# --- 1. Load Pre-trained ML Models ---
print("[Oracle] Loading ML Models...")
lstm_model = LSTMFeatureExtractor(input_dim=1, hidden_dim=32)
if os.path.exists(LSTM_PATH):
    lstm_model.load_state_dict(torch.load(LSTM_PATH))
    lstm_model.eval()
    print("  [OK] PyTorch LSTM model loaded.")
else:
    print("  [WARN] Warning: lstm_model.pth not found!")

xgb_classifier = build_xgboost_classifier()
if os.path.exists(XGB_PATH):
    xgb_classifier.load_model(XGB_PATH)
    print("  [OK] XGBoost model loaded.")
else:
    print("  [WARN] Warning: xgboost_model.json not found!")

# Telemetry Rolling Buffer (Window size = 60)
WINDOW_SIZE = 60
temp_buffer = []
hum_buffer = []

# --- 2. Web3 Smart Contract Setup ---
print(f"[Oracle] Connecting to Web3 EVM RPC: {RPC_URL}")
w3 = Web3(Web3.HTTPProvider(RPC_URL))
oracle_account = Account.from_key(ORACLE_PRIVATE_KEY)

contract = None
journey_id = 1

if os.path.exists(CONTRACT_JSON_PATH):
    with open(CONTRACT_JSON_PATH, "r") as f:
        contract_data = json.load(f)
        contract_address = contract_data["address"]
        contract_abi = contract_data["abi"]
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        print(f"  [OK] Connected to DeInsure Smart Contract at {contract_address}")
else:
    print(f"  [NOTICE] DeInsure deployed_contract.json not found. Run 'npx hardhat run scripts/deploy.js' first.")

def sanitize_coord(val, default_val, max_limit=90.0):
    if val is None:
        return default_val
    try:
        f = float(val)
        # Standard decimal degrees (e.g. 30.3528° N)
        if abs(f) <= max_limit:
            return f
        # Convert NMEA DDMM.MMMM -> Decimal Degrees (e.g. 3021.168 -> 30.3528)
        deg = int(f / 100.0)
        minutes = f - (deg * 100.0)
        dec = deg + (minutes / 60.0)
        if abs(dec) <= max_limit:
            return dec
        return default_val
    except:
        return default_val

# --- 3. Telemetry Processing & Inference ---
def process_telemetry(payload):
    global temp_buffer, hum_buffer, journey_id, latest_telemetry

    try:
        data = payload.get("data", payload)
        sig = payload.get("sig", "0x")

        temp = float(data.get("temp", data.get("temperature", payload.get("temp", 5.0))))
        hum = float(data.get("hum", data.get("humidity", payload.get("hum", 50.0))))
        lat = sanitize_coord(data.get("lat", data.get("latitude", payload.get("lat", payload.get("latitude")))), 30.3528, 90.0)
        lng = sanitize_coord(data.get("lng", data.get("lon", data.get("longitude", payload.get("lng", payload.get("longitude"))))), 76.3598, 180.0)
        bat_raw = data.get("battery", data.get("bat", payload.get("battery")))
        if bat_raw is not None:
            battery = int(bat_raw)
        else:
            battery = max(10, 98 - int((time.time() % 300) / 10))

        # Update live state for React dashboard
        latest_telemetry = {
            "temp": temp,
            "hum": hum,
            "lat": lat,
            "lng": lng,
            "battery": battery,
            "sig": sig,
            "updated": time.time()
        }

        temp_buffer.append(temp)
        hum_buffer.append(hum)

        if len(temp_buffer) > WINDOW_SIZE:
            temp_buffer.pop(0)
            hum_buffer.pop(0)

        print(f"[Telemetry Ingested] Temp: {temp:.2f} °C | Hum: {hum:.2f}% | Lat: {lat:.4f} | Lng: {lng:.4f} | Bat: {battery}%")

        # Check immediate spoilage condition or run ML window prediction
        is_spoiled = False

        if temp > 15.0:
            is_spoiled = True
            print("  [ALERT] Spoilage Alert: Temperature threshold exceeded (>15.0 °C)!")

        if len(temp_buffer) == WINDOW_SIZE:
            seq_t = torch.tensor(np.array(temp_buffer).reshape(1, WINDOW_SIZE, 1), dtype=torch.float32)
            with torch.no_grad():
                lstm_feats = lstm_model(seq_t).numpy()
            
            static_feats = np.array([[max(hum_buffer), 0.0]])
            xgb_input = np.hstack((lstm_feats, static_feats))

            pred = xgb_classifier.predict(xgb_input)[0]
            if pred == 1:
                is_spoiled = True
                print("  [ALERT] Spoilage Alert: ML Degradation Model predicts cargo spoilage!")

        # Execute Smart Contract Vote if spoilage detected & contract ready
        if is_spoiled and contract is not None:
            submit_oracle_vote(journey_id, is_spoiled, data, sig)

    except Exception as e:
        print(f"[Error processing telemetry]: {e}")

def submit_oracle_vote(journey_id, is_spoiled, data, sig_hex):
    try:
        print(f"[Oracle] Submitting Spoilage Vote on-chain for Journey #{journey_id}...")

        telemetry_str = json.dumps(data, separators=(',', ':'))
        telemetry_hash = w3.keccak(text=telemetry_str)

        device_address = Account.from_key("0x47e179ec197488593b1379d37000742a676255146c820ed34e2182061266e792").address

        nonce = w3.eth.get_transaction_count(oracle_account.address)
        txn = contract.functions.submitSpoilageVote(
            journey_id,
            is_spoiled,
            telemetry_hash,
            bytes.fromhex(sig_hex.replace("0x", "")) if sig_hex.startswith("0x") else b"",
            device_address
        ).build_transaction({
            'from': oracle_account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })

        signed_txn = w3.eth.account.sign_transaction(txn, private_key=ORACLE_PRIVATE_KEY)
        raw_tx = getattr(signed_txn, 'raw_transaction', getattr(signed_txn, 'rawTransaction', None))
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        print(f"  [OK] On-chain transaction sent! Tx Hash: {w3.to_hex(tx_hash)}")

    except Exception as e:
        print(f"  [WARN] Transaction failed: {e}")

# --- 4. MQTT Client Connection (AWS & Local Fallback) ---
def start_mqtt_listener():
    import paho.mqtt.client as mqtt

    # Start HTTP API Server in background thread
    api_thread = threading.Thread(target=start_http_api_server, daemon=True)
    api_thread.start()

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("[MQTT] Connected successfully to AWS IoT Core!")
            print("  -> Subscribing to 'deinsure/telemetry'...")
            client.subscribe("deinsure/telemetry")
            print("  -> Subscribing to 'esp32/telemetry'...")
            client.subscribe("esp32/telemetry")
            print("  -> Subscribing to '+/telemetry' wildcard...")
            client.subscribe("+/telemetry")
        else:
            print(f"[MQTT] Connection failed with code {rc}")

    def on_message(client, userdata, msg):
        try:
            print(f"\n[AWS MQTT Packet Received on '{msg.topic}']")
            payload_str = msg.payload.decode('utf-8')
            payload = json.loads(payload_str)
            process_telemetry(payload)
        except Exception as e:
            print(f"[MQTT Error]: {e}")

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, client_id="DeInsure_Oracle_Listener")
    except Exception:
        client = mqtt.Client(client_id="DeInsure_Oracle_Listener")
    client.on_connect = on_connect
    client.on_message = on_message

    if os.path.exists(AWS_ROOT_CA) and os.path.exists(AWS_CLIENT_CERT) and os.path.exists(AWS_PRIVATE_KEY):
        print(f"[MQTT] Configuring TLS 1.2 for AWS IoT Core at {AWS_ENDPOINT}:{AWS_PORT}...")
        client.tls_set(
            ca_certs=AWS_ROOT_CA,
            certfile=AWS_CLIENT_CERT,
            keyfile=AWS_PRIVATE_KEY
        )
        client.connect(AWS_ENDPOINT, AWS_PORT, keepalive=60)
    else:
        print(f"[MQTT] AWS certs not found in 'ml/certs/'. Falling back to local/HiveMQ broker on port 1883...")
        client.connect("broker.hivemq.com", 1883, keepalive=60)

    print("[Oracle Daemon] Started listening for hardware telemetry...")
    client.loop_forever()

if __name__ == "__main__":
    start_mqtt_listener()
