#include <SPI.h>
#include <nRF24L01.h>
#include <RF24.h>
#include <DHT.h>

#define CE_PIN 4
#define CSN_PIN 5
#define DHTPIN 13 
#define LDR_PIN 36
#define SOUND_PIN 39
#define BUZZER_PIN 15 

RF24 radio(CE_PIN, CSN_PIN);
const byte address[6] = "1Node"; 
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
    pinMode(BUZZER_PIN, OUTPUT); digitalWrite(BUZZER_PIN, LOW); 
    dht.begin(); pinMode(LDR_PIN, INPUT);
    
    if (radio.begin()) {
        radio.enableAckPayload(); radio.enableDynamicPayloads(); 
        radio.openWritingPipe(address); radio.setPALevel(RF24_PA_LOW); radio.stopListening();
    }
}

void loop() {
    strcpy(myData.room, "R201"); 
    myData.temp = dht.readTemperature(); myData.hum = dht.readHumidity();
    myData.rawLight = analogRead(LDR_PIN); // ส่งค่าดิบ

    unsigned long start = millis(); unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { if (s > sMax) sMax = s; if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    if (radio.write(&myData, sizeof(myData))) {
        // รอรับใบเสร็จ (ACK Payload) ที่แนบคำสั่งเปิด/ปิดไซเรนมาด้วย
        if (radio.isAckPayloadAvailable()) {
            struct_cmd cmd; radio.read(&cmd, sizeof(cmd)); 
            isAlarmOn = cmd.ledState; 
        }
    }

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