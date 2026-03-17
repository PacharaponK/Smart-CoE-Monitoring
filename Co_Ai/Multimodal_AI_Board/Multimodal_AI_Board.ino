#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>
#include <Wire.h>                  // 🌟 เพิ่มไลบรารีจอ
#include <LiquidCrystal_I2C.h>     // 🌟 เพิ่มไลบรารีจอ

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 13
#define LDR_PIN 36
#define SOUND_PIN 39
#define BUZZER_PIN 15 

LiquidCrystal_I2C lcd(0x27, 16, 2); // 🌟 ประกาศจอ LCD
RF24 radio(CE_PIN, CSN_PIN);
const byte address[6] = "2Node"; 
DHT dht(DHTPIN, DHT11); 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

typedef struct struct_cmd {
    char room[10]; bool ledState; bool mockState; bool resetMode; bool stopState;
} __attribute__((packed)) struct_cmd;

// 🌟 สถานะและตัวแปรแบบ Mock
bool isMocking = false; 
bool isStopped = false; 
float mockTemp = 25.0;
float mockHum = 55.0;
int mockLight = 0; 
unsigned long lastLightChange = 0; 

struct_message myData;
bool isAlarmOn = false; 

void setup() {
    Serial.begin(115200);
    
    // 🌟 เริ่มต้นจอ LCD
    lcd.init(); 
    lcd.backlight();
    lcd.setCursor(0, 0); lcd.print("Room: Co_Ai");
    lcd.setCursor(0, 1); lcd.print("System Ready..");
    
    pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW); 
    dht.begin(); pinMode(LDR_PIN, INPUT);
    
    if (radio.begin()) {
        radio.enableAckPayload(); radio.enableDynamicPayloads(); 
        radio.setPALevel(RF24_PA_MAX); // 🌟 แรงสุด
        radio.setDataRate(RF24_250KBPS); // 🌟 ลดความเร็วเพื่อระยะทางที่ไกลขึ้น
        radio.setChannel(115); // 🌟 ใช้ช่องสัญญาณ 115 หลบ WiFi
        radio.openWritingPipe(address); radio.stopListening();
    }
}

void loop() {
    strcpy(myData.room, "Co_Ai"); 
    // 🌟 เลือกว่าจะอ่านค่าจริง หรือสร้างค่าจำลอง
    if (isMocking) {
        // --- 🎭 โหมดจำลองข้อมูล (Mock Mode) ทุกเซนเซอร์! ---
        
        // 1. 🌡️ อุณหภูมิ: แกว่งทีละนิด (-0.5 ถึง +0.5)
        mockTemp += random(-5, 6) / 10.0; 
        if (mockTemp < 22.0) mockTemp = 22.0;
        if (mockTemp > 30.0) mockTemp = 30.0;
        myData.temp = mockTemp;

        // 2. 💧 ความชื้น: แกว่งทีละนิด (-1.5 ถึง +1.5)
        mockHum += random(-15, 16) / 10.0; 
        if (mockHum < 45.0) mockHum = 45.0;
        if (mockHum > 75.0) mockHum = 75.0;
        myData.hum = mockHum;

        // 3. 💡 แสง: สุ่มเปิด-ปิดไฟห้อง ทุกๆ 10 ถึง 30 วินาที
        if (millis() - lastLightChange > random(10000, 30000)) {
            mockLight = (mockLight == 0) ? 1 : 0; // 1 = สว่าง, 0 = มืด
            lastLightChange = millis();
        }
        myData.rawLight = mockLight;

        // 4. 🎤 เสียง: จำลองเหตุการณ์ในห้อง
        int soundEvent = random(0, 100);
        if (soundEvent > 95) myData.rawSound = random(80, 120); 
        else if (soundEvent > 80) myData.rawSound = random(30, 40);  
        else myData.rawSound = random(10, 20);   

    } else {
        // --- 📡 โหมดปกติ (อ่านเซนเซอร์จริง) ---
        myData.temp = dht.readTemperature(); myData.hum = dht.readHumidity();
        // ถ้าค่า analog เข้าใกล้ 4095 แปลว่ามืด, ใกล้ 0 แปลว่าสว่าง
        myData.rawLight = (analogRead(LDR_PIN) < 2000) ? 1 : 0; // แสง 1=มีแสง, 0=มืดไม่มีไฟ

        unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
        while (millis() - start < 50) {
            int s = analogRead(SOUND_PIN);
            if (s < 4095) { if (s > sMax) sMax = s; else if (s < sMin) sMin = s; }
        }
        myData.rawSound = sMax - sMin;
    }

    bool txOk = false; // 🌟 สร้างตัวแปรมาเก็บสถานะส่ง เพื่อให้จอ LCD เอาไปใช้ต่อ
    
    bool allowSend = true;
    if (isStopped) {
        static unsigned long lastPing = 0;
        if (millis() - lastPing > 5000) {
            lastPing = millis();
            allowSend = true;
        } else {
            allowSend = false;
        }
    }

    if (allowSend) {
        if (radio.write(&myData, sizeof(myData))) {
            txOk = true; // 🌟 ส่งสำเร็จ
            if (radio.isAckPayloadAvailable()) {
                struct_cmd cmd; radio.read(&cmd, sizeof(cmd)); 
                isAlarmOn = cmd.ledState; 
                isMocking = cmd.mockState; // 🌟 รับคำสั่ง Mock จาก Gateway
                isStopped = cmd.stopState; // 🌟 รับคำสั่งให้หยุดส่งข้อมูล
                
                // 🌟 รับคำสั่ง Reset จาก Gateway
                if (cmd.resetMode) {
                    lcd.clear();
                    lcd.setCursor(0, 0); lcd.print("RESET CMD RCV");
                    delay(1000);
                    ESP.restart();
                }
            }
        }
    }

    // ---------------------------------------------------------
    // 🌟 ส่วนแสดงผลจอ LCD 
    // ---------------------------------------------------------
    lcd.clear(); 
    lcd.setCursor(0, 0);
    if (isStopped) {
        lcd.print("Mode: STOPPED 🛑");
    } else if (isMocking) {
        lcd.print("Mode: MOCKING 🎭");
    } else if (isnan(myData.temp) || isnan(myData.hum)) {
        lcd.print("ERR: DHT Sensor");
    } else {
        lcd.print("T:"); lcd.print(myData.temp, 1);
        lcd.print(" H:"); lcd.print(myData.hum, 1);
    }

    lcd.setCursor(0, 1); 
    if (!allowSend) {
        lcd.print("Tx: STOP");
    } else if (txOk) {
        lcd.print("Tx: OK "); 
    } else {
        lcd.print("Tx: FAIL"); 
    }

    if (isAlarmOn) {
        lcd.setCursor(11, 1);
        lcd.print("[ALM]"); 
    }
    // ---------------------------------------------------------

    if (isAlarmOn) {
        for (int i = 0; i < 4; i++) {
            tone(BUZZER_PIN, 4000); delay(150); tone(BUZZER_PIN, 3000); delay(150); 
        }
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW);
        delay(800 + random(50, 100)); 
    } else {
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW);
        delay(2000 + random(100, 300)); 
    }
}