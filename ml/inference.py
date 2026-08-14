"""
De-Insure Real-Time ML Inference Engine
Loads PyTorch Neural Network & Scaler to compute spoilage probabilities.
"""

import os
import torch
import numpy as np
import joblib
try:
    from ml.model import ColdChainSpoilageNN
    from ml.dataset_loader import calculate_mkt
except ImportError:
    from model import ColdChainSpoilageNN
    from dataset_loader import calculate_mkt

MODEL_DIR = os.path.dirname(__file__)
MODEL_PATH = os.path.join(MODEL_DIR, "spoilage_nn.pth")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")

_model_cache = None
_scaler_cache = None

def get_inference_engine():
    global _model_cache, _scaler_cache
    if _model_cache is None:
        model = ColdChainSpoilageNN(input_dim=9)
        if os.path.exists(MODEL_PATH):
            model.load_state_dict(torch.load(MODEL_PATH))
        model.eval()
        _model_cache = model

    if _scaler_cache is None:
        if os.path.exists(SCALER_PATH):
            _scaler_cache = joblib.load(SCALER_PATH)
        else:
            from sklearn.preprocessing import StandardScaler
            _scaler_cache = StandardScaler()
            _scaler_cache.fit(np.zeros((10, 9)))
    return _model_cache, _scaler_cache

def predict_spoilage_risk(temp_history):
    """
    Computes real-time spoilage probability (0.0 to 1.0) for a given telemetry window.
    """
    if not temp_history or len(temp_history) == 0:
        return 0.0, False

    temps = [float(t) for t in temp_history if t is not None]
    if len(temps) == 0:
        return 0.0, False

    mean_temp = float(np.mean(temps))
    max_temp = float(np.max(temps))
    min_temp = float(np.min(temps))
    temp_std = float(np.std(temps)) if len(temps) > 1 else 0.0
    mkt = float(calculate_mkt(temps))
    humidity = 60.0
    duration_minutes = float(len(temps) * 1.0)
    excursion_ratio = float(np.mean([1 if t > 8.0 else 0 for t in temps]))
    critical_spike = 1 if max_temp > 15.0 else 0

    features = np.array([[
        mean_temp, max_temp, min_temp, temp_std, mkt,
        humidity, duration_minutes, excursion_ratio, critical_spike
    ]])

    model, scaler = get_inference_engine()
    try:
        scaled_features = scaler.transform(features)
        tensor_x = torch.tensor(scaled_features, dtype=torch.float32)
        with torch.no_grad():
            prob = float(model(tensor_x).item())
    except Exception:
        prob = 0.95 if max_temp > 15.0 else (0.45 if max_temp > 8.0 else 0.02)

    is_spoilage_risk = prob >= 0.5 or max_temp > 15.0
    return prob, is_spoilage_risk
