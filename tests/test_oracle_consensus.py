"""
De-Insure 2-of-3 Multi-Oracle Consensus Test Suite
Tests Oracle Node A, B, C evaluations and 2-of-3 consensus threshold execution.
"""

import sys
import os
import unittest
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from oracle.consensus_engine import ConsensusEngine

class TestOracleConsensus(unittest.TestCase):
    def setUp(self):
        self.engine = ConsensusEngine()

    def test_optimal_shipment_consensus_rejection(self):
        packet = {
            "data": {
                "device_id": "ESP32_CONS_01",
                "seq": 1,
                "nonce": 500001,
                "ts": time.time(),
                "temp": 4.5,
                "hum": 55.0,
                "lat": 30.3528,
                "lng": 76.3598,
                "battery": 98
            },
            "sig": "3044022011223344556677889900aabbccddeeff"
        }
        res = self.engine.evaluate_journey_packet(packet, temp_history=[4.2, 4.5, 4.8, 5.0])
        self.assertFalse(res["consensus_reached"])
        self.assertEqual(res["spoilage_votes"], 0)
        self.assertEqual(res["status"], "CLAIM_REJECTED")

    def test_critical_thermal_spike_consensus_approval(self):
        packet = {
            "data": {
                "device_id": "ESP32_CONS_01",
                "seq": 2,
                "nonce": 500002,
                "ts": time.time(),
                "temp": 22.5,  # Exceeds 15.0°C threshold
                "hum": 85.0,
                "lat": 30.3528,
                "lng": 76.3598,
                "battery": 95
            },
            "sig": "3044022011223344556677889900aabbccddeeff"
        }
        res = self.engine.evaluate_journey_packet(packet, temp_history=[16.0, 18.5, 20.2, 22.5])
        self.assertTrue(res["consensus_reached"])
        self.assertGreaterEqual(res["spoilage_votes"], 2)
        self.assertEqual(res["status"], "CLAIM_APPROVED")

if __name__ == "__main__":
    unittest.main()
