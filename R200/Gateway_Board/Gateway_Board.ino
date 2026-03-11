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
const byte addrR201[6] = "1Node"; 
const byte addrCoAi[6] = "2Node"; 

typedef struct struct_cmd {
    char room[10]; bool ledState;
} __attribute__((packed)) struct_cmd;

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

bool led_R200 = false;
bool led_R201 = false;
bool led_CoAi = false;
uint8_t broadcastMac[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF}; 

// 🌟 ฟังก์ชันรับค่าจาก MQTT (ศูนย์กลางการตัดสินใจ)
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = "";
    for (int i = 0; i < length; i++) msg += (char)payload[i];
    
    Serial.printf("\n📩 [MQTT] ได้รับคำสั่ง Topic: %s | ข้อความ: %s\n", topic, msg.c_str());

    String topicStr = String(topic);
    if (topicStr.startsWith("threshold/")) {
        int colonIndex = msg.indexOf(':');
        int braceIndex = msg.indexOf('}');
        if (colonIndex != -1 && braceIndex != -1) {
            float val = msg.substring(colonIndex + 1, braceIndex).toFloat();
            bool turnOn = false;
            
            // 🌟 เช็คเงื่อนไข (อุณหภูมิ > 40, ชื้น > 80, เสียง > 90) *เอาแสงออกแล้ว*
            if (topicStr.indexOf("temperature") != -1 && val > 40.0) turnOn = true;
            else if (topicStr.indexOf("humidity") != -1 && val > 80.0) turnOn = true;
            else if (topicStr.indexOf("sound") != -1 && val > 90.0) turnOn = true;

            Serial.printf("🔍 [System] เช็คเงื่อนไข: ค่า = %.2f -> สั่งเตือน = %s\n", val, turnOn ? "ON" : "OFF");

            struct_cmd cmd;
            cmd.ledState = turnOn;

            // 🌟 กระจายคำสั่งไปให้บอร์ดลูกตามห้อง
            if (topicStr.indexOf("R200") != -1) {
                led_R200 = turnOn;
                strcpy(cmd.room, "R200");
                esp_now_send(broadcastMac, (uint8_t *) &cmd, sizeof(cmd)); 
                Serial.printf("🎯 [สั่งการ] ส่งคำสั่ง ESP-NOW ไป R200: %s\n", turnOn ? "ON" : "OFF");
            } 
            else if (topicStr.indexOf("R201") != -1) {
                led_R201 = turnOn;
                Serial.printf("🎯 [สั่งการ] โหลดคำสั่งรอรอบส่ง ACK ให้ R201: %s\n", turnOn ? "ON" : "OFF");
            } 
            else if (topicStr.indexOf("Co_Ai") != -1) {
                led_CoAi = turnOn;
                Serial.printf("🎯 [สั่งการ] โหลดคำสั่งรอรอบส่ง ACK ให้ Co_Ai: %s\n", turnOn ? "ON" : "OFF");
            }
        }
    }
}

void publishToMQTT(struct_message data) {
    String roomName = String(data.room); roomName.trim(); 
    if (roomName != "R200" && roomName != "R201" && roomName != "Co_Ai") return; 

    if (!client.connected()) {
        Serial.println("⚠️ [MQTT] ไม่ได้เชื่อมต่อ ไม่สามารถส่งข้อมูลได้!");
        return;
    }

    String baseTopic = String(mqtt_topic_prefix) + "/" + roomName + "/";
    
    // คำนวณเสียงเป็นเดซิเบล (dB) และส่งค่าจริงขึ้นไป
    float db = (data.rawSound <= 0) ? 30.0 : (20.0 * log10(data.rawSound)) + 35.0; 

    client.publish((baseTopic + "temperature").c_str(), ("{\"value\": " + String(data.temp) + "}").c_str());
    client.publish((baseTopic + "humidity").c_str(), ("{\"value\": " + String(data.hum) + "}").c_str());
    client.publish((baseTopic + "light").c_str(), ("{\"value\": " + String(data.rawLight) + "}").c_str()); 
    client.publish((baseTopic + "sound").c_str(), ("{\"value\": " + String(db) + "}").c_str());

    Serial.printf("✅ [MQTT ส่งแล้ว] ห้อง %s -> อุณหภูมิ:%.1f, ชื้น:%.1f, แสง:%d, เสียง:%.1fdB\n", roomName.c_str(), data.temp, data.hum, data.rawLight, db);
}

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    if (len == sizeof(incomingData)) {
        memcpy(&incomingData, data, sizeof(incomingData)); 
        Serial.printf("\n📡 [ESP-NOW] ได้รับข้อมูลจากห้อง: %s\n", incomingData.room);
        publishToMQTT(incomingData);
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n🚀 เริ่มต้นทำงานบอร์ด Gateway...");

    WiFi.disconnect(true); 
    WiFi.mode(WIFI_STA);
    Serial.printf("🌐 [Wi-Fi] กำลังเชื่อมต่อ PSU WiFi: %s ", ssid);
    WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(1000); Serial.print("."); attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ [Wi-Fi] เชื่อมต่อสำเร็จ!");
        Serial.print("📡 IP Address: "); Serial.println(WiFi.localIP()); 
    } else {
        Serial.println("\n❌ [Wi-Fi] เชื่อมต่อล้มเหลว (Timeout) กำลังรีบูตบอร์ด...");
        delay(3000); ESP.restart();
    }

    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(mqttCallback); 
    
    esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_11B | WIFI_PROTOCOL_11G | WIFI_PROTOCOL_11N | WIFI_PROTOCOL_LR); 
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(OnDataRecv);
        esp_now_peer_info_t peerInfo = {};
        memcpy(peerInfo.peer_addr, broadcastMac, 6); peerInfo.channel = 0; peerInfo.encrypt = false;
        esp_now_add_peer(&peerInfo);
        Serial.println("✅ [ESP-NOW] พร้อมใช้งาน");
    }

    if (radio.begin()) {
        radio.enableAckPayload(); radio.enableDynamicPayloads(); 
        radio.openReadingPipe(1, addrR201); radio.openReadingPipe(2, addrCoAi); 
        radio.startListening();
        
        struct_cmd cmd1 = {"R201", false}; struct_cmd cmd2 = {"Co_Ai", false};
        radio.writeAckPayload(1, &cmd1, sizeof(cmd1)); radio.writeAckPayload(2, &cmd2, sizeof(cmd2));
        Serial.println("✅ [nRF24L01] ฟังข้อมูลท่อ 1Node & 2Node");
    } else {
        Serial.println("❌ [nRF24L01] ไม่พบโมดูลฮาร์ดแวร์!");
    }
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ [Wi-Fi] หลุดการเชื่อมต่อ! กำลังต่อใหม่...");
        WiFi.disconnect(); 
        WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);
        delay(5000); return;
    }

    if (!client.connected()) {
        unsigned long now = millis();
        if (now - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = now;
            Serial.println("🔄 [MQTT] กำลังเชื่อมต่อเซิร์ฟเวอร์...");
            if (client.connect("Gateway_CoE")) {
                client.subscribe("threshold/#"); 
                Serial.println("✅ [MQTT] เชื่อมต่อสำเร็จ! (Subscribe: threshold/#)");
                lastMqttReconnectAttempt = 0;
            } else {
                Serial.printf("❌ [MQTT] เชื่อมต่อล้มเหลว รหัสข้อผิดพลาด: %d\n", client.state());
            }
        }
    } else { 
        client.loop(); 
    }

    uint8_t pipeNum;
    if (radio.available(&pipeNum)) {
        radio.read(&incomingData, sizeof(incomingData));
        Serial.printf("\n📡 [nRF24] ได้รับข้อมูลจากท่อ %d (ห้อง: %s)\n", pipeNum, incomingData.room);
        publishToMQTT(incomingData);

        struct_cmd cmd;
        if (pipeNum == 1) {
            strcpy(cmd.room, "R201"); cmd.ledState = led_R201;
            radio.writeAckPayload(1, &cmd, sizeof(cmd));
        } else if (pipeNum == 2) {
            strcpy(cmd.room, "Co_Ai"); cmd.ledState = led_CoAi;
            radio.writeAckPayload(2, &cmd, sizeof(cmd));
        }
    }
}