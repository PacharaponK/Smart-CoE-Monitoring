# โครงการ Smart CoE Monitoring

ระบบ IoT อัจฉริยะสำหรับเฝ้าระวังและจัดการสภาพแวดล้อมภายในอาคารภาควิชาวิศวกรรมคอมพิวเตอร์ (CoE) แบบครบวงจร ระบบทำงานโดยรวบรวมข้อมูลจากเซ็นเซอร์หลากหลายชนิดตามห้องต่างๆ ผ่านโครงข่ายเกตเวย์ที่ออกแบบให้เหมาะสมกับพื้นที่แต่ละชั้น และส่งข้อมูลขึ้นระบบ Cloud เพื่อแสดงผล วิเคราะห์ และคำนวณต้นทุนพลังงานแบบเรียลไทม์

---

## 1. อุปกรณ์ฮาร์ดแวร์และเซ็นเซอร์ (Hardware & Sensor Nodes)

### 1.1 ภาพรวมของ Multimodal Board

แต่ละห้องจะถูกติดตั้ง **Multimodal Board** ซึ่งพัฒนาขึ้นบน **ESP32-WROOM DevKit** ทำหน้าที่เป็น Sensor Node สำหรับวัดค่าสภาพแวดล้อมและส่งข้อมูลผ่านเครือข่ายไร้สาย บอร์ดประกอบด้วยอุปกรณ์หลักดังนี้:

| อุปกรณ์             | รุ่น/ชนิด                    | หน้าที่                                                                                                            |
| ------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Microcontroller** | ESP32-WROOM DevKit           | ประมวลผลหลัก, Wi-Fi/BLE, ควบคุมเซ็นเซอร์ทั้งหมด                                                                    |
| **Wireless Module** | nRF24L01+                    | ส่งข้อมูลไร้สายไปยัง Sensor Gateway (2.4 GHz) — **ติดตั้งเฉพาะห้องที่ใช้ nRF เท่านั้น** (ไม่มีในบอร์ดของห้อง R201) |
| **Temp/Humidity**   | DHT11 หรือ DHT22             | วัดอุณหภูมิและความชื้นสัมพัทธ์                                                                                     |
| **Light Sensor**    | LDR (Photoresistor)          | ตรวจจับสถานะแสงไฟในห้อง (เปิด/ปิด)                                                                                 |
| **Sound Sensor**    | Sound Sensor Module (Analog) | วัดระดับความดังเสียงในห้อง                                                                                         |
| **Active Buzzer**   | Active Buzzer                | แจ้งเตือนเสียงเมื่อค่าเซ็นเซอร์เกิน Threshold                                                                      |
| **LCD Display**     | LCD 16x2 (I2C)               | แสดงผลค่าเซ็นเซอร์และสถานะระบบบนตัวบอร์ด                                                                           |

นอกจากนี้ยังมี **ESP32-CAM** ติดตั้งแยกที่ห้อง **Co_Ai** เพื่อถ่ายภาพสภาพภายในห้อง โดยส่งข้อมูลภาพขึ้น Cloud โดยตรงผ่านกลไก Presigned URL ของ AWS S3 (อธิบายในหัวข้อ 5)

---

### 1.2 การกำหนด Pin (Pinout)

#### ตาราง Pin Assignment

| เซ็นเซอร์ / โมดูล     |    GPIO Pin (ESP32)     | ประเภทสัญญาณ | หมายเหตุ                               |
| --------------------- | :---------------------: | ------------ | -------------------------------------- |
| **nRF24L01+ — CE**    |       GPIO **4**        | Digital Out  | Chip Enable — **เฉพาะบอร์ด nRF**       |
| **nRF24L01+ — CSN**   |       GPIO **5**        | Digital Out  | Chip Select (SPI) — **เฉพาะบอร์ด nRF** |
| **nRF24L01+ — SCK**   |       GPIO **18**       | SPI Clock    | SPI Bus — **เฉพาะบอร์ด nRF**           |
| **nRF24L01+ — MOSI**  |       GPIO **23**       | SPI Data Out | SPI Bus — **เฉพาะบอร์ด nRF**           |
| **nRF24L01+ — MISO**  |       GPIO **19**       | SPI Data In  | SPI Bus — **เฉพาะบอร์ด nRF**           |
| **DHT11/22 — DATA**   |       GPIO **13**       | Digital I/O  | One-Wire, Pull-up 4.7kΩ                |
| **LDR — Analog Out**  |       GPIO **32**       | Analog In    | Voltage Divider กับ R_LDR 10kΩ         |
| **Sound Sensor — AO** | GPIO **39** (SENSOR_VN) | Analog In    | Analog Output จาก Sound Module         |
| **Buzzer — Gate**     |       GPIO **15**       | Digital Out  | ผ่าน N-MOSFET (2N7000) + R 220Ω        |
| **LCD I2C — SDA**     |       GPIO **21**       | I2C Data     | I2C Bus (Default ESP32)                |
| **LCD I2C — SCL**     |       GPIO **22**       | I2C Clock    | I2C Bus (Default ESP32)                |

> **หมายเหตุ:** บอร์ดของห้อง **R201** ใช้โปรโตคอล **ESP-NOW** ในการสื่อสาร ซึ่งทำงานผ่าน Wi-Fi ภายใน ESP32-WROOM โดยตรง จึง**ไม่ติดตั้งโมดูล nRF24L01+** และไม่มีการต่อสาย SPI สำหรับ nRF บนบอร์ดดังกล่าว

---

### 1.3 วงจรและการต่อสาย (Schematic)

#### แหล่งจ่ายไฟ

บอร์ดรับไฟจาก **Micro-USB (5V VBUS)** และผ่านตัวแปลงแรงดัน **LD1117-3.3** เพื่อจ่าย **3.3V** ให้กับทุกอุปกรณ์บนบอร์ด

#### nRF24L01+ Wireless Module

- รับไฟ **3.3V** พร้อม **Decoupling Capacitor 10µF** เพื่อกรองสัญญาณรบกวน (จำเป็นมากสำหรับ nRF24L01+)
- สื่อสารกับ ESP32 ผ่าน **SPI Bus** (SCK, MOSI, MISO) และสายควบคุม CE/CSN

#### DHT11/22 Temperature & Humidity Sensor

- จ่ายไฟ **3.3V**
- สาย DATA ต่อที่ **GPIO 13** พร้อม **Pull-up Resistor 4.7kΩ** ไปยัง 3.3V (จำเป็นสำหรับโปรโตคอล One-Wire)

#### LDR Light Sensor

- ต่อเป็นวงจร **Voltage Divider** โดย LDR ด้านหนึ่งรับ **3.3V** อีกด้านต่อกับ **GPIO 32** และ **Resistor 10kΩ** ลง GND
- ESP32 อ่านค่า ADC แล้วแปลงเป็นสถานะ `0` (ปิด) หรือ `1` (เปิด) ตาม Threshold

#### Sound Sensor Module

- จ่ายไฟ **3.3V**
- ใช้ขา **AO (Analog Output)** ต่อกับ **GPIO 39 (SENSOR_VN)** เพื่ออ่านค่าความดังเสียงแบบ Analog
- ขา DO (Digital Output) เป็น Optional ไม่ได้ใช้งาน

#### LCD 16x2 (I2C)

- จ่ายไฟ **3.3V** หรือ **5V** ผ่าน I2C Backpack Module (PCF8574)
- สื่อสารกับ ESP32 ผ่าน **I2C Bus** บน **GPIO 21 (SDA)** และ **GPIO 22 (SCL)**
- ใช้แสดงค่าเซ็นเซอร์ปัจจุบัน (อุณหภูมิ, ความชื้น, สถานะแสง ฯลฯ) และสถานะการเชื่อมต่อของระบบบนตัวบอร์ดโดยตรง

#### Active Buzzer (วงจร N-MOSFET Driver)

- Buzzer ต่อระหว่าง **+3.3V** และ **Drain** ของ N-MOSFET **(2N7000)**
- **GPIO 15** ควบคุม Gate ของ MOSFET ผ่าน **Resistor 220Ω (R_B_GATE)**
- มี **Pull-down Resistor 10kΩ (R_B_PD)** ที่ Gate เพื่อป้องกัน Buzzer ทำงานโดยไม่ตั้งใจเมื่อ ESP32 เริ่มทำงาน
- เมื่อ GPIO 15 = HIGH → MOSFET เปิด → Buzzer ดัง

---

### 1.4 ข้อมูล SensorType และ Payload

| เซ็นเซอร์        | SensorType    | หน่วย / ค่าที่เป็นไปได้ |
| ---------------- | ------------- | ----------------------- |
| **DHT11/22**     | `temperature` | °C (เช่น 26.70)         |
| **DHT11/22**     | `humidity`    | % RH (เช่น 65.00)       |
| **LDR**          | `light`       | `0` = ปิด, `1` = เปิด   |
| **Sound Sensor** | `sound`       | ค่า ADC / dB (เช่น 450) |

---

## 2. โครงสร้างเครือข่ายและเส้นทางการส่งข้อมูล (Network Topology)

ระบบถูกออกแบบให้มีการส่งข้อมูลแบบลำดับชั้น (Hierarchical) เพื่อความเสถียรและรองรับการสำรอง (Redundancy) โดยแบ่งออกเป็น 2 ชั้น ดังนี้:

### ชั้น 2: Mixed Protocol & Local Gateway

- **จุดติดตั้งเซ็นเซอร์**: ห้อง R200, R201, AI Co-Working Space (Co_Ai) และ CoE Co-Working Space (Co_CoE)
- **โปรโตคอลการส่งข้อมูล**:
  - ห้อง **R200** และ **Co_Ai**: ใช้โปรโตคอล **nRF24L01** ส่งข้อมูลมายัง Sensor Gateway
  - ห้อง **R201**: ใช้โปรโตคอล **ESP-NOW** ส่งข้อมูลมายัง Sensor Gateway
- **Sensor Gateway (ชั้น 2)**: ตั้งอยู่ที่ห้อง **Co_CoE** ทำหน้าที่รวบรวมข้อมูลจากโหนดเซ็นเซอร์ทุกห้องในชั้น 2 แปลงข้อมูลเป็น **MQTT** แล้วส่งต่อไปยัง **Dual Edge Gateway** ที่ห้อง PUPA
- **ESP-CAM (Co_Ai)**: ส่งข้อมูลภาพขึ้น AWS Cloud โดยตรง ไม่ผ่าน Sensor Gateway

### ชั้น 3: High Availability nRF Gateway

- **จุดติดตั้งเซ็นเซอร์**: ห้อง **R303**
- **โปรโตคอลการส่งข้อมูล**: ใช้โปรโตคอล **nRF24L01** ส่งข้อมูลไปยัง Sensor Gateway ชั้น 3
- **Sensor Gateway (ชั้น 3)**: รับข้อมูลจากโหนดในชั้น 3 แปลงเป็น MQTT และส่งต่อไปยัง **Dual Edge Gateway** ที่ห้อง PUPA เช่นเดียวกัน

### MQTT Topic ที่ Sensor Gateway ใช้ส่งข้อมูล

Sensor Gateway แต่ละชั้นจะ publish ข้อมูลมาในรูปแบบดังนี้:

```
Topic  : sensors/{ชื่อห้อง}/{ประเภทเซ็นเซอร์}
ตัวอย่าง: sensors/R200/temperature

Payload: {"value": 26.70, "isAlert": {"value": 0, "reason": ""}}
```

---

## 3. Dual Edge Gateway (ห้อง PUPA)

Sensor Gateway จากทั้งสองชั้นจะส่งข้อมูลผ่าน MQTT มาสู่ **Dual Edge Gateway** ที่ห้อง PUPA ซึ่งประกอบด้วยอุปกรณ์ 2 ชิ้น:

| อุปกรณ์            | บทบาท                                                            |
| ------------------ | ---------------------------------------------------------------- |
| **Raspberry Pi 5** | **Primary Gateway** — MQTT Server + Web Server + Edge Processing |
| **Raspberry Pi 3** | **Secondary Gateway** — Standby / HA Failover                    |

### หน้าที่หลักของ Gateway (ทั้ง Pi 5 และ Pi 3)

Gateway ทำหน้าที่เป็นตัวกลางระหว่าง Sensor Network กับ AWS Cloud โดยประมวลผลที่ขอบเครือข่าย (Edge Computing) ก่อนส่งข้อมูลขึ้น Cloud มีขั้นตอนการทำงานดังนี้:

1. **อ่านค่าตั้งต้นจากไฟล์ `.env`**: เช่น ที่อยู่ MQTT Broker, ห้องที่ต้อง subscribe, ช่วงเวลาการส่ง (`SEND_INTERVAL`) และข้อมูล Certificate สำหรับ AWS IoT Core
2. **รับข้อมูลจาก Sensor Gateway**: Subscribe topic `sensors/{ชื่อห้อง}/{ประเภทเซ็นเซอร์}` ผ่าน MQTT
3. **ตรวจสอบและแปลงข้อมูล**: Validate payload ที่เข้ามา และแปลงค่า alert ให้อยู่ในรูปมาตรฐาน
4. **พักข้อมูลในบัฟเฟอร์**: จัดกลุ่มตาม `deviceId` และ `sensorType`
5. **ส่งข้อมูลตาม `SEND_INTERVAL`**: คำนวณค่าเฉลี่ยของแต่ละกลุ่ม ประเมินคุณภาพข้อมูล (เช่น อุณหภูมิ/ความชื้นอยู่ในช่วงที่ยอมรับได้หรือไม่) แล้ว publish ไปยัง Topic บน **AWS IoT Core**

### MQTT Failover

Gateway รองรับ **MQTT Failover** เพื่อให้การรับข้อมูลต่อเนื่องไม่ขาดหาย:

- ระบบจะเชื่อมต่อ **Primary MQTT Broker** ก่อนเสมอ
- หาก Primary ล่ม จะสลับไปใช้ **Public/Fallback Broker** อัตโนมัติ
- ขณะใช้งาน Fallback อยู่ ระบบจะตรวจสอบ Primary Broker เป็นระยะ และสลับกลับทันทีเมื่อ Primary ฟื้นตัว

### High Availability (HA) ระหว่าง Pi 5 และ Pi 3

- ระบบมี **Heartbeat** สื่อสารระหว่าง Primary (Pi 5) และ Secondary (Pi 3) ตลอดเวลา
- หาก Pi 5 (Primary) หยุดทำงาน Pi 3 จะรับช่วงต่อการทำงานทันที
- เมื่อ Pi 5 ฟื้นตัวกลับมา Pi 3 จะเปลี่ยนกลับสู่สถานะ Standby

### Web Server (บน Pi 5 เท่านั้น)

Pi 5 ยังทำหน้าที่ host **Web Server สำหรับตั้งค่าระบบ** ซึ่งเข้าถึงได้เฉพาะภายในวงเครือข่ายของ Router เท่านั้น (เพื่อความปลอดภัยสูงสุด) หากต้องการเข้าถึงจากระยะไกลจำเป็นต้องเชื่อมต่อผ่าน **VPN** ก่อน

เว็บนี้สามารถส่งคำสั่งผ่าน MQTT Topic ต่างๆ ดังนี้:

| วัตถุประสงค์             | MQTT Topic                               | Payload ตัวอย่าง                              |
| ------------------------ | ---------------------------------------- | --------------------------------------------- |
| ควบคุมกล้อง ESP-CAM      | `cam/coe/cap`                            | `{"value": 1}` (ถ่าย) / `{"value": 0}` (หยุด) |
| ตั้ง Threshold เซ็นเซอร์ | `threshold/{ชื่อห้อง}/{ประเภทเซ็นเซอร์}` | `{"value": 25.43}`                            |
| รีเซ็ตโหมดการทำงาน       | `reset/{ชื่อห้อง}/resetmode`             | `{"value": 1}`                                |
| หยุดการทำงาน             | `reset/{ชื่อห้อง}/stop`                  | `{"value": 1}`                                |

**ตัวอย่าง Topic:**

```
threshold/R200/temperature  →  {"value": 25.43}
cam/coe/cap                 →  {"value": 1}
reset/R200/resetmode        →  {"value": 1}
reset/R200/stop             →  {"value": 1}
```

---

## 4. โครงสร้างเครือข่าย (Network Infrastructure)

### MikroTik Router (RB951G-2HnD)

ระบบใช้ **MikroTik RB951G-2HnD** เพื่อแยกวง Network สำหรับ IoT โดยเฉพาะ โดย Dual Edge Gateway (Raspberry Pi) เชื่อมต่อโดยตรงกับ Router นี้

### Port Forwarding

จากการทดสอบพบว่าสัญญาณ Wi-Fi จาก Router ไม่สามารถครอบคลุมถึง Multimodal Board ที่ชั้น 2 ได้โดยตรง จึงใช้เทคนิค **Port Forwarding** โดย:

- ตั้งค่า Router ให้ Primary Gateway เปิด Port ที่ MQTT Server ใช้งาน
- เมื่อมีการเชื่อมต่อมาที่ IP ของ Router พร้อม Port ดังกล่าว Router จะส่งต่อการเชื่อมต่อไปยัง Primary Gateway โดยอัตโนมัติ
- แม้วิธีนี้จะลดระดับความปลอดภัยลงเล็กน้อยเมื่อเทียบกับการอยู่ในวงปิดสมบูรณ์ แต่ยังมีความปลอดภัยสูงกว่าการใช้ Wi-Fi สาธารณะ และเพิ่มระดับความปลอดภัยของระบบโดยรวมขึ้น 1 ระดับ

---

## 5. สถาปัตยกรรมระบบคลาวด์ (Cloud Architecture)

โครงการใช้สถาปัตยกรรม **AWS Serverless IoT** เต็มรูปแบบ:

### 5.1 การไหลของข้อมูลเซ็นเซอร์

```
Dual Edge Gateway
       ↓ (MQTT over mTLS)
AWS IoT Core
       ↓ (IoT Rule — ตรวจสอบข้อมูลทุกค่า)
AWS Lambda: ParseAndSaveIoTData
       ↓
Amazon DynamoDB Table: "IoTData"
```

#### AWS IoT Core

รับข้อมูล MQTT จาก Edge Gateways ผ่าน **mTLS Authentication** และมี **IoT Rules Engine** คอยตรวจสอบข้อมูลทุกค่าที่ส่งมาเพื่อส่งต่อไปยัง Lambda

#### AWS Lambda: `ParseAndSaveIoTData`

Lambda ฟังก์ชันนี้มีหน้าที่หลัก 2 ประการ:

**1. บันทึกข้อมูลลง DynamoDB:**

- บันทึกข้อมูลเซ็นเซอร์ลง DynamoDB Table **"IoTData"**
- ตั้งค่า **TTL 7 วัน** เพื่อล้างข้อมูลเก่าอัตโนมัติ
- ใช้ **AWS SDK v3** แบบ Document Client
- Schema: `Partition Key = DeviceId`, `Sort Key = Timestamp`

**2. ส่งการแจ้งเตือนผ่าน Discord:**

- มีฟังก์ชันจับคู่ `DeviceId` กับห้องต่างๆ เพื่อเลือก **Discord Webhook** ที่เกี่ยวข้อง
- เมื่อตรวจพบค่าผิดปกติ (`IsAlert = 1`) ระบบจะส่งแจ้งเตือนแบบ **Embed Message** ผ่าน Discord พร้อมแสดง:
  - รายละเอียดอุปกรณ์และห้อง
  - ค่าเซ็นเซอร์ที่ผิดปกติ
  - เหตุผลของการแจ้งเตือน
  - เวลาที่แปลงเป็นโซน **Asia/Bangkok** แล้ว

### 5.2 การอัปโหลดภาพจาก ESP-CAM

```
ESP-CAM (Co_Ai)
       ↓ GET /get-url
AWS API Gateway
       ↓
AWS Lambda: GetS3UploadURL (Python)
       ↓ (Presigned URL, อายุ 5 นาที)
ESP-CAM อัปโหลดโดยตรง
       ↓
AWS S3 Bucket: "smart-coe-images"
```

#### AWS Lambda: `GetS3UploadURL` (Python)

- สร้าง **Presigned URL** เพื่อให้ ESP-CAM อัปโหลดรูปภาพขึ้น S3 ได้โดยตรงโดยไม่ต้องผ่านเซิร์ฟเวอร์
- ตั้งชื่อไฟล์อัตโนมัติตามรูปแบบ `images/YYYYMMDD_HHMMSS.jpg` (ใช้เวลา UTC)
- Presigned URL มีอายุ **5 นาที (300 วินาที)**
- Response เมื่อสำเร็จ (`statusCode 200`):
  ```json
  {
    "upload_url": "https://...",
    "file_name": "images/20250101_120000.jpg"
  }
  ```
- Response เมื่อเกิดข้อผิดพลาด (`statusCode 500`): ข้อความแสดงข้อผิดพลาด

---

## 6. เว็บแอปพลิเคชัน Monitoring (Web Application)

Web App พัฒนาด้วย **Next.js** พร้อมดีไซน์แบบ **Claymorphism** มีฟีเจอร์หลักดังนี้:

### 6.1 Dashboard (Real-time)

- แสดงค่าปัจจุบันของเซ็นเซอร์ทุกห้องแบบ Real-time
- ใช้ **WebSocket ที่ต่อตรงกับ AWS IoT Core** เพื่อรับข้อมูลทันทีโดยไม่ต้อง Polling
- แสดงกราฟแนวโน้ม 24 ชั่วโมงย้อนหลัง

### 6.2 History Dashboard

- ค้นหาข้อมูลย้อนหลังตามช่วงเวลา ห้อง และประเภทเซ็นเซอร์
- ฟังก์ชันส่งออกข้อมูลเป็น **CSV**
- ดึงข้อมูลผ่าน Endpoint **`GET /sensors`** ซึ่งรองรับ:
  - **โหมดห้องเดียว**: ใช้ Pagination มาตรฐาน
  - **โหมด Dashboard (หลายห้อง)**: ดึงข้อมูลหน้าแรกจากทุกห้องพร้อมกัน เรียงลำดับตามเวลา และตัดผลลัพธ์ตาม `limit` ที่กำหนด
  - รองรับพารามิเตอร์ `rooms` ทั้งรูปแบบ **CSV** และ **JSON Array**
  - การแปลงรูปแบบเวลา และการกรองตาม `sensorType`

### 6.3 Energy & Cost Analytics

- วิเคราะห์การใช้พลังงานไฟฟ้า (kWh) โดยคำนวณจากสถานะ `light` sensor
- คำนวณค่าไฟประมาณการตามอัตราของ **MEA/PEA** (ค่าไฟฐาน + ค่า Ft + VAT)

### 6.4 Room Images (ESP-CAM)

- ดึงและแสดงรูปภาพล่าสุดจาก ESP-CAM ที่ห้อง Co_Ai
- ใช้ Endpoint **`GET /list-images`** เพื่อดึงรายการภาพจาก S3 Bucket มาแสดง

---

## 7. การติดตั้งและจุดใช้งานปัจจุบัน

| ห้อง                              | คำอธิบาย                             | ชั้น | โปรโตคอล |
| --------------------------------- | ------------------------------------ | ---- | -------- |
| **R200**                          | ห้องปฏิบัติการคอมพิวเตอร์            | 2    | nRF24L01 |
| **R201**                          | ห้องปฏิบัติการคอมพิวเตอร์            | 2    | ESP-NOW  |
| **Co_Ai** (AI Co-Working Space)   | พื้นที่ทำงานร่วมกันด้าน AI + ESP-CAM | 2    | nRF24L01 |
| **Co_CoE** (CoE Co-Working Space) | Sensor Gateway ชั้น 2                | 2    | —        |
| **R303**                          | ห้องปฏิบัติการวิจัย                  | 3    | nRF24L01 |
| **PUPA**                          | Dual Edge Gateway (Pi 5 + Pi 3)      | —    | —        |

_หมายเหตุ: ห้อง COE, AIE, NETWORK และ R302 ถูกนำออกจากระบบการแสดงผลปัจจุบันเพื่อเน้นพื้นที่ใช้งานหลัก_

---

## 8. สรุปภาพรวมการไหลของข้อมูลทั้งระบบ

```
[Sensor Nodes (ESP32)]
    │
    ├─ nRF24L01 (R200, Co_Ai, R303)
    └─ ESP-NOW  (R201)
    │
    ▼
[Sensor Gateway แต่ละชั้น]  ←──────── (MQTT Topic: sensors/{room}/{type})
    │
    ▼
[Dual Edge Gateway @ PUPA]
  ├─ Raspberry Pi 5 (Primary): Edge Processing + MQTT Server + Web Server
  └─ Raspberry Pi 3 (Secondary): HA Standby
    │
    ├─ Heartbeat HA ◄──────────────────────────────────────┐
    │                                                       │
    ▼                                                       │
[AWS IoT Core]  ←── mTLS MQTT                              │
    │                                                       │
    ▼                                                       │
[IoT Rules Engine]                                         │
    │                                                       │
    ▼                                                       │
[AWS Lambda: ParseAndSaveIoTData]                          │
    ├─ DynamoDB "IoTData" (TTL 7 วัน)                      │
    └─ Discord Alert (เมื่อ IsAlert = 1)                   │
                                                           │
[ESP-CAM @ Co_Ai]                                          │
    └─ GET /get-url → API Gateway → Lambda: GetS3UploadURL │
           └─ Presigned URL → S3 "smart-coe-images"        │
                                                           │
[Web App (Next.js)]                                        │
    ├─ WebSocket ──────────────── AWS IoT Core (Real-time) ─┘
    ├─ GET /sensors ──────────── API Gateway → DynamoDB
    └─ GET /list-images ──────── API Gateway → S3
```
