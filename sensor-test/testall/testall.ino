#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// --- กำหนดขาอุปกรณ์ ---
#define DHTPIN 13 
#define LDR_PIN 32
#define SOUND_PIN 39
#define BUZZER_PIN 15 

DHT dht(DHTPIN, DHT11); 
LiquidCrystal_I2C lcd(0x27, 16, 2); 

void setup() {
    Serial.begin(115200);
    Serial.println("\n🚀 เริ่มรันระบบ Smart Diagnostics (R303)");

    lcd.init(); lcd.backlight();
    lcd.setCursor(0, 0); lcd.print("Smart CoE R303");
    lcd.setCursor(0, 1); lcd.print("Diagnostic Mode.");

    dht.begin();
    pinMode(LDR_PIN, INPUT_PULLUP); 
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);

    tone(BUZZER_PIN, 4000); delay(200); noTone(BUZZER_PIN);
    delay(1000); lcd.clear();
}

void loop() {
    Serial.println("\n=====================================");
    
    // --- 1. ตรวจสอบ DHT11 ---
    float t = dht.readTemperature(); 
    float h = dht.readHumidity();
    
    Serial.print("🌡️ DHT11: ");
    if (isnan(t) || isnan(h)) {
        Serial.println("❌ ERR (อ่านไม่ได้เลย) -> 🔍 เช็คสาย Data(13) หรือสาย VCC/GND อาจจะหลุด!");
    } else {
        Serial.printf("✅ ปกติ (Temp: %.1f C, Hum: %.1f %%)\n", t, h);
    }

    // --- 2. ตรวจสอบ LDR ---
    int lightVal = digitalRead(LDR_PIN);
    Serial.print("💡 LDR:   ");
    if (lightVal == 1) {
        Serial.println("🌑 มืด (1) -> ถ้าห้องสว่างอยู่แต่ขึ้น 1 ตลอด 🔍 เช็คสาย Data(32) หรือหมุนน็อตปรับความไวเพิ่ม");
    } else {
        Serial.println("☀️ สว่าง (0) -> ✅ ปกติ (ตรวจจับแสงได้)");
    }

    // --- 3. ตรวจสอบไมค์ (Sound Sensor) วิเคราะห์เชิงลึก ---
    unsigned long start = millis(); 
    unsigned int sMax = 0, sMin = 4095;
    while (millis() - start < 50) {
        int s = analogRead(SOUND_PIN);
        if (s < 4095) { 
            if (s > sMax) sMax = s; 
            if (s < sMin) sMin = s; 
        }
    }
    int soundVal = sMax - sMin;
    
    Serial.print("🎤 ไมค์:  ");
    // วิเคราะห์อาการป่วยของไมค์จากค่า Max/Min
    if (sMax <= 5 && sMin <= 5) {
        Serial.println("❌ ERR (ค่าเป็น 0 นิ่งสนิท) -> 🔍 เช็คสายไฟเลี้ยง (VCC) หลุดชัวร์ๆ!");
    } 
    else if (sMax >= 4090 && sMin >= 4090) {
        Serial.println("❌ ERR (ค่าทะลุ 4095 นิ่งสนิท) -> 🔍 เช็คสายกราวด์ (GND) หลุด หรือเสียบผิดช่อง!");
    } 
    else if (soundVal == 0) {
        Serial.println("⚠️ เตือน (ค่าไม่ขยับเลย) -> 🔍 ไฟเข้าปกติ แต่สาย Data(39) อาจจะหลุด หรือต้องใช้ไขควงหมุนน็อตสีฟ้าครับ");
    } 
    else {
        Serial.printf("✅ ปกติ (ความดัง: %d)\n", soundVal);
    }
    Serial.println("=====================================");

    // --- 4. แสดงผลบนจอ LCD ---
    lcd.setCursor(0, 0);
    if (isnan(t) || isnan(h)) {
        lcd.print("DHT: ERR!       ");
    } else {
        lcd.print("T:"); lcd.print(t, 1); 
        lcd.print(" H:"); lcd.print(h, 0); lcd.print("%   ");
    }

    lcd.setCursor(0, 1);
    lcd.print("L:"); lcd.print(lightVal);
    // แจ้งเตือนบนจอถ้าไมค์มีปัญหา
    if (sMax <= 5 || sMax >= 4090) {
        lcd.print(" S:ERR!    ");
    } else {
        lcd.print(" S:"); lcd.print(soundVal); lcd.print("      ");
    }

    delay(2000); 
}