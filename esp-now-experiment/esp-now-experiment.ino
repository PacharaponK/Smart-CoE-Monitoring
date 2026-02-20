#include <esp_now.h>
#include <WiFi.h>

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

  // พิมพ์ MAC Address ของบอร์ดนี้ออกมา (จดค่านี้ไปใส่ในบอร์ดส่ง) = 80:F3:DA:53:A8:24
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