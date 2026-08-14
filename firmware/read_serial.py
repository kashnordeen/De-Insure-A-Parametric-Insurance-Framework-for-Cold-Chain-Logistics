import serial
import time

try:
    ser = serial.Serial('COM3', 115200, timeout=2)
    print("Reading Serial Output from COM3 at 115200 baud...")
    start_time = time.time()
    while time.time() - start_time < 8:
        if ser.in_waiting:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if line:
                print(f"[ESP32 Serial]: {line}")
    ser.close()
except Exception as e:
    print(f"Error opening COM3: {e}")
