#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  
  // ตั้งค่าเป็นโหมด Station เพื่ออ่าน MAC Address พื้นฐาน
  WiFi.mode(WIFI_STA);
  
  Serial.println("\n-----------------------------------");
  Serial.println("กำลังอ่านข้อมูล MAC Address ของบอร์ดนี้...");
  
  // ดึงค่า MAC Address มาแสดงผล
  Serial.print(">> MAC Address ของคุณคือ: ");
  Serial.println(WiFi.macAddress());
  Serial.println("-----------------------------------");
}

void loop() {
  // ไม่ต้องทำอะไรในลูปครับ
}