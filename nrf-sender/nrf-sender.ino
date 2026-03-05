#include <SPI.h>
#include <RF24.h>

// ====== เปลี่ยนขาตามบอร์ดของมึงได้ ======
// ESP32 (VSPI): SCK=18, MISO=19, MOSI=23, CSN=5 (ตัวอย่าง), CE=4
#define CE_PIN   4
#define CSN_PIN  5

RF24 radio(CE_PIN, CSN_PIN);

// address ต้องตรงกันทั้ง TX/RX (5 bytes)
const byte address[6] = "LR001";

// โครงสร้างข้อมูลที่ส่ง
struct Payload {
  uint32_t counter;
  float t;
  float h;
};

Payload tx;

void setup() {
  Serial.begin(115200);
  delay(200);

  if (!radio.begin()) {
    Serial.println("NRF24 init failed!");
    while (1) {}
  }

  // ====== LONG RANGE SETTINGS ======
  radio.setPALevel(RF24_PA_MAX);          // แรงสุด
  radio.setDataRate(RF24_250KBPS);        // ไกลสุด
  radio.setChannel(100);                  // หลบย่าน Wi-Fi (ลอง 90-110 ถ้ารบกวน)
  radio.setCRCLength(RF24_CRC_16);        // กัน error
  radio.setAutoAck(true);                 // เปิด ACK
  radio.setRetries(15, 15);               // retry แรงสุด (delay, count)
  radio.enableDynamicPayloads();          // payload ยืดหยุ่น
  radio.setPayloadSize(sizeof(Payload));  // fix ขนาด (ช่วยให้เสถียร)
  radio.setAddressWidth(5);

  // เพิ่มโอกาสรอดตอนสัญญาณอ่อน
  radio.setDataRate(RF24_250KBPS);

  // Pipe
  radio.openWritingPipe(address);
  radio.stopListening();

  // ลดสัญญาณสะท้อน/อิ่มสัญญาณ (ในระยะใกล้มาก ๆ)
  // radio.setPALevel(RF24_PA_HIGH); // ถ้าทดสอบใกล้ ๆ แล้วหลุด ให้ลดจาก MAX เป็น HIGH

  tx.counter = 0;
  tx.t = 25.00;
  tx.h = 60.00;

  Serial.println("TX Long Range Ready");
  radio.printDetails(); // ดูค่าตั้งทั้งหมดใน Serial Monitor
}

void loop() {
  tx.counter++;
  tx.t += 0.10f;
  tx.h += 0.05f;

  unsigned long t0 = micros();
  bool ok = radio.write(&tx, sizeof(tx));
  unsigned long dt = micros() - t0;

  Serial.print("Send #"); Serial.print(tx.counter);
  Serial.print(" T="); Serial.print(tx.t, 2);
  Serial.print(" H="); Serial.print(tx.h, 2);
  Serial.print(" | "); Serial.print(ok ? "OK" : "FAIL");
  Serial.print(" | us="); Serial.println(dt);

  delay(1000);
}