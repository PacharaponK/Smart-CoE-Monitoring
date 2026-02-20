#include <esp_now.h>
#include <WiFi.h>

// >>> เปลี่ยนเป็น MAC Address ของบอร์ดรับข้อมูล <<<
uint8_t broadcastAddress[] = {0x80, 0xF3, 0xDA, 0x53, 0xA8, 0x24}; // เช่น {0x24, 0x0A, 0xC4, 0xXX, 0xXX, 0xXX}

// โครงสร้างข้อมูล (ต้องตรงกับบอร์ดรับ)
typedef struct struct_message {
  char a[32];
  int b;
  float c;
} struct_message;

struct_message myData;

esp_now_peer_info_t peerInfo;

// ฟังก์ชัน Callback เมื่อส่งข้อมูลเสร็จ
void OnDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  Serial.print("\r\nLast Packet Send Status:\t");
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "Delivery Success" : "Delivery Fail");
}
 
void setup() {
  Serial.begin(115200);
 
  // ตั้งค่า WiFi ให้อยู่ในโหมด Station
  WiFi.mode(WIFI_STA);
 
  // เริ่มต้นการทำงานของ ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("Error initializing ESP-NOW");
    return;
  }

  // ลงทะเบียนฟังก์ชัน Callback เมื่อส่งข้อมูล
  esp_now_register_send_cb(OnDataSent);
  
  // ตั้งค่าข้อมูลของบอร์ดรับ (Peer)
  memcpy(peerInfo.peer_addr, broadcastAddress, 6);
  peerInfo.channel = 0;  
  peerInfo.encrypt = false;
  
  // เพิ่มบอร์ดรับเป็น Peer
  if (esp_now_add_peer(&peerInfo) != ESP_OK){
    Serial.println("Failed to add peer");
    return;
  }
}
 
void loop() {
  // กำหนดค่าข้อมูลที่ต้องการส่ง
  strcpy(myData.a, "Hello ESP-NOW!");
  myData.b = random(1, 20); // สุ่มตัวเลข 1-20
  myData.c = 1.25;
  
  // ส่งข้อมูล
  esp_err_t result = esp_now_send(broadcastAddress, (uint8_t *) &myData, sizeof(myData));
   
  if (result == ESP_OK) {
    Serial.println("Sent with success");
  }
  else {
    Serial.println("Error sending the data");
  }
  
  // ส่งทุกๆ 2 วินาที
  delay(2000);
}