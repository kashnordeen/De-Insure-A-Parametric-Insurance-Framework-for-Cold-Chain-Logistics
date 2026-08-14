"""
De-Insure End-to-End Simulation Pipeline Test Suite
Simulates ESP32 Hardware Payload -> Ingestion -> PyTorch ML -> 3 Oracle Nodes -> 2/3 Consensus -> Payout.
"""

import sys
import os
import unittest
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.validator import validate_telemetry_packet
from ingestion.db import save_telemetry_record, get_latest_telemetry
from ml.inference import predict_spoilage_risk
from oracle.consensus_engine import ConsensusEngine

class TestE2EPipeline(unittest.TestCase):
    def test_full_pipeline_thermal_excursion_payout(self):
        print("\n--- Running Full End-to-End Simulation ---")

        # 1. ESP32 Hardware Telemetry Payload
        raw_esp32_packet = {
            "data": {
                "device_id": "ESP32_E2E_NODE_01",
                "seq": 101,
                "nonce": 777001,
                "ts": time.time(),
                "temp": 19.8,
                "hum": 82.5,
                "lat": 30.3528,
                "lng": 76.3598,
                "battery": 92
            },
            "sig": "30440220a1b2c3d4e5f678901234567890abcdef1234567890abcdef1234567890abcdef"
        }

        # 2. Ingestion Validation
        is_valid, reason, sanitized = validate_telemetry_packet(raw_esp32_packet)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "VALID_TELEMETRY")

        # 3. Persistence
        save_telemetry_record(sanitized)
        logs = get_latest_telemetry(limit=1)
        self.assertEqual(len(logs), 1)
        self.assertEqual(logs[0]["device_id"], "ESP32_E2E_NODE_01")

        # 4. PyTorch ML Inference
        prob, risk_flag = predict_spoilage_risk([16.5, 18.0, 19.8])
        self.assertTrue(risk_flag)
        self.assertGreaterEqual(prob, 0.5)

        # 5. 3 Independent Oracle Nodes Consensus
        engine = ConsensusEngine()
        res = engine.evaluate_journey_packet(raw_esp32_packet, temp_history=[16.5, 18.0, 19.8])
        
        self.assertTrue(res["consensus_reached"])
        self.assertEqual(res["status"], "CLAIM_APPROVED")
        print(f"  [E2E SUCCESS] Ratio: {res['ratio']} | Decision: {res['status']} | ML Prob: {prob*100:.1f}%")

if __name__ == "__main__":
    unittest.main()
