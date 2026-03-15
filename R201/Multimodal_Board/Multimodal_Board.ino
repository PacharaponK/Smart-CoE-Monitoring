#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define DHTPIN 4
#define LDR_PIN 36
#define SOUND_PIN 39
#define BUZZER_PIN 15 

LiquidCrystal_I2C lcd(0x27, 16, 2); 
DHT dht(DHTPIN, DHT11); 

// 🌟 1. ล็อก MAC Address ตามที่หามาได้เป๊ะๆ
uint8_t gatewayAddress[] = {0x24, 0xD7, 0xEB, 0x0F, 0x87, 0xAC}; 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

typedef struct struct_cmd {
    char room[10]; bool ledState;
} __attribute__((packed)) struct_cmd;

struct_message myData;
bool isAlarmOn = false; 
bool lastTxSuccess = false; 

void OnDataSent(const wifi_tx_info_t *mac_info, esp_now_send_status_t status) {
    lastTxSuccess = (status == ESP_NOW_SEND_SUCCESS);
}

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    if (len == sizeof(struct_cmd)) {
        struct_cmd cmd; memcpy(&cmd, data, sizeof(cmd));
        if (strcmp(cmd.room, "R200") == 0) isAlarmOn = cmd.ledState;
    }
}

void setup() {
    Serial.begin(115200);
    lcd.init(); lcd.backlight();
    lcd.setCursor(0, 0); lcd.print("Room: R200");
    lcd.setCursor(0, 1); lcd.print("System Booting..");
    delay(2000);

    pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW);
    WiFi.mode(WIFI_STA); dht.begin(); pinMode(LDR_PIN, INPUT);

    // 🌟 2. ล็อกช่องสัญญาณไว้ที่ Channel 1 ตามที่ Gateway ใช้
    int targetChannel = 1; 
    
    esp_wifi_set_promiscuous(true); 
    esp_wifi_set_channel(targetChannel, WIFI_SECOND_CHAN_NONE); 
    esp_wifi_set_promiscuous(false);

    if (esp_now_init() == ESP_OK) {
        esp_now_register_send_cb(OnDataSent); esp_now_register_recv_cb(OnDataRecv); 
        esp_now_peer_info_t peer = {};
        memcpy(peer.peer_addr, gatewayAddress, 6); peer.channel = targetChannel; peer.encrypt = false;
        esp_now_add_peer(&peer);
    }
}

void loop() {
    strcpy(myData.room, "R200"); 
    myData.temp = dht.readTemperature(); myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(LDR_PIN); // แสง Digital (0/1)

    unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    esp_now_send(gatewayAddress, (uint8_t *) &myData, sizeof(myData));
    delay(20); 

    bool dhtErr = isnan(myData.temp) || isnan(myData.hum);
    bool micErr = (myData.rawSound == 0); 

    lcd.clear(); 
    lcd.setCursor(0, 0);
    if (!dhtErr && !micErr) lcd.print("Sensors: ALL OK ");
    else {
        String errStr = "ERR:";
        if (dhtErr) errStr += " DHT";
        if (micErr) errStr += " MIC";
        lcd.print(errStr); 
    }

    lcd.setCursor(0, 1); 
    if (lastTxSuccess) lcd.print("Tx: OK   "); else lcd.print("Tx: FAIL ");
    
    lcd.setCursor(11, 1);
    if (isAlarmOn) lcd.print("[ALM]"); else lcd.print("     ");

    if (isAlarmOn) {
        for (int i = 0; i < 4; i++) { tone(BUZZER_PIN, 4000); delay(150); tone(BUZZER_PIN, 3000); delay(150); }
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); delay(800 + random(50, 100)); 
    } else {
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); delay(2000 + random(100, 300)); 
    }
}