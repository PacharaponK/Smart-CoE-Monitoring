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

typedef struct struct_cmd { char room[10]; bool ledState; bool mockState; } __attribute__((packed)) struct_cmd;
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
bool mock_R303 = false; // 🌟 ตัวแปรเก็บสถานะ Mock
bool checkThresholds() {
    return (val_temp_R303 > th_temp_R303 || val_hum_R303 > th_hum_R303 || val_snd_R303 > th_snd_R303);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = ""; for (int i = 0; i < length; i++) msg += (char)payload[i];
    String topicStr = String(topic);
    
    // ล้างขยะ JSON กันเหนียว
    msg.replace(" ", ""); msg.replace("\n", ""); msg.replace("\r", ""); msg.replace("\t", ""); 

    // 🌟 ดักจับคำสั่งจำลองค่า
    if (topicStr == "sim/R303/mock") {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            mock_R303 = true;
            Serial.println("🎭 [MQTT] เปิดโหมดจำลองเซนเซอร์ห้อง R303!");
        } else {
            mock_R303 = false;
            Serial.println("🌡️ [MQTT] ปิดโหมดจำลอง กลับไปใช้เซนเซอร์จริง!");
        }
        return;
    }

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

String createJsonPayload(float value, bool isAlert, String reason) {
    return "{\"value\":" + String(value) + ",\"isAlert\":{\"value\":" + String(isAlert ? 1 : 0) + ",\"reason\":\"" + reason + "\"}}";
}

void publishToMQTT(struct_message data) {
    String roomName = String(data.room); roomName.trim(); 
    if (roomName != "R303") return; 
    if (!client.connected()) return;
    
    String baseTopic = String(mqtt_topic_prefix) + "/" + roomName + "/";
    Serial.println("📡 [MQTT] กำลังส่งข้อมูล...");

    bool tempAlert = (data.temp > th_temp_R303);
    String jsonTemp = createJsonPayload(data.temp, tempAlert, tempAlert ? "Temperature exceeds threshold" : "");
    client.publish((baseTopic + "temperature").c_str(), jsonTemp.c_str());
    Serial.println("   -> " + baseTopic + "temperature: " + jsonTemp);

    bool humAlert = (data.hum > th_hum_R303);
    String jsonHum = createJsonPayload(data.hum, humAlert, humAlert ? "Humidity exceeds threshold" : "");
    client.publish((baseTopic + "humidity").c_str(), jsonHum.c_str());
    Serial.println("   -> " + baseTopic + "humidity: " + jsonHum);

    String jsonLight = createJsonPayload(data.rawLight, false, "");
    client.publish((baseTopic + "light").c_str(), jsonLight.c_str()); 
    Serial.println("   -> " + baseTopic + "light: " + jsonLight);

    bool soundAlert = (data.rawSound > th_snd_R303);
    String jsonSound = createJsonPayload(data.rawSound, soundAlert, soundAlert ? "Sound exceeds threshold" : "");
    client.publish((baseTopic + "sound").c_str(), jsonSound.c_str());
    Serial.println("   -> " + baseTopic + "sound: " + jsonSound);
    
    Serial.println("✅ [MQTT] ส่งข้อมูลสำเร็จ\n");
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
                client.subscribe("sim/R303/mock"); // 🌟 Subscribe หัวข้อจำลอง
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
            struct_cmd cmd; strcpy(cmd.room, "R303"); 
            cmd.ledState = led_R303; 
            cmd.mockState = mock_R303; // แนบคำสั่ง Mock ไปด้วย
            radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
        } 
    }
}