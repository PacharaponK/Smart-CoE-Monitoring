#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h> // 🌟 ไลบรารี MQTT

// --- ตั้งค่า Wi-Fi มหาลัย ---
const char* ssid = "PSU WiFi (802.1x)"; 
const char* eap_username = "6610110227";
const char* eap_password = "Por012345_";

// --- ตั้งค่า API Gateway ---
const char* api_url = "https://jfer2p5xl2.execute-api.ap-southeast-1.amazonaws.com/get-url";

// --- ตั้งค่า MQTT ---
const char* mqtt_server = "172.30.232.53"; 
const int   mqtt_port   = 1883;
const char* mqtt_topic_sub = "cam/coe/cap"; // Topic สำหรับรับคำสั่งถ่ายภาพ

WiFiClient espClient;
PubSubClient client(espClient);

// 🌟 ตัวแปรสำหรับการถ่ายภาพต่อเนื่อง
bool isCapturing = false;               // สถานะการถ่ายภาพ (เปิด/ปิด)
unsigned long lastCaptureTime = 0;      // เก็บเวลาที่ถ่ายรูปล่าสุด
const unsigned long captureInterval = 10000; // หน่วงเวลา 10,000 มิลลิวินาที (10 วินาที)

// --- ขาสำหรับรุ่น AI-Thinker ---
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// 🌟 ฟังก์ชันรับคำสั่งจาก MQTT
void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String msg = "";
    for (int i = 0; i < length; i++) {
        msg += (char)payload[i];
    }
    
    Serial.printf("\n📩 [MQTT] ได้รับคำสั่ง Topic: %s | ข้อความดิบ:\n%s\n", topic, msg.c_str());

    // ล้างขยะ JSON
    msg.replace(" ", "");  
    msg.replace("\n", ""); 
    msg.replace("\r", ""); 
    msg.replace("\t", ""); 

    Serial.printf("🔍 ข้อความหลังคลีนขยะแล้ว: %s\n", msg.c_str());

    if (String(topic) == mqtt_topic_sub) {
        if (msg == "1" || msg.indexOf("\"value\":1") != -1) {
            Serial.println("🎯 ได้รับคำสั่ง: เริ่มถ่ายภาพต่อเนื่องทุกๆ 10 วินาที!");
            isCapturing = true;  // เปิดระบบถ่ายภาพ
            lastCaptureTime = 0; // เซ็ตเป็น 0 เพื่อบังคับให้ถ่ายภาพแรกทันทีไม่ต้องรอ 10 วิ
        } 
        else if (msg == "0" || msg.indexOf("\"value\":0") != -1) {
            Serial.println("🛑 ได้รับคำสั่ง: หยุดถ่ายภาพ (Standby)");
            isCapturing = false; // ปิดระบบถ่ายภาพ
        } else {
            Serial.println("❓ คำสั่งไม่ตรงเงื่อนไข (มองไม่เห็นเลข 1 หรือ 0)");
        }
    }
}

// 🌟 ฟังก์ชันเชื่อมต่อ MQTT
void reconnectMQTT() {
    while (!client.connected()) {
        Serial.print("🔄 [MQTT] กำลังเชื่อมต่อเซิร์ฟเวอร์...");
        if (client.connect("ESP32CAM_CoE")) {
            Serial.println("✅ เชื่อมต่อสำเร็จ!");
            client.subscribe(mqtt_topic_sub); 
            Serial.printf("✅ [MQTT] รอรับคำสั่งที่ Topic: %s\n", mqtt_topic_sub);
        } else {
            Serial.print("❌ ล้มเหลว (Code: ");
            Serial.print(client.state());
            Serial.println(") รอ 5 วินาทีก่อนลองใหม่...");
            delay(5000);
        }
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("\n🚀 เริ่มต้นทำงาน ESP32-CAM (Auto-Capture & Upload to S3)...");
    
    // 1. ตั้งค่ากล้อง
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sscb_sda = SIOD_GPIO_NUM;
    config.pin_sscb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;
    
    // ความละเอียดภาพ (FRAMESIZE_VGA = 640x480)
    config.frame_size = FRAMESIZE_VGA; 
    config.jpeg_quality = 12; 
    config.fb_count = 1;

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("❌ Camera init failed: 0x%x\n", err);
        return;
    }
    Serial.println("✅ Camera init OK");

    // 2. เชื่อมต่อ Wi-Fi มหาลัย
    WiFi.disconnect(true);
    WiFi.mode(WIFI_STA);
    Serial.printf("🌐 กำลังเชื่อมต่อ %s ", ssid);
    WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);
    
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n✅ เชื่อมต่อ Wi-Fi สำเร็จ!");

    // 3. ตั้งค่า MQTT
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(mqttCallback);
}

void uploadImageToS3() {
    Serial.println("\n📸 กำลังถ่ายรูป...");
    
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("❌ ถ่ายรูปไม่สำเร็จ (Camera Capture Failed)");
        client.publish("cam/coe/status", "Camera Failed");
        return;
    }
    Serial.printf("✅ ถ่ายรูปสำเร็จ ขนาดไฟล์: %d bytes\n", fb->len);

    WiFiClientSecure httpsClient;
    httpsClient.setInsecure(); // ข้ามการตรวจ SSL
    HTTPClient http;

    String uploadUrl = "";

    // --- สเตป 1: ยิง GET ขอ Presigned URL จาก API Gateway ---
    Serial.println("🌐 กำลังขอ Presigned URL จาก API...");
    http.begin(httpsClient, api_url);
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        int startIdx = payload.indexOf("https://");
        if (startIdx != -1) {
            int endIdx = payload.indexOf("\"", startIdx);
            if (endIdx != -1) {
                uploadUrl = payload.substring(startIdx, endIdx); 
            } else {
                uploadUrl = payload.substring(startIdx); 
            }
            uploadUrl.replace("s3.amazonaws.com", "s3-ap-southeast-1.amazonaws.com");
            Serial.println("✅ ได้รับ URL แล้ว!");
        } 
    } else {
        Serial.printf("❌ ขอ URL จาก API พลาด! HTTP Code: %d\n", httpCode);
    }
    http.end();

    // --- สเตป 2: ยิง PUT เอารูปขึ้น S3 ---
    if (uploadUrl != "") {
        Serial.println("🚀 กำลังอัปโหลดรูปลง AWS S3...");
        http.begin(httpsClient, uploadUrl);
        http.addHeader("Content-Type", "image/jpeg"); 
        
        int putCode = http.sendRequest("PUT", fb->buf, fb->len);
        
        if (putCode == HTTP_CODE_OK || putCode == 200) {
            Serial.println("🎉 อัปโหลดรูปภาพเสร็จสมบูรณ์!");
            client.publish("cam/coe/status", "Upload Complete");
        } else {
            Serial.printf("❌ อัปโหลด S3 พลาด! HTTP Code: %d\n", putCode);
            client.publish("cam/coe/status", "Upload Failed");
        }
        http.end();
    } else {
        client.publish("cam/coe/status", "URL Fetch Failed");
    }

    esp_camera_fb_return(fb); 
    Serial.println("---------------------------------");
}

void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ Wi-Fi หลุด! กำลังต่อใหม่...");
        WiFi.disconnect();
        WiFi.begin(ssid, WPA2_AUTH_PEAP, eap_username, eap_username, eap_password);
        delay(5000); 
        return; 
    }

    if (!client.connected()) {
        reconnectMQTT();
    }
    client.loop(); 

    // 🌟 3. เช็คเงื่อนไขถ่ายภาพทุกๆ 10 วินาที
    if (isCapturing) {
        // ใช้ millis() เพื่อไม่ให้เกิดการ block การทำงานของ MQTT
        if (millis() - lastCaptureTime >= captureInterval || lastCaptureTime == 0) {
            lastCaptureTime = millis(); // จดจำเวลาปัจจุบันก่อนเริ่มถ่าย
            uploadImageToS3();          // เรียกฟังก์ชันถ่ายและอัปโหลด
        }
    }
}