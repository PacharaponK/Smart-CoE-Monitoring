#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 17 // <-- สำคัญ: เช็คว่าเสียบ DHT ไว้ที่ขา 13 จริงไหม
#define LDR_PIN 36
#define SOUND_PIN 39

RF24 radio(CE_PIN, CSN_PIN);
const byte address[6] = "00001";
DHT dht(DHTPIN, DHT11); // ถ้าใช้ DHT22 ให้เปลี่ยนตรงนี้เป็น DHT22

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
    dht.begin();
    pinMode(LDR_PIN, INPUT);
    
    if (!radio.begin()) {
        Serial.println("❌ nRF24L01 Hardware Error: Check Wiring!");
        while (1); 
    }
    
    radio.openWritingPipe(address);
    radio.setPALevel(RF24_PA_LOW); // ใช้ LOW ไปก่อนตอนเทส
    radio.stopListening();
    Serial.println("✅ nRF24L01 Ready (R201)");
}

void loop() {
    strcpy(myData.room, "R201");
    
    // 1. อ่านค่าจากเซนเซอร์
    myData.temp = dht.readTemperature();
    myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(LDR_PIN);

    // คำนวณค่าเสียง
    unsigned long start = millis();
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { if (s > sMax) sMax = s; else if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    // --- 2. ส่วนปริ้นท์ค่า Debug เพื่อหาตัวการ ---
    Serial.println("\n--- Debugging Sensor Data (R201) ---");
    
    // ดักจับค่า nan จาก DHT
    if (isnan(myData.temp) || isnan(myData.hum)) {
        Serial.println("⚠️ ERROR: Failed to read from DHT sensor! (Result is nan)");
    } else {
        Serial.printf("Temperature : %.1f °C\n", myData.temp);
        Serial.printf("Humidity    : %.1f %%\n", myData.hum);
    }
    
    Serial.printf("Light (Raw) : %d\n", myData.rawLight);
    Serial.printf("Sound (P2P) : %d\n", myData.rawSound);

    // 3. ส่งข้อมูลผ่าน nRF24L01
    if (radio.write(&myData, sizeof(myData))) {
        Serial.println("📡 Status: Data Sent to Gateway");
    } else {
        Serial.println("❌ Status: nRF24 Delivery Failed (Gateway not receiving)");
    }
    
    Serial.println("------------------------------------");
    delay(2000); // DHT11 ควรอ่านค่าห่างกันอย่างน้อย 2 วินาที
}