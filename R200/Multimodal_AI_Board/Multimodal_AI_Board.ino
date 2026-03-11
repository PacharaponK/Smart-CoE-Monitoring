#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 13 
#define LDR_PIN 36
#define SOUND_PIN 39

RF24 radio(CE_PIN, CSN_PIN);
const byte address[6] = "2Node"; 
DHT dht(DHTPIN, DHT11); 

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

struct_message myData;

void setup() {
    Serial.begin(115200);
    dht.begin();
    pinMode(LDR_PIN, INPUT);
    
    if (!radio.begin()) {
        Serial.println("❌ nRF24L01 Hardware Error!");
        while (1); 
    }
    
    radio.openWritingPipe(address);
    radio.setAutoAck(true);       
    radio.setRetries(15, 15);     
    
    radio.setPALevel(RF24_PA_MAX); 
    radio.stopListening();
    
    Serial.println("✅ nRF24 Node Ready (Room: Co_Ai) - Pipe: Node2");
}

void loop() {
    Serial.println("\n------------------------------------");
    strcpy(myData.room, "Co_Ai"); 
    myData.temp = dht.readTemperature();
    myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(LDR_PIN);

    unsigned long start = millis();
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { if (s > sMax) sMax = s; else if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    // --- ส่วนแสดงผล Debug แบบเต็ม ---
    Serial.println("[ ข้อมูลเซนเซอร์ Co_Ai ]");
    if (isnan(myData.temp) || isnan(myData.hum)) {
        Serial.println("⚠️ แจ้งเตือน: DHT อ่านค่าไม่ได้ ตรวจสอบสายเสียบ!");
    } else {
        Serial.printf(" - อุณหภูมิ: %.1f °C\n", myData.temp);
        Serial.printf(" - ความชื้น: %.1f %%\n", myData.hum);
    }
    Serial.printf(" - แสง (Raw): %d\n", myData.rawLight);
    Serial.printf(" - เสียง (Raw): %d\n", myData.rawSound);

    Serial.print("📡 กำลังส่งข้อมูลไป Gateway... ");
    if (radio.write(&myData, sizeof(myData))) {
        Serial.println("✅ ผลการส่ง: สำเร็จ!");
    } else {
        Serial.println("❌ ผลการส่ง: ล้มเหลว (ไม่ได้รับ ACK)");
    }
    delay(2000 + random(100, 300)); 
}