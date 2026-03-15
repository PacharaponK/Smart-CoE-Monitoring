#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 13 
#define LDR_PIN 36
#define SOUND_PIN 39
#define BUZZER_PIN 15 

LiquidCrystal_I2C lcd(0x27, 16, 2); 
RF24 radio(CE_PIN, CSN_PIN);
const byte address[6] = "1Node"; // ท่อของ R201
DHT dht(DHTPIN, DHT11); 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

// 🌟 Struct มีตัวแปร mockState รับคำสั่งจาก Gateway
typedef struct struct_cmd {
    char room[10]; bool ledState; bool mockState; 
} __attribute__((packed)) struct_cmd;

struct_message myData;
bool isAlarmOn = false; 
bool isMocking = false; // สถานะการจำลอง

// 🌟 ตัวแปรเก็บค่าสะสมสำหรับโหมดจำลอง ให้ดูสมจริง
float mockTemp = 25.0;
float mockHum = 55.0;
int mockLight = 0; 
unsigned long lastLightChange = 0; // จับเวลาการเปลี่ยนไฟ

void setup() {
    Serial.begin(115200);
    
    lcd.init(); lcd.backlight();
    lcd.setCursor(0, 0); lcd.print("Room: R201");
    lcd.setCursor(0, 1); lcd.print("Booting...");
    
    pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW); 
    dht.begin(); 
    pinMode(LDR_PIN, INPUT); 
    
    if (radio.begin()) {
        radio.enableAckPayload(); 
        radio.enableDynamicPayloads(); 
        radio.openWritingPipe(address); 
        radio.setPALevel(RF24_PA_LOW); 
        radio.stopListening();
    } else {
        lcd.clear(); 
        lcd.setCursor(0, 0); lcd.print("SYS ERR: nRF24!");
        while(1); 
    }
}

void loop() {
    strcpy(myData.room, "R201"); 

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

        // 3. 💡 แสง (LDR): สุ่มเปิด-ปิดไฟห้อง ทุกๆ 10 ถึง 30 วินาที
        if (millis() - lastLightChange > random(10000, 30000)) {
            mockLight = (mockLight == 0) ? 1 : 0; // สลับสถานะไฟ 0 กับ 1
            lastLightChange = millis();
        }
        myData.rawLight = mockLight;

        // 4. 🎤 เสียง (Sound): จำลองเหตุการณ์ในห้อง 3 ระดับ
        int soundEvent = random(0, 100);
        if (soundEvent > 95) {
            myData.rawSound = random(80, 120); // 5% เสียงเมษแว๊นรถ
        } else if (soundEvent > 80) {
            myData.rawSound = random(30, 40);  // 15% เสียงคนคุยกัน
        } else {
            myData.rawSound = random(10, 20);   // 80% เสียงแอร์ พัดลม นิ่งๆ
        }

    } else {
        // --- 📡 โหมดปกติ (อ่านเซนเซอร์จริง) ---
        myData.temp = dht.readTemperature(); 
        myData.hum = dht.readHumidity();
        myData.rawLight = digitalRead(LDR_PIN); 

        unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
        while (millis() - start < 50) {
            int s = analogRead(SOUND_PIN);
            if (s < 4095) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
        }
        myData.rawSound = sMax - sMin;
    }

    // เช็ค Error (ข้ามไปเลยถ้าอยู่ในโหมดจำลอง จะได้ไม่ฟ้อง Error ปลอม)
    bool dhtErr = false;
    bool micErr = false;
    if (!isMocking) {
        dhtErr = isnan(myData.temp) || isnan(myData.hum);
        micErr = (myData.rawSound == 0); 
    }

    // โชว์สถานะบนจอ LCD
    lcd.clear(); 
    lcd.setCursor(0, 0);
    if (isMocking) lcd.print("Mode: MOCKING 🎭"); // 🌟 โชว์ชัดๆ ว่ากำลังจำลองค่าอยู่
    else if (!dhtErr && !micErr) lcd.print("Sensors: ALL OK");
    else {
        String errStr = "ERR:";
        if (dhtErr) errStr += " DHT";
        if (micErr) errStr += " MIC";
        lcd.print(errStr); 
    }

    // ส่งข้อมูล
    lcd.setCursor(0, 1); 
    if (radio.write(&myData, sizeof(myData))) {
        lcd.print("Tx: OK "); 
        
        // รับคำสั่งกลับจาก Gateway
        if (radio.isAckPayloadAvailable()) {
            struct_cmd cmd; 
            radio.read(&cmd, sizeof(cmd)); 
            isAlarmOn = cmd.ledState; 
            isMocking = cmd.mockState; // 🌟 รับคำสั่งเปิด/ปิด Mock จาก Gateway
        }
    } else {
        lcd.print("Tx: FAIL"); 
    }

    // โชว์สถานะ Alarm
    lcd.setCursor(11, 1);
    if (isAlarmOn) lcd.print("[ALM]"); 
    else lcd.print("     ");

    // --- ระบบเสียงเตือนภัย ---
    if (isAlarmOn) {
        for (int i = 0; i < 4; i++) { tone(BUZZER_PIN, 4000); delay(150); tone(BUZZER_PIN, 3000); delay(150); }
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); 
        delay(800 + random(50, 100)); 
    } else {
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); 
        delay(2000 + random(100, 300)); 
    }
}