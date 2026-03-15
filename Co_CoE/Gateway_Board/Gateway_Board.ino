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
const byte addrR201[6] = "1Node"; // ท่อของ R201

// 🌟 อัปเดต Struct ให้ตรงกับฝั่ง R201 เป๊ะๆ
typedef struct struct_cmd { char room[10]; bool ledState; bool mockState; } __attribute__((packed)) struct_cmd;
typedef struct struct_message { char room[10]; float temp; float hum; int rawLight; int rawSound; } __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

float th_temp_R201 = 40.0, th_hum_R201 = 80.0, th_snd_R201 = 90.0;
float val_temp_R201 = 0, val_hum_R201 = 0, val_snd_R201 = 0;
bool led_R201 = false; 
bool mock_R201 = false; // 🌟 ตัวแปรเก็บสถานะ Mock ฝั่ง Gateway

bool checkThresholds() {
    return (val_temp_R201 > th_temp_R201 || val_hum_R201 > th_hum_R201 || val_snd_R201 > th_snd_R201);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = ""; for (int i = 0; i < length; i++) msg += (char)payload[i];
    String topicStr = String(topic);
    
    // ล้างขยะ JSON กันเหนียว
    msg.replace(" ", ""); msg.replace("\n", ""); msg.replace("\r", ""); msg.replace("\t", ""); 

    // 🌟 ดักจับคำสั่งจำลองค่า
    if (topicStr == "sim/R201/mock") {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            mock_R201 = true;
            Serial.println("🎭 [MQTT] เปิดโหมดจำลองเซนเซอร์ห้อง R201!");
        } else {
            mock_R201 = false;
            Serial.println("🌡️ [MQTT] ปิดโหมดจำลอง กลับไปใช้เซนเซอร์จริง!");
        }
        return;
    }
    
    // ดักจับคำสั่งเปลี่ยนเกณฑ์ Threshold
    if (topicStr.startsWith("threshold/R201")) {
        float val = 0;
        if (msg.indexOf(':') != -1 && msg.indexOf('}') != -1) {
            val = msg.substring(msg.indexOf(':') + 1, msg.indexOf('}')).toFloat();
        } else {
            val = msg.toFloat(); 
        }

        if (topicStr.indexOf("temperature") != -1) th_temp_R201 = val;
        else if (topicStr.indexOf("humidity") != -1) th_hum_R201 = val;
        else if (topicStr.indexOf("sound") != -1) th_snd_R201 = val;
        
        led_R201 = checkThresholds(); 
    }
}

void publishToMQTT(struct_message data) {
    String roomName = String(data.room); roomName.trim(); 
    if (roomName != "R201") return; 
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
    WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);
    while (WiFi.status() != WL_CONNECTED) { delay(1000); Serial.print("."); }

    client.setServer(mqtt_server, mqtt_port); 
    client.setCallback(mqttCallback); 
    
    if (radio.begin()) {
        radio.enableAckPayload(); 
        radio.enableDynamicPayloads(); 
        radio.openReadingPipe(1, addrR201); 
        radio.startListening();
        
        // ส่งสถานะเตรียมรอไว้เลย
        struct_cmd cmd = {"R201", false, false};
        radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
    }
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) { ESP.restart(); }
    if (!client.connected()) {
        if (millis() - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = millis();
            if (client.connect("Gateway_CoE_Floor2")) { 
                client.subscribe("threshold/R201/#"); 
                client.subscribe("sim/R201/mock"); // 🌟 Subscribe หัวข้อจำลอง
                lastMqttReconnectAttempt = 0; 
                Serial.println("✅ [MQTT] พร้อมทำงาน (รองรับระบบจำลอง R201)");
            } 
        }
    } else { client.loop(); }

    uint8_t pipeNum;
    if (radio.available(&pipeNum)) {
        radio.read(&incomingData, sizeof(incomingData)); 
        
        val_temp_R201 = incomingData.temp; 
        val_hum_R201 = incomingData.hum; 
        val_snd_R201 = incomingData.rawSound;
        led_R201 = checkThresholds();

        publishToMQTT(incomingData); 
        
        // 🌟 ส่งค่า isAlarmOn และ mock_R201 กลับไปให้บอร์ด R201
        if (pipeNum == 1) { 
            struct_cmd cmd; strcpy(cmd.room, "R201"); 
            cmd.ledState = led_R201; 
            cmd.mockState = mock_R201; // แนบคำสั่ง Mock ไปด้วย
            radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
        } 
    }
}