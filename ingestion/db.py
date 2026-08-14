"""
De-Insure Traceable Telemetry Persistence Engine (SQLite)
Stores verifiable telemetry records with sequence IDs, device signatures, and sensor error states.
"""

import sqlite3
import os
import json
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "telemetry_store.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            seq INTEGER,
            nonce INTEGER,
            timestamp REAL,
            updated REAL,
            temp REAL,
            hum REAL,
            lat REAL,
            lng REAL,
            battery INTEGER,
            temp_status TEXT,
            hum_status TEXT,
            gps_status TEXT,
            battery_status TEXT,
            sig TEXT,
            raw_payload TEXT
        )
    """)
    conn.commit()
    conn.close()

def save_telemetry_record(sanitized_data):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO telemetry_logs (
            device_id, seq, nonce, timestamp, updated, temp, hum, lat, lng, battery,
            temp_status, hum_status, gps_status, battery_status, sig, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sanitized_data.get("device_id"),
        sanitized_data.get("seq"),
        sanitized_data.get("nonce"),
        sanitized_data.get("timestamp"),
        sanitized_data.get("updated", time.time()),
        sanitized_data.get("temp"),
        sanitized_data.get("hum"),
        sanitized_data.get("lat"),
        sanitized_data.get("lng"),
        sanitized_data.get("battery"),
        sanitized_data.get("temp_status"),
        sanitized_data.get("hum_status"),
        sanitized_data.get("gps_status"),
        sanitized_data.get("battery_status"),
        sanitized_data.get("sig"),
        json.dumps(sanitized_data)
    ))
    conn.commit()
    conn.close()

def get_latest_telemetry(limit=100):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        SELECT device_id, seq, nonce, timestamp, updated, temp, hum, lat, lng, battery,
               temp_status, hum_status, gps_status, battery_status, sig
        FROM telemetry_logs
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "device_id": r[0],
            "seq": r[1],
            "nonce": r[2],
            "timestamp": r[3],
            "updated": r[4],
            "temp": r[5],
            "hum": r[6],
            "lat": r[7],
            "lng": r[8],
            "battery": r[9],
            "temp_status": r[10],
            "hum_status": r[11],
            "gps_status": r[12],
            "battery_status": r[13],
            "sig": r[14]
        })
    return results

# Initialize database on import
init_db()
