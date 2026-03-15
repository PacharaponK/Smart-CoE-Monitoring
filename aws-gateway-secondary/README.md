# aws-gateway-secondary

โฟลเดอร์นี้คือ gateway ตัวสำรอง (secondary) สำหรับรันบนอีกเครื่อง

## พฤติกรรม HA
- ปกติจะอยู่ในโหมด standby และไม่ forward ข้อมูลขึ้น AWS
- ถ้า primary (`gateway-one`) หาย heartbeat เกิน `FAILOVER_TIMEOUT_MS` จะสลับเป็น active ทันที
- เมื่อ primary กลับมาและส่ง heartbeat `alive` อีกครั้ง secondary จะหยุดงานและกลับไป standby ทันที
- secondary ใช้ AWS client id และ cert/key ชุดเดียวกับ primary ได้ โดยจะไม่ต่อ AWS ตอน standby เพื่อลดการชน session
- secondary publish ไปคนละ topic ผ่านค่า `AWS_PUBLISH_TOPIC`

## เตรียมไฟล์ก่อนรัน
1. คัดลอก cert/key ชุดเดียวกับ primary มาไว้ใน `secrets/`
2. ตั้งชื่อไฟล์ให้ตรงกับ `.env`:
   - `secrets/gateway.cert.pem`
   - `secrets/gateway.private.key`
3. ปรับค่าใน `.env` ให้ตรงกับเครื่องและ broker

## รัน
```bash
npm install
node main.js
```
