#include <esp_now.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <DHT.h>

DHT dht(4, DHT11);
uint8_t gatewayAddress[] = {0x24, 0xD7, 0xEB, 0x0F, 0x87, 0xAC}; // MAC ของ Gateway

typedef struct struct_message {
    char room[10]; float temp; float hum; int rawLight; int rawSound;
} __attribute__((packed)) struct_message;

struct_message myData;

// --- 1. ฟังก์ชันรอรับสถานะหลังจากส่งข้อมูลเสร็จ ---
void OnDataSent(const wifi_tx_info_t *mac_info, esp_now_send_status_t status) {
    if (status == ESP_NOW_SEND_SUCCESS) {
        Serial.println("✅ การเชื่อมต่อ: ส่งถึง Gateway สำเร็จ!");
    } else {
        Serial.println("❌ การเชื่อมต่อ: ส่งไม่ถึง Gateway (เช็คว่า Gateway เปิดอยู่ หรือ Channel ตรงกันไหม)");
    }
    Serial.println("------------------------------------");
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n--- กำลังเริ่มต้นระบบบอร์ด R200 ---");
    
    WiFi.mode(WIFI_STA);
    dht.begin();
    pinMode(36, INPUT); // ตั้งค่าโหมด LDR (ควรเพิ่มไว้ครับ)

    // *** สำคัญ: เปลี่ยน Channel ให้ตรงกับที่ Gateway แจ้ง ***
    int targetChannel = 1; 
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(targetChannel, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);
    Serial.printf("📡 กำลังตั้งค่า Wi-Fi Channel: %d\n", targetChannel);

    // --- 2. แจ้งสถานะการเปิดใช้งาน ESP-NOW ---
    if (esp_now_init() == ESP_OK) {
        Serial.println("✅ ระบบ ESP-NOW พร้อมทำงาน");
        
        // ผูกฟังก์ชัน OnDataSent เข้ากับระบบ
        esp_now_register_send_cb(OnDataSent);
        
        esp_now_peer_info_t peer = {};
        memcpy(peer.peer_addr, gatewayAddress, 6);
        peer.channel = targetChannel;
        peer.encrypt = false;
        
        if (esp_now_add_peer(&peer) == ESP_OK) {
            Serial.println("✅ ผูก MAC Address ของ Gateway สำเร็จ");
        } else {
            Serial.println("❌ ผูก Gateway ล้มเหลว");
        }
    } else {
        Serial.println("❌ เริ่มต้น ESP-NOW ล้มเหลว");
    }
    Serial.println("------------------------------------");
}

void loop() {
    strcpy(myData.room, "R200");
    myData.temp = dht.readTemperature();
    myData.hum = dht.readHumidity();
    myData.rawLight = digitalRead(36);

    unsigned long start = millis();
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(39);
        if (s < 4095) { if (s > sMax) sMax = s; else if (s < sMin) sMin = s; }
    }
    myData.rawSound = sMax - sMin;

    // --- 3. แสดงค่าที่อ่านได้จากเซนเซอร์ ---
    Serial.println("\n[ ตรวจสอบค่าเซนเซอร์ปัจจุบัน ]");
    
    // ดักจับกรณี DHT อ่านค่าไม่สำเร็จ
    if (isnan(myData.temp) || isnan(myData.hum)) {
        Serial.println("⚠️ ปัญหา: เซนเซอร์ DHT อ่านค่าไม่ได้ (ได้ค่า nan) ตรวจสอบสายเสียบ!");
    } else {
        Serial.printf(" - อุณหภูมิ: %.1f °C\n", myData.temp);
        Serial.printf(" - ความชื้น: %.1f %%\n", myData.hum);
    }
    
    Serial.printf(" - แสง (Raw): %d\n", myData.rawLight);
    Serial.printf(" - เสียง (Raw P2P): %d\n", myData.rawSound);

    // --- 4. แสดงสถานะตอนกดส่ง ---
    Serial.print("กำลังส่งข้อมูลไปที่ Gateway... ");
    esp_err_t result = esp_now_send(gatewayAddress, (uint8_t *) &myData, sizeof(myData));
    
    if (result != ESP_OK) {
        Serial.println("\n❌ แจ้งเตือน: ระบบภายในบอร์ดผิดพลาด ส่งข้อมูลออกไปไม่ได้");
    }
    
    delay(2000);
}