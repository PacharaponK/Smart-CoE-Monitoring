#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 13 
#define LDR_PIN 32
#define SOUND_PIN 39
#define BUZZER_PIN 15 

RF24 radio(CE_PIN, CSN_PIN);

// 🌟 ชื่อท่อของห้อง R303
const byte address[6] = "3Node"; 
DHT dht(DHTPIN, DHT11); 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

typedef struct struct_cmd {
    char room[10]; bool ledState; bool mockState; bool resetMode; bool stopState;
} __attribute__((packed)) struct_cmd;

struct_message myData;
bool isAlarmOn = false; 
bool isMocking = false; // สถานะการจำลอง
bool isStopped = false; // สถานะหยุดส่งข้อมูล

// ตัวแปรเก็บค่าสะสมสำหรับโหมดจำลอง ให้ดูสมจริง
float mockTemp = 25.0;
float mockHum = 55.0;
int mockLight = 0; 
unsigned long lastLightChange = 0; // จับเวลาการเปลี่ยนไฟ
void setup() {
    Serial.begin(115200);
    
    Serial.println("\n=======================");
    Serial.println("Room: R303");
    Serial.println("Booting...");
    Serial.println("=======================");
    
    pinMode(BUZZER_PIN, OUTPUT); 
    digitalWrite(BUZZER_PIN, LOW); 
    dht.begin(); 
    
    pinMode(LDR_PIN, INPUT_PULLUP); 
    
    if (radio.begin()) {
        radio.enableAckPayload(); 
        radio.enableDynamicPayloads(); 
        radio.openWritingPipe(address); 
        
        // 🌟 ปรับกำลังส่งเป็น MAX ส่งได้ไกลทะลุกำแพง 
        // (ถ้าขึ้น Tx: FAIL บ่อยๆ ให้เอา C 10uF-100uF คร่อม VCC/GND ที่โมดูล nRF24 ด้วยนะครับ)
        radio.setPALevel(RF24_PA_MAX); 
        
        radio.stopListening();
        Serial.println("✅ nRF24: Ready");
    } else {
        Serial.println("❌ SYS ERR: nRF24!");
        Serial.println("Check Wiring..."); 
        while(1); 
    }
}

void loop() {
    strcpy(myData.room, "R303"); 

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
            myData.rawSound = random(80, 120); // 5% เสียงดัง
        } else if (soundEvent > 80) {
            myData.rawSound = random(30, 40);  // 15% เสียงคนคุยกัน
        } else {
            myData.rawSound = random(10, 20);   // 80% เสียงแอร์ พัดลม นิ่งๆ
        }
    } else {
        // --- 📡 โหมดปกติ (อ่านเซนเซอร์จริง) ---
        myData.temp = dht.readTemperature(); 
        myData.hum = dht.readHumidity();
        myData.rawLight = !digitalRead(LDR_PIN); 

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

    // --- จัดหน้าตา Data Report (แยกบรรทัด LDR ให้เห็นชัดๆ) ---
    Serial.println("\n--- Data Report R303 ---");
    Serial.printf("🌡️ Temp  : %.1f C\n", myData.temp);
    Serial.printf("💧 Hum   : %.1f %%\n", myData.hum);
    Serial.printf("💡 Light : %d\n", myData.rawLight); 
    Serial.printf("🎤 Sound : %d\n", myData.rawSound);

    if (isStopped) {
        Serial.println("🛑 Mode: STOPPED (หยุดส่งข้อมูล)");
    } else if (isMocking) {
        Serial.println("🎭 Mode: MOCKING (สร้างข้อมูลจำลอง)");
    } else if (!dhtErr && !micErr) {
        Serial.println("✅ Sensors: ALL OK");
    } else {
        String errStr = "❌ ERR:";
        if (dhtErr) errStr += " DHT";
        if (micErr) errStr += " MIC";
        Serial.println(errStr); 
    }

    // --- ส่งข้อมูลผ่าน nRF24 ---
    Serial.print("📡 Transmit: ");

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
            Serial.print("Tx: OK "); 
            if (radio.isAckPayloadAvailable()) {
                struct_cmd cmd; 
                radio.read(&cmd, sizeof(cmd)); 
                isAlarmOn = cmd.ledState; 
                isMocking = cmd.mockState; // 🌟 รับคำสั่งเปิด/ปิด Mock จาก Gateway
                isStopped = cmd.stopState; // 🌟 รับคำสั่งให้หยุดส่งข้อมูล
                
                // 🌟 รับคำสั่ง Reset จาก Gateway
                if (cmd.resetMode) {
                    Serial.println("🔄 RESET CMD RCV! REBOOTING...");
                    delay(1000);
                    ESP.restart();
                }
            }
        } else {
            Serial.print("Tx: FAIL "); 
        }
    } else {
        Serial.print("Tx: STOP "); 
    }

    // แจ้งเตือนสถานะ Alarm
    if (isAlarmOn) {
        Serial.println("| Alarm: ON 🚨"); 
    } else {
        Serial.println("| Alarm: OFF");
    }
    Serial.println("------------------------");

    // --- จัดการไซเรน Buzzer ---
    if (isAlarmOn) {
        for (int i = 0; i < 4; i++) { 
            tone(BUZZER_PIN, 4000); delay(150); 
            tone(BUZZER_PIN, 3000); delay(150); 
        }
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); 
        delay(800 + random(50, 100)); 
    } else {
        noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); 
        delay(2000 + random(100, 300)); 
    }
}