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
    char room[10]; bool ledState;
} __attribute__((packed)) struct_cmd;

struct_message myData;
bool isAlarmOn = false; 

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
    myData.temp = dht.readTemperature(); 
    myData.hum = dht.readHumidity();
    myData.rawLight = !digitalRead(LDR_PIN); 

    unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    bool dhtErr = isnan(myData.temp) || isnan(myData.hum);
    bool micErr = (myData.rawSound == 0); 

    // --- จัดหน้าตา Data Report (แยกบรรทัด LDR ให้เห็นชัดๆ) ---
    Serial.println("\n--- Data Report R303 ---");
    Serial.printf("🌡️ Temp  : %.1f C\n", myData.temp);
    Serial.printf("💧 Hum   : %.1f %%\n", myData.hum);
    Serial.printf("💡 Light : %d\n", myData.rawLight); 
    Serial.printf("🎤 Sound : %d\n", myData.rawSound);

    if (!dhtErr && !micErr) {
        Serial.println("✅ Sensors: ALL OK");
    } else {
        String errStr = "❌ ERR:";
        if (dhtErr) errStr += " DHT";
        if (micErr) errStr += " MIC";
        Serial.println(errStr); 
    }

    // --- ส่งข้อมูลผ่าน nRF24 ---
    Serial.print("📡 Transmit: ");
    if (radio.write(&myData, sizeof(myData))) {
        Serial.print("Tx: OK "); 
        if (radio.isAckPayloadAvailable()) {
            struct_cmd cmd; 
            radio.read(&cmd, sizeof(cmd)); 
            isAlarmOn = cmd.ledState; 
        }
    } else {
        Serial.print("Tx: FAIL "); 
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