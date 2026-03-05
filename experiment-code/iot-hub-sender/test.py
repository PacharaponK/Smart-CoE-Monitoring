import time
import json
import random
import os
from datetime import datetime, timezone
from azure.iot.device import IoTHubDeviceClient, Message


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

CONNECTION_STRING = os.getenv("IOTHUB_DEVICE_CONNECTION_STRING", "").strip()
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "5"))
DEVICE_IDS = [
    item.strip()
    for item in os.getenv("DEVICE_IDS", "R201,R200,COE,AIE,NETWORK").split(",")
    if item.strip()
]


def extract_device_id(connection_string: str):
    parts = dict(item.split("=", 1) for item in connection_string.split(";"))
    return parts.get("DeviceId")


SENSOR_RANGES = {
    "temperature": (-40.0, 85.0),   # °C
    "humidity":    (0.0,  100.0),   # %RH
}


def quality_status(sensor_type: str, value: float) -> int:
    """Return 1 (Good) if value is within expected range, 0 (Bad) otherwise."""
    if sensor_type in SENSOR_RANGES:
        lo, hi = SENSOR_RANGES[sensor_type]
        return 1 if lo <= value <= hi else 0
    return 1  # unknown sensor type → assume good


def generate_telemetry(device_id: str):
    """
    สร้าง telemetry แบบ flat ตาม Telemetry entity
    1 sensor = 1 message
    """
    # ~30% chance of spiking above 35°C
    if random.random() < 0.3:
        temperature = round(random.uniform(35.0, 45.0), 2)
    else:
        temperature = round(random.uniform(20.0, 34.9), 2)

    # ~40% chance of spiking above 60%RH
    if random.random() < 0.4:
        humidity = round(random.uniform(60.0, 95.0), 2)
    else:
        humidity = round(random.uniform(30.0, 59.9), 2)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    readings = [
        ("temperature", temperature),
        ("humidity",    humidity),
    ]

    messages = [
        {
            "deviceId":      device_id,
            "sensorType":    sensor_type,
            "sensorValue":   value,
            "qualityStatus": quality_status(sensor_type, value),
            "timestamp":     now,
        }
        for sensor_type, value in readings
    ]

    return messages


def send_messages(client, messages):
    for payload in messages:
        message = Message(json.dumps(payload))
        message.content_type = "application/json"
        message.content_encoding = "utf-8"
        message.message_id = str(int(time.time() * 1000))

        client.send_message(message)

        print("Sent message:")
        print(json.dumps(payload, indent=2))
        print("-" * 40)


def main():
    if not CONNECTION_STRING:
        raise ValueError("Missing IOTHUB_DEVICE_CONNECTION_STRING in .env")

    if not DEVICE_IDS:
        raise ValueError("DEVICE_IDS cannot be empty")

    client = IoTHubDeviceClient.create_from_connection_string(CONNECTION_STRING)

    try:
        print("Connecting to Azure IoT Hub...")
        client.connect()
        print("Connected successfully.\n")

        while True:
            device_id = random.choice(DEVICE_IDS)
            messages = generate_telemetry(device_id)
            send_messages(client, messages)
            time.sleep(SEND_INTERVAL)

    except KeyboardInterrupt:
        print("Stopped by user.")

    except Exception as e:
        print("Error occurred:", e)

    finally:
        client.disconnect()
        print("Disconnected.")


if __name__ == "__main__":
    main()