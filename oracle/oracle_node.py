"""
De-Insure Independent Oracle Worker Node Service
Runs 3 Independent Oracle Worker Nodes (Node A, Node B, Node C).
"""

import sys
import os
import time

# Add root directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ingestion.validator import validate_telemetry_packet
from ml.inference import predict_spoilage_risk

class OracleNode:
    """
    Independent Oracle Node Worker class.
    Node A: Cryptographic & Sequence Validator
    Node B: PyTorch ML Spoilage Model Evaluator
    Node C: Deterministic Thermal Excursion Policy Validator
    """
    def __init__(self, node_id, node_name, node_address):
        self.node_id = node_id
        self.node_name = node_name
        self.node_address = node_address

    def evaluate_telemetry(self, raw_telemetry_packet, temp_history=None):
        """
        Evaluates incoming telemetry packet according to node specialization.
        Returns: { node_id, node_name, vote: bool, reason: str, confidence: float }
        """
        if self.node_id == "ORACLE_A":
            # Node A: Cryptographic & Sequence Freshness Validation
            is_valid, reason, sanitized = validate_telemetry_packet(raw_telemetry_packet)
            if not is_valid:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": False,
                    "reason": f"Crypto/Schema Rejected: {reason}",
                    "confidence": 1.0
                }
            
            # Check ECDSA signature presence
            sig = sanitized.get("sig", "")
            if not sig or sig == "0x" or len(sig) < 8:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": False,
                    "reason": "Missing or Tampered ECDSA Signature",
                    "confidence": 1.0
                }

            return {
                "node_id": self.node_id,
                "node_name": self.node_name,
                "vote": True,
                "reason": "Hardware Signature & Nonce Freshness Verified",
                "confidence": 1.0
            }

        elif self.node_id == "ORACLE_B":
            # Node B: PyTorch ML Spoilage Probability Risk Inference
            data = raw_telemetry_packet.get("data", raw_telemetry_packet)
            current_temp = data.get("temp", None)
            
            history = temp_history if temp_history else []
            if current_temp is not None:
                history = history + [current_temp]

            prob, is_spoilage_risk = predict_spoilage_risk(history)

            return {
                "node_id": self.node_id,
                "node_name": self.node_name,
                "vote": is_spoilage_risk,
                "reason": f"PyTorch ML Risk Prob: {prob * 100:.1f}%",
                "confidence": round(prob, 4)
            }

        elif self.node_id == "ORACLE_C":
            # Node C: Deterministic Thermal Excursion Threshold Policy Validator
            data = raw_telemetry_packet.get("data", raw_telemetry_packet)
            temp = data.get("temp", None)
            temp_status = data.get("temp_status", "OK")

            if temp_status != "OK" or temp is None:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": False,
                    "reason": f"Sensor Failure: {temp_status}",
                    "confidence": 1.0
                }

            # Thermal Spike Policy Threshold (> 15.0°C)
            if float(temp) > 15.0:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": True,
                    "reason": f"Critical Excursion Exceeded (Temp {temp:.1f}°C > 15.0°C)",
                    "confidence": 1.0
                }
            elif float(temp) > 8.0:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": False,
                    "reason": f"Minor Thermal Warning (Temp {temp:.1f}°C > 8.0°C, under threshold)",
                    "confidence": 0.6
                }
            else:
                return {
                    "node_id": self.node_id,
                    "node_name": self.node_name,
                    "vote": False,
                    "reason": "Optimal Storage Parameters Active",
                    "confidence": 1.0
                }

# Factory Helper
def create_oracle_nodes():
    return [
        OracleNode("ORACLE_A", "Oracle A (Ingest & Crypto Validator)", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"),
        OracleNode("ORACLE_B", "Oracle B (PyTorch ML Evaluator)", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"),
        OracleNode("ORACLE_C", "Oracle C (Policy Rule Validator)", "0x90F79bf6EB2c4f8090B5E0B4966c43F9C5F10080")
    ]
