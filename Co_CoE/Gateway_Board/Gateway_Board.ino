#include <WiFi.h>
#include <esp_now.h>
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
const byte addrR200[6] = "1Node"; // ท่อของ R200
const byte addrCoAi[6] = "2Node"; // ท่อของ Co_Ai

// 🌟 อัปเดต Struct ให้ตรงกับฝั่ง R200 เป๊ะๆ
typedef struct struct_cmd { char room[10]; bool ledState; bool mockState; } __attribute__((packed)) struct_cmd;
typedef struct struct_message { char room[10]; float temp; float hum; int rawLight; int rawSound; } __attribute__((packed)) struct_message;

struct_message incomingData;
unsigned long lastMqttReconnectAttempt = 0;

// 🌟 ตัวแปรเก็บสถานะการจำลองของห้อง Co_Ai
bool mock_Co_Ai = false; 
bool mock_R201 = false; // 🌟 ตัวแปรเก็บสถานะการจำลองของห้อง R201

float th_temp_R200 = 40.0, th_hum_R200 = 80.0, th_snd_R200 = 90.0;
float val_temp_R200 = 0, val_hum_R200 = 0, val_snd_R200 = 0;
bool led_R200 = false; 
bool mock_R200 = false; // 🌟 ตัวแปรเก็บสถานะ Mock ฝั่ง Gateway

bool checkThresholds() {
    return (val_temp_R200 > th_temp_R200 || val_hum_R200 > th_hum_R200 || val_snd_R200 > th_snd_R200);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = ""; for (int i = 0; i < length; i++) msg += (char)payload[i];
    String topicStr = String(topic);
    
    // ล้างขยะ JSON กันเหนียว
    msg.replace(" ", ""); msg.replace("\n", ""); msg.replace("\r", ""); msg.replace("\t", ""); 

    // 🌟 ดักจับคำสั่งจำลองค่า
    if (topicStr == "sim/R200/mock") {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            mock_R200 = true;
            Serial.println("🎭 [MQTT] เปิดโหมดจำลองเซนเซอร์ห้อง R200!");
        } else {
            mock_R200 = false;
            Serial.println("🌡️ [MQTT] ปิดโหมดจำลอง กลับไปใช้เซนเซอร์จริง!");
        }
        return;
    }

    // 🌟 ดักจับคำสั่งจำลองค่าห้อง Co_Ai
    if (topicStr == "sim/Co_Ai/mock") {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            mock_Co_Ai = true;
            Serial.println("🎭 [MQTT] เปิดโหมดจำลองเซนเซอร์ห้อง Co_Ai!");
        } else {
            mock_Co_Ai = false;
            Serial.println("🌡️ [MQTT] ปิดโหมดจำลองห้อง Co_Ai กลับไปตัวจริง!");
        }
        return;
    }

    // 🌟 ดักจับคำสั่งจำลองค่าห้อง R201
    if (topicStr == "sim/R201/mock") {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            mock_R201 = true;
            Serial.println("🎭 [MQTT] เปิดโหมดจำลองเซนเซอร์ห้อง R201!");
        } else {
            mock_R201 = false;
            Serial.println("🌡️ [MQTT] ปิดโหมดจำลองห้อง R201 กลับไปตัวจริง!");
        }
        return;
    }
    
    // ดักจับคำสั่งเปลี่ยนเกณฑ์ Threshold
    if (topicStr.startsWith("threshold/R200")) {
        float val = 0;
        if (msg.indexOf(':') != -1 && msg.indexOf('}') != -1) {
            val = msg.substring(msg.indexOf(':') + 1, msg.indexOf('}')).toFloat();
        } else {
            val = msg.toFloat(); 
        }

        if (topicStr.indexOf("temperature") != -1) th_temp_R200 = val;
        else if (topicStr.indexOf("humidity") != -1) th_hum_R200 = val;
        else if (topicStr.indexOf("sound") != -1) th_snd_R200 = val;
        
        led_R200 = checkThresholds(); 
    }
}

String createJsonPayload(float value, bool isAlert, String reason) {
    return "{\"value\":" + String(value) + ",\"isAlert\":{\"value\":" + String(isAlert ? 1 : 0) + ",\"reason\":\"" + reason + "\"}}";
}

void publishToMQTT(struct_message data) {
    String roomName = String(data.room); roomName.trim(); 
    if (roomName != "Co_Ai" && roomName != "R200" && roomName != "R201") {
        Serial.println("❌ ข้ามการส่ง MQTT: ชื่อห้องไม่ตรง (" + roomName + ")");
        return; 
    }
    if (!client.connected()) {
        Serial.println("❌ ข้ามการส่ง MQTT: ยังไม่ได้เชื่อมต่อ MQTT Broker!");
        return;
    }
    
    String baseTopic = String(mqtt_topic_prefix) + "/" + roomName + "/";
    Serial.println("📡 [MQTT] กำลังส่งข้อมูล...");

    bool tempAlert = (data.temp > th_temp_R200);
    String jsonTemp = createJsonPayload(data.temp, tempAlert, tempAlert ? "Temperature exceeds threshold" : "");
    client.publish((baseTopic + "temperature").c_str(), jsonTemp.c_str());
    Serial.println("   -> " + baseTopic + "temperature: " + jsonTemp);

    bool humAlert = (data.hum > th_hum_R200);
    String jsonHum = createJsonPayload(data.hum, humAlert, humAlert ? "Humidity exceeds threshold" : "");
    client.publish((baseTopic + "humidity").c_str(), jsonHum.c_str());
    Serial.println("   -> " + baseTopic + "humidity: " + jsonHum);

    String jsonLight = createJsonPayload(data.rawLight, false, "");
    client.publish((baseTopic + "light").c_str(), jsonLight.c_str()); 
    Serial.println("   -> " + baseTopic + "light: " + jsonLight);

    bool soundAlert = (data.rawSound > th_snd_R200);
    String jsonSound = createJsonPayload(data.rawSound, soundAlert, soundAlert ? "Sound exceeds threshold" : "");
    client.publish((baseTopic + "sound").c_str(), jsonSound.c_str());
    Serial.println("   -> " + baseTopic + "sound: " + jsonSound);
    
    Serial.println("✅ [MQTT] ส่งข้อมูลสำเร็จ\n");
}

// 🌟 Callback รับข้อมูลจาก ESP-NOW
void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData_buf, int len) {
    if (len == sizeof(struct_message)) {
        struct_message data;
        memcpy(&data, incomingData_buf, sizeof(data));
        Serial.println("📡 [ESP-NOW] ได้รับข้อมูลจากห้อง " + String(data.room));
        publishToMQTT(data); // ส่งขึ้น MQTT ทันทีที่ได้รับ
    }
}

// 🌟 Callback ส่งข้อมูล ESP-NOW
void OnDataSent(const wifi_tx_info_t *mac_info, esp_now_send_status_t status) {
    // Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
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
        radio.setPALevel(RF24_PA_HIGH); // 🌟 ลดจาก MAX เป็น HIGH เพื่อลดปัญหาไฟตก (Brownout) ที่ทำให้การส่งล้มเหลว
        radio.setDataRate(RF24_250KBPS); 
        radio.setChannel(115); // 🌟 เปลี่ยนไปใช้ช่องสัญญาณ 115 เพื่อหลีกเลี่ยงสัญญาณรบกวนจาก WiFi
        radio.openReadingPipe(1, addrR200); 
        radio.openReadingPipe(2, addrCoAi); // 🌟 เพิ่ม Reading Pipe สำหรับ Co_Ai
        radio.startListening();
        
        // ส่งสถานะเตรียมรอไว้เลย
        struct_cmd cmd = {"R200", false, false};
        radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
    }

    // 🌟 เริ่มต้น ESP-NOW สำหรับเชื่อมต่อกับห้อง R201
    if (esp_now_init() == ESP_OK) {
        esp_now_register_recv_cb(OnDataRecv);
        esp_now_register_send_cb(OnDataSent); // 🌟 เพิ่ม Callback สำหรับการส่ง
        Serial.println("✅ [ESP-NOW] พร้อมทำงาน (รองรับห้อง R201)");
    } else {
        Serial.println("❌ [ESP-NOW] เริ่มต้นล้มเหลว!");
    }
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) { ESP.restart(); }
    if (!client.connected()) {
        if (millis() - lastMqttReconnectAttempt > 5000) {
            lastMqttReconnectAttempt = millis();
            if (client.connect("Gateway_CoE_Floor2")) { 
                client.subscribe("threshold/R200/#"); 
                client.subscribe("sim/R200/mock"); // 🌟 Subscribe หัวข้อจำลอง
                client.subscribe("sim/Co_Ai/mock"); // 🌟 Subscribe หัวข้อจำลอง
                client.subscribe("sim/R201/mock"); // 🌟 Subscribe หัวข้อจำลอง
                lastMqttReconnectAttempt = 0; 
                Serial.println("✅ [MQTT] พร้อมทำงาน (รองรับระบบจำลอง R200, Co_Ai, R201)");
            } else {
                Serial.print("❌ [MQTT] เชื่อมต่อล้มเหลว สถานะ: ");
                Serial.println(client.state());
            }
        }
    } else { client.loop(); }

    uint8_t pipeNum;
    if (radio.available(&pipeNum)) {
        radio.read(&incomingData, sizeof(incomingData)); 
        Serial.println("📦 [RF24] ได้รับข้อมูลจากท่อ " + String(pipeNum));
        
        val_temp_R200 = incomingData.temp; 
        val_hum_R200 = incomingData.hum; 
        val_snd_R200 = incomingData.rawSound;
        led_R200 = checkThresholds();

        publishToMQTT(incomingData); 
        
        // 🌟 ส่งค่า isAlarmOn และ mock_R200 กลับไปให้บอร์ด R200
        if (pipeNum == 1) { 
            struct_cmd cmd; strcpy(cmd.room, "R200"); 
            cmd.ledState = led_R200; 
            cmd.mockState = mock_R200; // แนบคำสั่ง Mock ไปด้วย
            radio.writeAckPayload(1, &cmd, sizeof(cmd)); 
        } 
        else if (pipeNum == 2) { 
            // สมมติฐานว่า Co_Ai อาจใช้ท่อ 2 วันข้างหน้า หรือปรับเปลี่ยน Struct ได้
            struct_cmd cmd; strcpy(cmd.room, "Co_Ai"); 
            cmd.ledState = false; // ยังไม่ทำ Threshold ให้
            cmd.mockState = mock_Co_Ai; // แนบคำสั่ง Mock ส่งไปให้ Co_Ai
            radio.writeAckPayload(2, &cmd, sizeof(cmd)); 
        }
    }

    // 🌟 ส่งคำสั่ง (Ack / Mock) ให้กับบอร์ด R201 แบบหน่วงเวลาผ่าน ESPNOW
    static unsigned long lastEspNowSend = 0;
    if (millis() - lastEspNowSend > 3000) { // 送คำสั่งทุก 3 วิ
        lastEspNowSend = millis();
        struct_cmd cmdToR201; 
        strcpy(cmdToR201.room, "R201"); 
        cmdToR201.ledState = false; // สมมติว่ายังไม่ทำ Threshold ให้
        cmdToR201.mockState = mock_R201;
        
        // ส่งไปยัง Broadcast Address เนื่องจากยังไม่กำหนด Peer 
        uint8_t broadcastAddress[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
        esp_now_peer_info_t peerInfo = {};
        memcpy(peerInfo.peer_addr, broadcastAddress, 6);
        peerInfo.channel = 115; // ตรงกับ R201
        peerInfo.encrypt = false;
        
        if (!esp_now_is_peer_exist(broadcastAddress)){
            esp_now_add_peer(&peerInfo);
        }

        esp_now_send(broadcastAddress, (uint8_t *) &cmdToR201, sizeof(cmdToR201));
    }
}