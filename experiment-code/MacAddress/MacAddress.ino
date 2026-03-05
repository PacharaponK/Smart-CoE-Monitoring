#include <esp_now.h>
#include <WiFi.h>
#include <DHT.h>

#define DHTPIN 4
#define LDR_PIN 36
#define SOUND_PIN 39
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
uint8_t gatewayAddress[] = {0x24, 0xD7, 0xEB, 0x0F, 0x87, 0xAC};

typedef struct struct_message {
    float temp;
    float hum;
    int rawLight; // ส่งค่า digitalRead (0 หรือ 1)
    int rawSound; // ส่งค่า analogRead (Peak-to-Peak)
} __attribute__((packed)) struct_message;

typedef struct struct_config {
    int send_delay;
} __attribute__((packed)) struct_config;

struct_message myData;
struct_config remoteConfig = {2000}; 

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *incomingData, int len) {
    memcpy(&remoteConfig, incomingData, sizeof(remoteConfig));
}

void setup() {
    Serial.begin(115200);
    WiFi.mode(WIFI_STA);
    dht.begin();
    pinMode(LDR_PIN, INPUT);
    if (esp_now_init() != ESP_OK) return;
    esp_now_register_recv_cb(OnDataRecv);

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, gatewayAddress, 6);
    peerInfo.channel = 0;  
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
}

void loop() {
    myData.temp = dht.readTemperature();
    myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(LDR_PIN);

    // หา Peak-to-Peak สำหรับเสียง (ส่งค่าต่างของแรงดันไปคำนวณ dB ที่ Gateway)
    unsigned long startMillis = millis();
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - startMillis < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) {
            if (s > sMax) sMax = s;
            else if (s < sMin) sMin = s;
        }
    }
    myData.rawSound = sMax - sMin;

    esp_now_send(gatewayAddress, (uint8_t *) &myData, sizeof(myData));
    delay(remoteConfig.send_delay); 
}