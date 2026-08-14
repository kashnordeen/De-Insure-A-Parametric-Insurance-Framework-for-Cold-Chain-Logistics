import numpy as np
import pandas as pd
import random

# Arrhenius constants for synthetic simulation
# Formula: k = A * exp(-E_a / (R * T))
A = 1e8         # Pre-exponential factor
E_a = 50000     # Activation energy (J/mol)
R = 8.314       # Universal gas constant (J/(mol*K))

# We define spoilage when Cumulative Shelf-Life Fraction S(t) drops below 0.10.
# S(0) = 1.0. At each step dt, S(t) = S(t-dt) - k * dt
# Note: For our scaled simulation, we adjust dt and A to simulate degradation over a journey.

NUM_SAMPLES = 2000
dt = 0.02 # Simulation timestep (hours) adjusted to prevent baseline spoilage

def calculate_k(temp_celsius):
    temp_kelvin = temp_celsius + 273.15
    return A * np.exp(-E_a / (R * temp_kelvin))

def generate_journey(is_spoiled=False):
    length = 100 # Timesteps per journey
    
    # Baseline for normal journey
    base_temp = 5.0 # Celsius (optimal cold chain)
    base_hum = 50.0 # % Humidity
    
    temps = []
    hums = []
    vibs = []
    s_t_list = []
    
    s_t = 1.0 # Initial shelf life fraction
    
    for i in range(length):
        # Normal fluctuations
        current_temp = base_temp + np.random.normal(0, 1)
        current_hum = base_hum + np.random.normal(0, 2)
        current_vib = np.random.exponential(1.0)
        
        # If we need this to be a spoiled journey, inject a massive temperature spike
        if is_spoiled and i > 30 and i < 60:
            current_temp += np.random.uniform(50, 70)
            
        temps.append(current_temp)
        hums.append(current_hum)
        vibs.append(current_vib)
        
        k = calculate_k(current_temp)
        s_t -= (k * dt)
        if s_t < 0: 
            s_t = 0
            
        s_t_list.append(s_t)
        
    spoilage_flag = 1 if s_t_list[-1] < 0.10 else 0
    
    # Ensure our forced class matches the flag (retry if not, simplified here)
    
    return temps, hums, vibs, s_t_list, [spoilage_flag]*length

data = []
# Generate balanced dataset
for _ in range(NUM_SAMPLES // 2):
    t, h, v, s, f = generate_journey(is_spoiled=False)
    for i in range(len(t)):
        data.append([t[i], h[i], v[i], s[i], f[i]])
        
for _ in range(NUM_SAMPLES // 2):
    t, h, v, s, f = generate_journey(is_spoiled=True)
    for i in range(len(t)):
        data.append([t[i], h[i], v[i], s[i], f[i]])

df = pd.DataFrame(data, columns=['temperature', 'humidity', 'vibration', 's_t', 'spoilage_flag'])
df.to_csv('telemetry_data.csv', index=False)
print("Synthetic dataset generated: telemetry_data.csv")
