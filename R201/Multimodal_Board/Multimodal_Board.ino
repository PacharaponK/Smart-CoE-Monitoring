#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define DHTPIN 4
#define LDR_PIN 36
#define SOUND_PIN 32
#define BUZZER_PIN 15 

LiquidCrystal_I2C lcd(0x27, 16, 2); 
DHT dht(DHTPIN, DHT11); 

// 🌟 1. ล็อก MAC Address ตามที่หามาได้เป๊ะๆ
uint8_t gatewayAddress[] = {0x24, 0xD7, 0xEB, 0x0F, 0x87, 0xAC}; 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

typedef struct struct_cmd {
    char room[10]; bool ledState; bool mockState; // 🌟 รับคำสั่งให้ทำงานแบบ Mock
} __attribute__((packed)) struct_cmd;

struct_message myData;
bool isAlarmOn = false; 
bool isMocking = false; // 🌟 สถานะการจำลอง

// 🌟 ตัวแปรเก็บค่าสะสมสำหรับโหมดจำลอง 
float mockTemp = 25.0;
float mockHum = 55.0;
int mockLight = 0; 
unsigned long lastLightChange = 0; 

bool lastTxSuccess = false; 

void OnDataSent(const wifi_tx_info_t *mac_info, esp_now_send_status_t status) {
    lastTxSuccess = (status == ESP_NOW_SEND_SUCCESS);
}

void OnDataRecv(const esp_now_recv_info *info, const uint8_t *data, int len) {
    if (len == sizeof(struct_cmd)) {
        struct_cmd cmd; memcpy(&cmd, data, sizeof(cmd));
        if (strcmp(cmd.room, "R201") == 0) {
            isAlarmOn = cmd.ledState;
            isMocking = cmd.mockState; // 🌟 รับคำสั่งเปิด/ปิด Mock
        }
    }
}

void setup() {
    Serial.begin(115200);
    lcd.init(); lcd.backlight();
    lcd.setCursor(0, 0); lcd.print("Room: R201");
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
    strcpy(myData.room, "R201"); 
    // 🌟 เลือกว่าจะอ่านค่าจริง หรือสร้างค่าจำลอง
    if (isMocking) {
        // --- 🎭 โหมดจำลองข้อมูล (Mock Mode) ทุกเซนเซอร์! ---
        
        mockTemp += random(-5, 6) / 10.0; 
        if (mockTemp < 22.0) mockTemp = 22.0;
        if (mockTemp > 30.0) mockTemp = 30.0;
        myData.temp = mockTemp;

        mockHum += random(-15, 16) / 10.0; 
        if (mockHum < 45.0) mockHum = 45.0;
        if (mockHum > 75.0) mockHum = 75.0;
        myData.hum = mockHum;

        if (millis() - lastLightChange > random(10000, 30000)) {
            mockLight = (mockLight == 0) ? 1 : 0; // แสง Digital (0/1)
            lastLightChange = millis();
        }
        myData.rawLight = mockLight;

        int soundEvent = random(0, 100);
        if (soundEvent > 95) myData.rawSound = random(80, 120);
        else if (soundEvent > 80) myData.rawSound = random(30, 40); 
        else myData.rawSound = random(10, 20);   

    } else {
        // --- 📡 โหมดปกติ (อ่านเซนเซอร์จริง) ---
        myData.temp = dht.readTemperature(); myData.hum = dht.readHumidity();
        // ถ้าค่า analog เข้าใกล้ 4095 แปลว่ามืด, ใกล้ 0 แปลว่าสว่าง
        myData.rawLight = (analogRead(LDR_PIN) < 2000) ? 1 : 0; 

        unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
        while (millis() - start < 50) {
            int s = analogRead(SOUND_PIN);
            if (s < 4095) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
        }
        int amplitude = sMax - sMin;
        // Map amplitude from 0-4095 to 0-140 dB
        myData.rawSound = map(amplitude, 0, 4095, 0, 140);
        
        // Ensure the value does not exceed 140 dB
        myData.rawSound = constrain(myData.rawSound, 0, 140);
    }

    esp_now_send(gatewayAddress, (uint8_t *) &myData, sizeof(myData));
    delay(20); 

    bool dhtErr = isnan(myData.temp) || isnan(myData.hum);
    bool micErr = (myData.rawSound == 0); 

    lcd.clear(); 
    lcd.setCursor(0, 0);
    if (isMocking) lcd.print("Mode: MOCKING 🎭");
    else if (!dhtErr && !micErr) lcd.print("Sensors: ALL OK ");
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