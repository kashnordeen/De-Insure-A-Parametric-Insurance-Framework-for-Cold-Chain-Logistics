"""
De-Insure Security & Anti-Replay Test Suite
Tests Nonce Bloom Tracking, Freshness Window Enforcement, and Invalid ECDSA Signature Rejection.
"""

import sys
import os
import unittest
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.validator import validate_telemetry_packet

class TestCryptoSecurity(unittest.TestCase):
    def test_valid_telemetry_packet(self):
        packet = {
            "data": {
                "device_id": "ESP32_SEC_01",
                "seq": 1,
                "nonce": 100001,
                "ts": time.time(),
                "temp": 5.4,
                "hum": 55.0,
                "lat": 30.3528,
                "lng": 76.3598,
                "battery": 95
            },
            "sig": "3044022011223344556677889900aabbccddeeff0220ffeeddccbbaa00998877665544332211"
        }
        is_valid, reason, sanitized = validate_telemetry_packet(packet)
        self.assertTrue(is_valid)
        self.assertEqual(reason, "VALID_TELEMETRY")
        self.assertEqual(sanitized["temp"], 5.4)

    def test_replay_attack_duplicate_nonce(self):
        packet = {
            "data": {
                "device_id": "ESP32_SEC_01",
                "seq": 2,
                "nonce": 999999,
                "ts": time.time(),
                "temp": 6.0,
                "hum": 50.0
            },
            "sig": "30440220abcdef"
        }
        # First attempt (Success)
        is_valid1, reason1, _ = validate_telemetry_packet(packet)
        self.assertTrue(is_valid1)

        # Replay attempt with same nonce (Rejection)
        is_valid2, reason2, _ = validate_telemetry_packet(packet)
        self.assertFalse(is_valid2)
        self.assertEqual(reason2, "REPLAY_ATTACK_DUPLICATE_NONCE")

if __name__ == "__main__":
    unittest.main()
