#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <DHT.h>

#define DHTPIN 4
#define LDR_PIN 36
#define SOUND_PIN 39
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);
uint8_t gatewayAddress[] = {0x24, 0xD7, 0xEB, 0x0F, 0x87, 0xAC}; // MAC ของ Gateway

typedef struct struct_message {
    char room[10]; 
    float temp;
    float hum;
    int rawLight;
    int rawSound;
} __attribute__((packed)) struct_message;

struct_message myData;

void setup() {
    Serial.begin(115200);
    WiFi.mode(WIFI_STA);
    dht.begin();
    pinMode(LDR_PIN, INPUT);

    // *** สำคัญ: แก้เลข Channel ให้ตรงกับที่ Gateway แจ้ง ***
    int targetChannel = 6; 
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(targetChannel, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);

    if (esp_now_init() != ESP_OK) return;

    esp_now_peer_info_t peerInfo = {};
    memcpy(peerInfo.peer_addr, gatewayAddress, 6);
    peerInfo.channel = targetChannel;
    peerInfo.encrypt = false;
    esp_now_add_peer(&peerInfo);
}

void loop() {
    strcpy(myData.room, "R200"); // ระบุชื่อห้องตรงนี้
    myData.temp = dht.readTemperature();
    myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(LDR_PIN);

    // Peak-to-Peak Sound
    unsigned long start = millis();
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) {
            if (s > sMax) sMax = s; else if (s < sMin) sMin = s;
        }
    }
    myData.rawSound = sMax - sMin;

    esp_now_send(gatewayAddress, (uint8_t *) &myData, sizeof(myData));
    delay(2000); 
}