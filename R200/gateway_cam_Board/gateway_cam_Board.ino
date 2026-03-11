#include <esp_now.h>
#include <WiFi.h>
#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <math.h>
#include <esp_wifi.h>
#include <PubSubClient.h>

const char* ssid = "PSU WiFi (802.1x)"; 
const char* eap_username = "6610110227";
const char* eap_password = "Por012345_";

const char* mqtt_server       = "172.30.232.53"; 
const int   mqtt_port         = 1883;
const char* mqtt_topic_prefix = "sensors";

WiFiClient espClient;
PubSubClient client(espClient);

RF24 radio(4, 5); 
const byte addrR201[6] = "Node1"; 
const byte addrCoAi[6] = "Node2"; 

typedef struct struct_message {
    char room[10]; 
    float temp; 
    float hum; 
    int rawLight; 
    int rawSound;
} __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

void publishToMQTT(struct_message data) {
    String roomName = String(data.room);
    roomName.trim(); 

    // --- 🛡️ ระบบกรองข้อมูลขยะแบบเข้มงวด (Strict Whitelist Filter) ---
    // ถ้าชื่อห้องไม่ใช่ 3 ห้องนี้ ให้บล็อกและยกเลิกการส่งทันที!
    if (roomName != "R200" && roomName != "R201" && roomName != "Co_Ai") {
        Serial.printf("🚫 บล็อกข้อมูลขยะ (Ghost Data): อ่านชื่อห้องได้ '%s'\n", roomName.c_str());
        return; 
    }
    // -------------------------------------------------------------

    if (!client.connected()) return;
    
    String baseTopic = String(mqtt_topic_prefix) + "/" + roomName + "/";
    float db = (data.rawSound <= 0) ? 30.0 : (20.0 * log10(data.rawSound)) + 35.0; 
    int isLight = (data.rawLight == LOW) ? 1 : 0; 

    client.publish((baseTopic + "temperature").c_str(), ("{\"value\": " + String(data.temp) + "}").c_str());
    client.publish((baseTopic + "humidity").c_str(), ("{\"value\": " + String(data.hum) + "}").c_str());
    client.publish((baseTopic + "light").c_str(), ("{\"value\": " + String(isLight) + "}").c_str());
    client.publish((baseTopic + "sound").c_str(), ("{\"value\": " + String(db) + "}").c_str());
    
    Serial.printf("✅ Gateway Published: Room %s -> Temp:%.1f °C, Sound:%.1f dB\n", roomName.c_str(), data.temp, db);
}

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    if (len == sizeof(incomingData)) {
        memcpy(&incomingData, data, sizeof(incomingData));
        publishToMQTT(incomingData);
    }
}

void setup() {
    Serial.begin(115200);

    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    Serial.printf("\nConnecting to Enterprise Network: %s", ssid);
    WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(1000); Serial.print("."); attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ PSU Wi-Fi Connected!");
        Serial.print("Gateway IP Address: "); Serial.println(WiFi.localIP()); 
        Serial.print(">>> IMPORTANT: Set Node to Channel: "); Serial.println(WiFi.channel()); 
    } else {
        Serial.println("\n❌ Wi-Fi Connection Failed. Rebooting...");
        delay(3000); ESP.restart();
    }

    client.setServer(mqtt_server, mqtt_port);
    
    esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_LR); 
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(OnDataRecv);
    }

    if (radio.begin()) {
        radio.openReadingPipe(1, addrR201); 
        radio.openReadingPipe(2, addrCoAi); 
        radio.startListening();
        Serial.println("✅ nRF24L01 Ready on Gateway (Listening to Node1 & Node2)");
    } else {
        Serial.println("⚠️ Warning: nRF24L01 Not Found on Gateway!");
    }
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        WiFi.disconnect();
        WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);
        delay(5000); return;
    }

    if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = now;
            if (client.connect("Gateway_CoE")) {
                Serial.println("✅ MQTT Connected!");
                lastMqttReconnectAttempt = 0;
            } 
        }
    } else {
        client.loop(); 
    }

    if (radio.available()) {
        radio.read(&incomingData, sizeof(incomingData));
        publishToMQTT(incomingData);
    }
}