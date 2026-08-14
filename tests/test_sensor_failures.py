"""
De-Insure Sensor Failure & Fail-Closed Test Suite
Tests handling of SENSOR_ERROR, GPS_UNAVAILABLE, and BATTERY_ERROR payload states.
"""

import sys
import os
import unittest

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.validator import validate_telemetry_packet

class TestSensorFailures(unittest.TestCase):
    def test_dht22_sensor_error_handling(self):
        packet = {
            "data": {
                "device_id": "ESP32_FAIL_01",
                "seq": 10,
                "nonce": 400001,
                "temp_status": "SENSOR_ERROR",
                "hum_status": "SENSOR_ERROR",
                "battery": 90
            },
            "sig": "30440220abcdef"
        }
        is_valid, reason, sanitized = validate_telemetry_packet(packet)
        self.assertTrue(is_valid)
        self.assertIsNone(sanitized["temp"])
        self.assertEqual(sanitized["temp_status"], "SENSOR_ERROR")

    def test_gps_unavailable_handling(self):
        packet = {
            "data": {
                "device_id": "ESP32_FAIL_01",
                "seq": 11,
                "nonce": 400002,
                "temp": 4.5,
                "hum": 50.0,
                "gps_status": "GPS_UNAVAILABLE"
            },
            "sig": "30440220abcdef"
        }
        is_valid, reason, sanitized = validate_telemetry_packet(packet)
        self.assertTrue(is_valid)
        self.assertIsNone(sanitized["lat"])
        self.assertIsNone(sanitized["lng"])
        self.assertEqual(sanitized["gps_status"], "GPS_UNAVAILABLE")

if __name__ == "__main__":
    unittest.main()
