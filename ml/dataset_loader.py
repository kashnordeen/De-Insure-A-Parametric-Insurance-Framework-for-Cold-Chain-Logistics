"""
De-Insure Cold Chain Dataset Loader & Excursion Generator
Based on WHO & FDA Pharmaceutical Cold Chain Standards:
- Baseline Cold Chain Storage Window: 2.0°C to 8.0°C
- Excursion Thresholds: > 8.0°C (Minor Excursion), > 15.0°C (Critical Spoilage Spike)
- Mean Kinetic Temperature (MKT) & Cumulative Thermal Stress Calculation
"""

import numpy as np
import pandas as pd
import math

def calculate_mkt(temperatures, activation_energy_kj=83.144):
    """
    Calculates Mean Kinetic Temperature (MKT) in Celsius according to Haynes equation.
    dH = 83.144 kJ/mol (standard activation energy for pharmaceutical degradation)
    R = 8.314472 J/(mol*K)
    """
    if len(temperatures) == 0:
        return 5.0
    R = 8.314472
    dH = activation_energy_kj * 1000.0
    
    kelvin = [t + 273.15 for t in temperatures]
    exp_sum = np.mean([np.exp(-dH / (R * k)) for k in kelvin])
    mkt_kelvin = -dH / (R * np.log(exp_sum))
    return mkt_kelvin - 273.15

def generate_cold_chain_dataset(samples=2000, seed=42):
    """
    Generates realistic cold-chain time-series dataset with WHO/FDA excursion characteristics.
    Returns DataFrame with features and binary 'spoilage_label'.
    """
    np.random.seed(seed)
    data = []

    for i in range(samples):
        # 50% normal shipment, 50% excursion shipment
        is_spoilage = 1 if i < (samples // 2) else 0

        if is_spoilage:
            # Excursion scenario
            mean_temp = np.random.uniform(9.0, 22.0)
            temp_std = np.random.uniform(1.5, 4.5)
            duration_minutes = np.random.uniform(15.0, 180.0)
            max_temp = mean_temp + np.random.uniform(2.0, 8.0)
            hum = np.random.uniform(65.0, 95.0)
        else:
            # Optimal cold chain (2°C - 8°C)
            mean_temp = np.random.uniform(3.0, 6.5)
            temp_std = np.random.uniform(0.2, 0.9)
            duration_minutes = np.random.uniform(0.0, 10.0)
            max_temp = np.random.uniform(5.0, 7.8)
            hum = np.random.uniform(45.0, 65.0)

        # Generate 15-minute telemetry window profile
        temp_window = np.random.normal(mean_temp, temp_std, 15)
        temp_window = np.clip(temp_window, -5.0, 40.0)

        mkt = calculate_mkt(temp_window)
        excursion_ratio = np.mean([1 if t > 8.0 else 0 for t in temp_window])
        critical_spike = 1 if max_temp > 15.0 else 0

        data.append({
            "mean_temp": float(np.mean(temp_window)),
            "max_temp": float(max_temp),
            "min_temp": float(np.min(temp_window)),
            "temp_std": float(temp_std),
            "mkt": float(mkt),
            "humidity": float(hum),
            "duration_minutes": float(duration_minutes),
            "excursion_ratio": float(excursion_ratio),
            "critical_spike": int(critical_spike),
            "spoilage_label": int(is_spoilage)
        })

    df = pd.DataFrame(data)
    return df
