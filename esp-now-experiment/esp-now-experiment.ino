#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h> // เพิ่มไลบรารีนี้สำหรับจัดการ WiFi ระดับลึก

// โครงสร้างข้อมูล (ต้องตรงกับบอร์ดส่ง)
typedef struct struct_message {
    char a[32];
    int b;
    float c;
} struct_message;

struct_message myData;

// ฟังก์ชัน Callback เมื่อได้รับข้อมูล
void OnDataRecv(const uint8_t * mac, const uint8_t *incomingData, int len) {
  memcpy(&myData, incomingData, sizeof(myData));
  Serial.print("Bytes received: ");
  Serial.println(len);
  Serial.print("Char: ");
  Serial.println(myData.a);
  Serial.print("Int: ");
  Serial.println(myData.b);
  Serial.print("Float: ");
  Serial.println(myData.c);
  Serial.println("------------------");
}
 
void setup() {
  Serial.begin(115200);
  
  // ตั้งค่า WiFi ให้อยู่ในโหมด Station
  WiFi.mode(WIFI_STA);

  // --- ส่วนที่เพิ่มเพื่อเพิ่มระยะทาง (Long Range) ---
  // 1. ตั้งค่ากำลังส่ง WiFi ให้แรงสุด (19.5 dBm)
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  
  // 2. เปิดโหมด Long Range (LR)
  esp_wifi_set_protocol(WIFI_IF_STA, WIFI_PROTOCOL_LR);
  // --------------------------------------------

  // พิมพ์ MAC Address ของบอร์ดนี้ออกมา
  Serial.print("MAC Address ของบอร์ดนี้: ");
  Serial.println(WiFi.macAddress());

  // เริ่มต้นการทำงานของ ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }
  
  // ลงทะเบียนฟังก์ชัน Callback เมื่อมีข้อมูลเข้ามา
  esp_now_register_recv_cb(OnDataRecv);
}
 
void loop() {
  // บอร์ดรับไม่ต้องทำอะไรใน loop() แค่รอรับข้อมูล
}