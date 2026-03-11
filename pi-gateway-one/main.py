"""gateway-one/main.py — Primary MQTT Edge Gateway → Azure IoT Hub

Flow:
  [Sensor Boards] --MQTT--> [This Gateway] --edge computing--> [Azure IoT Hub]

Topic structure:  sensors/<room>/<sensorType>
  e.g.  sensors/R201/temperature
        sensors/COE/humidity

HA Role: PRIMARY — publish heartbeat every SEND_INTERVAL seconds.
  gateway-two (Standby) monitors this heartbeat and activates when it stops.
"""

import time
import json
import os
import threading
from collections import defaultdict, deque
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

# MQTT Broker (the broker that sensor boards publish to)
MQTT_BROKER_HOST   = os.getenv("MQTT_BROKER_HOST", "localhost")
MQTT_BROKER_PORT   = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_TOPIC_PREFIX  = os.getenv("MQTT_TOPIC_PREFIX", "sensors")
MQTT_USERNAME      = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD      = os.getenv("MQTT_PASSWORD", "")

# ห้องที่รับข้อมูล — subscribe แยก topic ต่อห้อง
ROOMS: list[str] = [
    item.strip()
    for item in os.getenv("ROOMS", "R200,R201,COE,AIE,NETWORK,R302").split(",")
    if item.strip()
]

# Edge computing
SEND_INTERVAL    = int(os.getenv("SEND_INTERVAL", "10"))     # seconds per interval

# Gateway Identity
GATEWAY_ID = os.getenv("GATEWAY_ID", "gateway-one")

# Heartbeat (HA)
HEARTBEAT_TOPIC = os.getenv("HEARTBEAT_TOPIC", "gateway/primary/heartbeat")

# Known sensor operating ranges for quality checks
SENSOR_RANGES: dict[str, tuple[float, float]] = {
    "temperature": (-40.0, 85.0),   # °C
    "humidity":    (0.0,  100.0),   # %RH
}


# ── Edge Computing ────────────────────────────────────────────────────────────

# Per-interval accumulator: {(device_id, sensor_type): list[float]}
# จะถูก clear ทุก SEND_INTERVAL วินาที
_interval_lock = threading.Lock()
_interval_buffer: dict[tuple[str, str], list] = defaultdict(list)


def quality_status(sensor_type: str, value: float) -> int:
    """Return 1 (Good) if value is within the known operating range, 0 (Bad) otherwise."""
    if sensor_type in SENSOR_RANGES:
        lo, hi = SENSOR_RANGES[sensor_type]
        return 1 if lo <= value <= hi else 0
    return 1  # unknown sensor type → assume good


# ── MQTT callbacks ────────────────────────────────────────────────────────────


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        # Subscribe แยกต่อห้อง เช่น sensors/R201/#, sensors/COE/# ...
        for room in ROOMS:
            topic = f"{MQTT_TOPIC_PREFIX}/{room}/#"
            client.subscribe(topic, qos=1)
            print(f"[MQTT] Subscribed to '{topic}'")
        print()
    else:
        print(f"[MQTT] Connection failed: rc={rc}")


def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"[MQTT] Unexpected disconnect (rc={rc}). Will auto-reconnect.")


def on_message(client, userdata, msg):
    """
    รับค่าจาก topic  sensors/<room>/<sensorType>
    แล้วสะสมใน interval buffer เพื่อคำนวณค่าเฉลี่ยทุก SEND_INTERVAL วินาที
    """
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
        print(f"[MQTT] Missing 'value'/'sensorValue' in: {payload}")
        return

    try:
        raw_value = float(raw)
    except (ValueError, TypeError):
        print(f"[MQTT] Non-numeric value '{raw}' from topic '{msg.topic}'")
        return

    with _interval_lock:
        _interval_buffer[(device_id, sensor_type)].append(raw_value)

    print(f"[MQTT] {device_id}/{sensor_type}  raw={raw_value}")


# ── Azure IoT Hub forwarding ──────────────────────────────────────────────────

def flush_to_azure(iot_client: IoTHubDeviceClient) -> None:
    """คำนวณค่าเฉลี่ยของแต่ละห้อง/sensor จาก interval buffer แล้วส่ง Azure และ clear buffer"""
    with _interval_lock:
        if not _interval_buffer:
            return
        # copy และ clear ใน lock เดียวกันเพื่อไม่พลาด reading ที่เข้ามาขณะ flush
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
            f"[Azure] ↑ {device_id}/{sensor_type}  "
            f"avg={avg} (n={len(readings)})  quality={'Good' if quality else 'Bad'}"
        )

    print(f"[Azure] Flushed {sent} message(s). Buffer cleared.\n" + "-" * 50)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    if not CONNECTION_STRING:
        raise ValueError("Missing IOTHUB_DEVICE_CONNECTION_STRING in .env")

    # Azure IoT Hub client
    iot_client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)
    print("[Azure] Connecting to IoT Hub...")
    iot_client.connect()
    print("[Azure] Connected.\n")

    # MQTT client (paho v1 API)
    mqtt_client = mqtt.Client(
        client_id=GATEWAY_ID,
        clean_session=True,
    )
    if MQTT_USERNAME:
        mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD or None)

    # LWT — broker จะ publish "offline" อัตโนมัติถ้า gateway-one หลุดโดยไม่ได้ตั้งใจ
    mqtt_client.will_set(HEARTBEAT_TOPIC, payload="offline", qos=1, retain=True)

    mqtt_client.on_connect    = on_connect
    mqtt_client.on_disconnect = on_disconnect
    mqtt_client.on_message    = on_message
    mqtt_client.reconnect_delay_set(min_delay=1, max_delay=30)

    print(f"[MQTT] Connecting to broker {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} ...")
    mqtt_client.connect(MQTT_BROKER_HOST, MQTT_BROKER_PORT, keepalive=60)
    mqtt_client.loop_start()

    print(f"[Gateway] Running. Forwarding to Azure every {SEND_INTERVAL}s.\n")
    print(f"[HA]      Heartbeat topic: '{HEARTBEAT_TOPIC}'\n")

    try:
        while True:
            time.sleep(SEND_INTERVAL)
            flush_to_azure(iot_client)
            # แจ้งให้ Standby รู้ว่า Primary ยังทำงานอยู่
            mqtt_client.publish(HEARTBEAT_TOPIC, "alive", qos=1, retain=True)
            print(f"[HA] Heartbeat published.")

    except KeyboardInterrupt:
        print("\n[Gateway] Stopped by user.")

    finally:
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        iot_client.disconnect()
        print("[Gateway] Disconnected.")


if __name__ == "__main__":
    main()
