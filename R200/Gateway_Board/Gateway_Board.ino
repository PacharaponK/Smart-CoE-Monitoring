#include <esp_now.h>
#include <WiFi.h>
#include <math.h>

uint8_t nodeAddress[] = {0x58, 0xBF, 0x25, 0x81, 0x8B, 0x94};

typedef struct struct_message {
    float temp;
    float hum;
    int rawLight;
    int rawSound;
} __attribute__((packed)) struct_message;

typedef struct struct_config {
    int send_delay;
} __attribute__((packed)) struct_config;

struct_message incomingData;
struct_config configToSend = {2000};

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    memcpy(&incomingData, data, sizeof(incomingData));

    // --- ส่วนการคำนวณฝั่ง Gateway ---
    
    // 1. แปลงสถานะแสง (Digital)
    String lightStatus = (incomingData.rawLight == LOW) ? "ON (Light)" : "OFF (Dark)";

    // 2. คำนวณเสียงเป็น dB จากค่า Peak-to-Peak ที่ส่งมา
    float dbValue;
    if (incomingData.rawSound <= 0) dbValue = 30.0;
    else dbValue = (20.0 * log10(incomingData.rawSound)) + 35.0; // ปรับ Offset ตรงนี้ได้เลย

    // แสดงผล
    Serial.println("\n===== Computed at Gateway =====");
    Serial.printf("Temp: %.1f C | Hum: %.1f %%\n", incomingData.temp, incomingData.hum);
    Serial.print("Light Status: "); Serial.println(lightStatus);
    Serial.printf("Sound Level : %.1f dB (Raw: %d)\n", dbValue, incomingData.rawSound);
    Serial.println("===============================");
}

void OnDataSent(const wifi_tx_info_t *info, esp_now_send_status_t status) {
    // ฟังก์ชันตรวจสอบสถานะการส่ง (ESP32 Core v3.0+)
}

void setup() {
    Serial.begin(115200);
    WiFi.mode(WIFI_STA);
    if (esp_now_init() != ESP_OK) return;

    esp_now_register_recv_cb(OnDataRecv);
    esp_now_register_send_cb(OnDataSent);

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, nodeAddress, 6);
    peerInfo.channel = 0;  
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
}

void loop() {
    if (Serial.available() > 0) {
        char cmd = Serial.read();
        if (cmd == 's') { // สั่งให้ส่งช้าลง
            configToSend.send_delay = 5000;
            esp_now_send(nodeAddress, (uint8_t *) &configToSend, sizeof(configToSend));
        }
    }
}