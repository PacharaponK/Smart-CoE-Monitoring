# aws-gateway-secondary

โฟลเดอร์นี้คือ gateway ตัวสำรอง (secondary) สำหรับรันบนอีกเครื่อง

## พฤติกรรม HA
- ปกติจะอยู่ในโหมด standby และไม่ forward ข้อมูลขึ้น AWS
- ถ้า primary (`gateway-one`) หาย heartbeat เกิน `FAILOVER_TIMEOUT_MS` จะสลับเป็น active ทันที
- เมื่อ primary กลับมาและส่ง heartbeat `alive` อีกครั้ง secondary จะหยุดงานและกลับไป standby ทันที
- secondary ใช้ AWS client id และ cert/key ชุดเดียวกับ primary ได้ โดยจะไม่ต่อ AWS ตอน standby เพื่อลดการชน session
- secondary publish ไปคนละ topic ผ่านค่า `AWS_PUBLISH_TOPIC`
- ถ้า MQTT broker หลักล่ม ระบบจะสลับไป `MQTT_FALLBACK_BROKER_URL` อัตโนมัติ และจะลองกลับไป broker หลักอีกครั้งตาม `MQTT_PRIMARY_RETRY_MS`

## เตรียมไฟล์ก่อนรัน
1. คัดลอก cert/key ชุดเดียวกับ primary มาไว้ใน `secrets/`
2. ตั้งชื่อไฟล์ให้ตรงกับ `.env`:
   - `secrets/gateway.cert.pem`
   - `secrets/gateway.private.key`
3. ปรับค่าใน `.env` ให้ตรงกับเครื่องและ broker

## MQTT Fallback
- ตั้ง `MQTT_BROKER_URL` เป็น broker หลัก เช่น `mqtt://localhost:1883`
- ตั้ง `MQTT_FALLBACK_BROKER_URL` เป็น public broker ที่ต้องการใช้ตอน broker หลักล่ม เช่น `mqtt://test.mosquitto.org:1883`
- ถ้า public broker ไม่ต้อง auth ให้ปล่อย `MQTT_FALLBACK_USERNAME` และ `MQTT_FALLBACK_PASSWORD` ว่างได้
- ระบบจะ reconnect ไป fallback หลังจากรอ `MQTT_RECONNECT_DELAY_MS` และจะ probe กลับ broker หลักทุก `MQTT_PRIMARY_RETRY_MS`

## รัน

### โหมด Foreground (ทดสอบ)
```bash
npm install
npm start
```

### โหมด Background Service (PM2)
PM2 เป็น process manager ที่ช่วยให้โปรแกรมรักษาความทำงานเมื่อ process ตาย และให้ดูทรซิ่งได้ง่าย

#### ขั้นแรก ติดตั้ง pm2 global
```bash
npm install -g pm2
```

#### เริ่ม service
```bash
npm run start:daemon
```

#### ดูสถานะ
```bash
npm run status:daemon
```

#### ดู log ในรีแอล-ไทม์
```bash
npm run logs:daemon
```

#### หยุด/รีสตาร์ท
```bash
npm run stop:daemon
npm run restart:daemon
```

#### ให้ restart อัตโนมัติตอน reboot ระบบ
```bash
pm2 startup
pm2 save
```

### โหมด Systemd (ทางเลือก Linux ที่ native)
ถ้าต้องการใช้ systemd แทน pm2:

1. สร้างไฟล์ `/etc/systemd/system/aws-gateway-secondary.service`:
```ini
[Unit]
Description=AWS Gateway Secondary MQTT Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/porpi5/aws-gateway-secondary
ExecStart=/usr/bin/node /home/porpi5/aws-gateway-secondary/main.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

2. โหลดและเพิ่มเข้าระบบ:
```bash
sudo systemctl daemon-reload
sudo systemctl enable aws-gateway-secondary
sudo systemctl start aws-gateway-secondary
```

3. ดูสถานะและ log:
```bash
sudo systemctl status aws-gateway-secondary
sudo journalctl -u aws-gateway-secondary -f
```
