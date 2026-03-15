#include <WiFi.h>
#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <math.h>
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
const byte addrR303[6] = "3Node"; 

typedef struct struct_cmd { char room[10]; bool ledState; } __attribute__((packed)) struct_cmd;
typedef struct struct_message { 
    char room[10]; 
    float temp; 
    float hum; 
    int rawLight; 
    int rawSound; 
} __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

float th_temp_R303 = 40.0, th_hum_R303 = 80.0, th_snd_R303 = 90.0;
float val_temp_R303 = 0, val_hum_R303 = 0, val_snd_R303 = 0;
bool led_R303 = false; 

bool checkThresholds() {
    return (val_temp_R303 > th_temp_R303 || val_hum_R303 > th_hum_R303 || val_snd_R303 > th_snd_R303);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = ""; for (int i = 0; i < length; i++) msg += (char)payload[i];
    String topicStr = String(topic);
    
    if (topicStr.startsWith("threshold/R303")) {
        float val = 0;
        if (msg.indexOf(':') != -1 && msg.indexOf('}') != -1) {
            val = msg.substring(msg.indexOf(':') + 1, msg.indexOf('}')).toFloat();
        } else {
            val = msg.toFloat(); 
        }

        Serial.printf("🔧 [MQTT] เปลี่ยนเกณฑ์ %s เป็น %.2f\n", topic, val);

        if (topicStr.indexOf("temperature") != -1) th_temp_R303 = val;
        else if (topicStr.indexOf("humidity") != -1) th_hum_R303 = val;
        else if (topicStr.indexOf("sound") != -1) th_snd_R303 = val;
        
        led_R303 = checkThresholds(); 
    }
}

void publishToMQTT(struct_message data) {
    String roomName = String(data.room); roomName.trim(); 
    if (roomName != "R303") return; 
    if (!client.connected()) return;
    
    String baseTopic = String(mqtt_topic_prefix) + "/" + roomName + "/";
    
    client.publish((baseTopic + "temperature").c_str(), ("{\"value\": " + String(data.temp) + "}").c_str());
    client.publish((baseTopic + "humidity").c_str(), ("{\"value\": " + String(data.hum) + "}").c_str());
    client.publish((baseTopic + "light").c_str(), ("{\"value\": " + String(data.rawLight) + "}").c_str()); 
    client.publish((baseTopic + "sound").c_str(), ("{\"value\": " + String(data.rawSound) + "}").c_str());
}

void setup() {
    Serial.begin(115200);
    WiFi.disconnect(true); WiFi.mode(WIFI_STA);
    Serial.printf("\n🌐 กำลังเชื่อมต่อ %s ", ssid);
    WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) { delay(1000); Serial.print("."); attempts++; }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ เชื่อมต่อ Wi-Fi สำเร็จ!");
    } else { ESP.restart(); }

    client.setServer(mqtt_server, mqtt_port); 
    client.setCallback(mqttCallback); 
    
    if (radio.begin()) {
        radio.enableAckPayload(); 
        radio.enableDynamicPayloads(); 
        
        // 🌟 อัปเกรดพลัง nRF24 ขั้นสุด!
        radio.setPALevel(RF24_PA_MAX);     // เปิดเครื่องขยายสัญญาณรับ-ส่งให้แรงสุด
        radio.setDataRate(RF24_1MBPS);     // ล็อคความเร็วคลื่นให้เสถียร ไม่หลุดง่าย
        
        radio.openReadingPipe(1, addrR303); 
        radio.startListening();
        
        struct_cmd cmd = {"R303", false};
        radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
        Serial.println("✅ Gateway: nRF24 เปิดโหมด PA_MAX พร้อมรับสัญญาณแรงๆ แล้ว!");
    } else {
        Serial.println("❌ Gateway: nRF24 Init Failed!");
    }
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) { ESP.restart(); }
    if (!client.connected()) {
        if (millis() - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = millis();
            if (client.connect("Gateway_CoE_Floor3")) { 
                client.subscribe("threshold/R303/#"); 
                lastMqttReconnectAttempt = 0; 
                Serial.println("✅ [MQTT] พร้อมทำงาน");
            } 
        }
    } else { client.loop(); }

    uint8_t pipeNum;
    if (radio.available(&pipeNum)) {
        radio.read(&incomingData, sizeof(incomingData)); 
        
        val_temp_R303 = incomingData.temp; 
        val_hum_R303 = incomingData.hum; 
        val_snd_R303 = incomingData.rawSound;
        led_R303 = checkThresholds();

        Serial.printf("📡 [รับจาก R303] Temp:%.1f Hum:%.1f | Light:%d Sound:%d\n", 
            incomingData.temp, incomingData.hum, incomingData.rawLight, incomingData.rawSound);

        publishToMQTT(incomingData); 
        
        if (pipeNum == 1) { 
            struct_cmd cmd; strcpy(cmd.room, "R303"); cmd.ledState = led_R303; 
            radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
        } 
    }
}0









000
.