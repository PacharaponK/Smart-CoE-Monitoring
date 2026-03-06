#include <esp_now.h>
#include <WiFi.h>
#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <math.h>
#include <esp_wifi.h>
#include <PubSubClient.h>

// --- ตั้งค่า Wi-Fi ---
const char* ssid = "P0rP!5_Fr33Fl@g";
const char* password = "porpi512345";

// --- ตั้งค่า MQTT ---
const char* mqtt_server       = "192.168.88.251";
const int   mqtt_port         = 1883;
const char* mqtt_user         = "admin";
const char* mqtt_pass         = "1234";
const char* mqtt_topic_prefix = "sensors";

WiFiClient espClient;
PubSubClient client(espClient);

// --- ตั้งค่า nRF24L01 ---
RF24 radio(4, 5); 
const byte nrfAddress[6] = "00001";

typedef struct struct_message {
    char room[10]; 
    float temp; 
    float hum; 
    int rawLight; 
    int rawSound;
} __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

// ฟังก์ชันส่ง MQTT
void publishToMQTT(struct_message data) {
    if (!client.connected()) return;
    
    String baseTopic = String(mqtt_topic_prefix) + "/" + String(data.room) + "/";
    
    float db = (data.rawSound <= 0) ? 30.0 : (20.0 * log10(data.rawSound)) + 35.0; 
    int isLight = (data.rawLight == LOW) ? 1 : 0; 

    client.publish((baseTopic + "temperature").c_str(), ("{\"value\": " + String(data.temp) + "}").c_str());
    client.publish((baseTopic + "humidity").c_str(), ("{\"value\": " + String(data.hum) + "}").c_str());
    client.publish((baseTopic + "light").c_str(), ("{\"value\": " + String(isLight) + "}").c_str());
    client.publish((baseTopic + "sound").c_str(), ("{\"value\": " + String(db) + "}").c_str());
    
    Serial.printf("Room %s -> Temp:%.1f dB:%.1f\n", data.room, data.temp, db);
}

// Callback สำหรับ ESP-NOW
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    memcpy(&incomingData, data, sizeof(incomingData));
    publishToMQTT(incomingData);
}

void setup() {
    Serial.begin(115200);

    // 1. เชื่อมต่อ Wi-Fi
    WiFi.mode(WIFI_STA); // ใช้แค่โหมด Station
    Serial.printf("\nConnecting to %s", ssid);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }

    Serial.println("\n✅ Wi-Fi Connected!");
    Serial.print("Gateway IP Address: ");
    Serial.println(WiFi.localIP()); 
    Serial.print(">>> IMPORTANT: Set Node to Channel: ");
    Serial.println(WiFi.channel()); // เอาเลข Channel นี้ไปตั้งในฝั่ง Node (ESP-NOW)

    // 2. ตั้งค่า MQTT
    client.setServer(mqtt_server, mqtt_port);
    
    // 3. ตั้งค่า ESP-NOW
    esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_LR); 
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(OnDataRecv);
        Serial.println("ESP-NOW Initialized");
    }

    // 4. ตั้งค่า nRF24L01
    if (radio.begin()) {
        radio.openReadingPipe(0, nrfAddress);
        radio.startListening();
        Serial.println("nRF24L01 Initialized");
    }
}

void loop() {
    // ระบบเชื่อมต่อ Wi-Fi อัตโนมัติ (กรณีหลุด)
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi Lost. Reconnecting...");
        WiFi.disconnect();
        WiFi.begin(ssid, password);
        delay(5000);
        return;
    }

    // ระบบเชื่อมต่อ MQTT แบบ Non-blocking
    if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = now;
            Serial.println("Attempting MQTT connection...");
            if (client.connect("Gateway_CoE", mqtt_user, mqtt_pass)) {
                Serial.println("✅ MQTT Connected!");
                lastMqttReconnectAttempt = 0;
            } else {
                Serial.print("❌ MQTT Connect failed, rc=");
                Serial.println(client.state());
            }
        }
    } else {
        client.loop(); 
    }

    // ตรวจสอบข้อมูลจาก nRF24L01
    if (radio.available()) {
        radio.read(&incomingData, sizeof(incomingData));
        publishToMQTT(incomingData);
    }
}