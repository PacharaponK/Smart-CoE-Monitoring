"""gateway-two/main.py — Standby MQTT Edge Gateway → Azure IoT Hub

HA Role: STANDBY (Active-Passive)
  - Subscribe sensor topics เหมือน gateway-one ทุกอย่าง (สะสม buffer ปกติ)
  - Monitor heartbeat ของ Primary ที่ topic  gateway/primary/heartbeat
  - ถ้า Primary alive  → clear buffer โดยไม่ส่ง Azure
  - ถ้า Primary หายไป → เข้า ACTIVE MODE ส่ง Azure แทน
  - ถ้า Primary กลับมา → กลับสู่ STANDBY MODE อัตโนมัติ
"""

import time
import json
import os
import threading
from collections import defaultdict
from datetime import datetime, timezone

import paho.mqtt.client as mqtt
from azure.iot.device import IoTHubDeviceClient, Message


# ── Environment ───────────────────────────────────────────────────────────────

def load_env_file(path: str = ".env"):
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env_file()

# Azure IoT Hub
CONNECTION_STRING = os.getenv("IOTHUB_DEVICE_CONNECTION_STRING", "").strip()

# MQTT Broker
MQTT_BROKER_HOST  = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT  = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_TOPIC_PREFIX = os.getenv("MQTT_TOPIC_PREFIX", "sensors")
MQTT_USERNAME     = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD     = os.getenv("MQTT_PASSWORD", "")

# ห้องที่รับข้อมูล
ROOMS: list[str] = [
    item.strip()
    for item in os.getenv("ROOMS", "R200,R201,COE,AIE,NETWORK,R302").split(",")
    if item.strip()
]

# Edge computing
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "10"))   # seconds per interval

# Gateway Identity
GATEWAY_ID = os.getenv("GATEWAY_ID", "gateway-two")

# HA — Heartbeat config
HEARTBEAT_TOPIC   = os.getenv("HEARTBEAT_TOPIC", "gateway/primary/heartbeat")
HEARTBEAT_TIMEOUT = int(os.getenv("HEARTBEAT_TIMEOUT", "30"))  # วินาที ไม่มี heartbeat → เข้า active


# Known sensor operating ranges for quality checks
SENSOR_RANGES: dict[str, tuple[float, float]] = {
    "temperature": (-40.0, 85.0),   # °C
    "humidity":    (0.0,  100.0),   # %RH
}


# ── HA State ──────────────────────────────────────────────────────────────────

_ha_lock         = threading.Lock()
_last_heartbeat  = time.time()   # สมมติว่า Primary เพิ่งส่งมา ไม่ให้ standby activate ทันที
_primary_alive   = True          # เริ่มต้นถือว่า Primary ทำงานอยู่


def _set_primary_alive(alive: bool) -> None:
    global _primary_alive
    with _ha_lock:
        if _primary_alive == alive:
            return
        _primary_alive = alive
    if alive:
        print("[HA] Primary is back online. Returning to STANDBY mode.")
    else:
        print("[HA] *** PRIMARY DOWN *** Entering ACTIVE mode.")


def _is_primary_alive() -> bool:
    with _ha_lock:
        return _primary_alive


# ── Edge Computing ────────────────────────────────────────────────────────────

_interval_lock   = threading.Lock()
_interval_buffer: dict[tuple[str, str], list] = defaultdict(list)


def quality_status(sensor_type: str, value: float) -> int:
    if sensor_type in SENSOR_RANGES:
        lo, hi = SENSOR_RANGES[sensor_type]
        return 1 if lo <= value <= hi else 0
    return 1


# ── MQTT callbacks ────────────────────────────────────────────────────────────

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        # Subscribe sensor topics ต่อห้อง
        for room in ROOMS:
            topic = f"{MQTT_TOPIC_PREFIX}/{room}/#"
            client.subscribe(topic, qos=1)
            print(f"[MQTT] Subscribed to '{topic}'")

        # Subscribe heartbeat ของ Primary
        client.subscribe(HEARTBEAT_TOPIC, qos=1)
        print(f"[HA]   Subscribed to heartbeat '{HEARTBEAT_TOPIC}'")
        print()
    else:
        print(f"[MQTT] Connection failed: rc={rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"[MQTT] Unexpected disconnect (rc={rc}). Will auto-reconnect.")


def on_message(client, userdata, msg):
    global _last_heartbeat

    # ── Heartbeat handler ──
    if msg.topic == HEARTBEAT_TOPIC:
        status = msg.payload.decode("utf-8", errors="ignore").strip()
        if status == "alive":
            with _ha_lock:
                _last_heartbeat = time.time()
            _set_primary_alive(True)
        elif status == "offline":
            # LWT จาก Primary → เข้า active ทันที ไม่รอ timeout
            _set_primary_alive(False)
        return

    # ── Sensor data handler ──
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        print(f"[MQTT] Bad payload on '{msg.topic}': {exc}")
        return

    topic_parts = msg.topic.split("/")

    device_id = str(
        payload.get("deviceId") or
        (topic_parts[1] if len(topic_parts) > 1 else "unknown")
    )
    sensor_type = str(
        payload.get("sensorType") or
        (topic_parts[2] if len(topic_parts) > 2 else "unknown")
    )

    raw = payload.get("value") if payload.get("value") is not None else payload.get("sensorValue")
    if raw is None:
        return

    try:
        raw_value = float(raw)
    except (ValueError, TypeError):
        return

    with _interval_lock:
        _interval_buffer[(device_id, sensor_type)].append(raw_value)

    print(f"[MQTT] {device_id}/{sensor_type}  raw={raw_value}")


# ── Azure IoT Hub forwarding ──────────────────────────────────────────────────

def flush_to_azure(iot_client: IoTHubDeviceClient) -> None:
    global _last_heartbeat

    # ตรวจสอบ heartbeat timeout (กรณี Primary หยุดส่งโดยไม่ได้ disconnect)
    with _ha_lock:
        elapsed = time.time() - _last_heartbeat

    if elapsed > HEARTBEAT_TIMEOUT:
        _set_primary_alive(False)

    # ถ้า Primary ยังมีชีวิต → clear buffer เงียบๆ ไม่ส่ง Azure
    if _is_primary_alive():
        with _interval_lock:
            _interval_buffer.clear()
        print(f"[Standby] Primary active ({elapsed:.0f}s ago). Buffer cleared.")
        return

    # Primary ดับ → ส่ง Azure แทน
    with _interval_lock:
        if not _interval_buffer:
            return
        snapshot = {k: list(v) for k, v in _interval_buffer.items()}
        _interval_buffer.clear()

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    sent = 0

    for (device_id, sensor_type), readings in snapshot.items():
        avg = round(sum(readings) / len(readings), 4)
        quality = quality_status(sensor_type, avg)

        cloud_payload = {
            "DeviceId":      device_id,
            "SensorType":    sensor_type,
            "SensorValue":   avg,
            "QualityStatus": quality,
            "CreatedAt":     now,
        }
        msg = Message(json.dumps(cloud_payload))
        msg.content_type = "application/json"
        msg.content_encoding = "utf-8"
        msg.message_id = str(int(time.time() * 1000))
        iot_client.send_message(msg)
        sent += 1
        print(
            f"[Active] ↑ {device_id}/{sensor_type}  "
            f"avg={avg} (n={len(readings)})  quality={'Good' if quality else 'Bad'}"
        )

    print(f"[Active] Flushed {sent} message(s). Buffer cleared.\n" + "-" * 50)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if not CONNECTION_STRING:
        raise ValueError("Missing IOTHUB_DEVICE_CONNECTION_STRING in .env")

    iot_client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)
    print("[Azure] Connecting to IoT Hub...")
    iot_client.connect()
    print("[Azure] Connected.\n")

    mqtt_client = mqtt.Client(
        client_id=GATEWAY_ID,
        clean_session=True,
    )
    if MQTT_USERNAME:
        mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD or None)

    mqtt_client.on_connect    = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message    = on_message
    mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

    print(f"[MQTT] Connecting to broker {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} ...")
    mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
    mqtt_client.loop_start()

    print(f"[Gateway-Two] Running in STANDBY mode.")
    print(f"[HA]          Heartbeat topic : '{HEARTBEAT_TOPIC}'")
    print(f"[HA]          Timeout         : {HEARTBEAT_TIMEOUT}s\n")

    try:
        while True:
            time.sleep(SEND_INTERVAL)
            flush_to_azure(iot_client)

    except KeyboardInterrupt:
        print("\n[Gateway-Two] Stopped by user.")

    finally:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        iot_client.disconnect()
        print("[Gateway-Two] Disconnected.")


if __name__ == "__main__":
    main()
