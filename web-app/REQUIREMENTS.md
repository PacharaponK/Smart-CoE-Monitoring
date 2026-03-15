บทบาท: คุณเป็นนักพัฒนา Full-Stack และผู้เชี่ยวชาญด้าน UI/UX ที่มีประสบการณ์ในการสร้าง IoT Platform และ Data Visualization บนสถาปัตยกรรม AWS Cloud

งานที่ต้องทำ: พัฒนาและสร้างเว็บแอปพลิเคชัน IoT Dashboard สำหรับแพลตฟอร์มรวบรวมและแสดงผลข้อมูล (IoT data aggregation and visualization platform) โดยผสานการทำงานของ Backend ที่แข็งแกร่งเข้ากับ Frontend ที่มีสไตล์การออกแบบแบบ soft 3D claymorphism cards สร้างด้วย Next.js และ Tailwind CSS

เทคโนโลยีที่ต้องการ (Technology Stack):

- ฝั่ง Backend: Next.js API Routes (Serverless) ร่วมกับ AWS SDK สำหรับ Node.js
- ฝั่ง Frontend: Next.js พร้อมด้วย Tailwind CSS
- การสื่อสารแบบ Real-time: AWS IoT Core (MQTT over WebSocket) โดยใช้ mqtt.js และตรวจสอบสิทธิ์ผ่าน Amazon Cognito
- ไลบรารีสำหรับสร้างกราฟ: Chart.js หรือ Recharts
- ฐานข้อมูล: Amazon DynamoDB

ฟีเจอร์หลักและการออกแบบ (Features & Design):

1. Modern UI/UX Layout: ออกแบบเลย์เอาต์ที่สะอาดตา (clean layout) มีความเป็นมืออาชีพแต่เข้าถึงง่าย (Professional yet approachable design) รองรับ Responsive design เต็มรูปแบบผ่าน Tailwind breakpoints (sm, md, lg, xl) โดยใช้ flexbox และ grid layouts
2. Claymorphism & Aesthetics: ใช้สไตล์ soft 3D claymorphism สำหรับการ์ดแสดงผล ใช้ Tailwind utility classes ในการตกแต่งด้วยสีสันที่ดูมีพลัง (vibrant, engaging colors) เช่น electric blue, purple, teal และ orange gradients พร้อมใส่ภาพไอคอนอุปกรณ์เชื่อมต่อ (connected device icons)
3. Real-time Data Monitoring: รับข้อมูลเซ็นเซอร์ใหม่แบบ Real-time ทันทีผ่าน AWS IoT Core (MQTT over WebSocket) และแสดงผล data visualizations (charts, graphs, gauges, real-time sensor data displays) พร้อมด้วย animated metrics และ status indicators
4. Historical Data & Filters: ดึงข้อมูลย้อนหลังจาก Amazon DynamoDB ผ่าน Next.js API มาแสดงผลในตารางที่มี UI ทันสมัย รองรับ Pagination และสามารถกรองข้อมูล (Filter) ตาม "DeviceId" หรือ "SensorType" ได้

โครงสร้างฐานข้อมูล (Database Schema - Amazon DynamoDB):

- ชื่อตาราง: SensorData
- Partition Key (PK): DeviceId (String) - รหัสอุปกรณ์ เช่น gateway-one
- Sort Key (SK): Timestamp (String) - เวลาที่บันทึกข้อมูล รูปแบบ ISO8601
- Attributes:
  - SensorType (String)
  - SensorValue (Number)
  - QualityStatus (Number) - 1 = ปกติ, 0 = ผิดปกติ

การตั้งค่า Configuration (ใช้ Environment Variables แบบ .env.local):

- NEXT_PUBLIC_AWS_REGION="."
- NEXT_PUBLIC_IOT_ENDPOINT="."
- NEXT_PUBLIC_IDENTITY_POOL_ID="."
- NEXT_PUBLIC_MQTT_TOPIC="."
- AWS_ACCESS_KEY_ID="."
- AWS_SECRET_ACCESS_KEY="."

ผลลัพธ์ที่ต้องการ (Expected Output):

1. อธิบายภาพรวมโครงสร้างของโปรเจกต์ (Project structure แบบ Next.js App Router)
2. โค้ดฝั่ง Backend (Next.js API Routes สำหรับการทำ Query ข้อมูลจาก DynamoDB)
3. โค้ดฝั่ง Frontend (Next.js components ที่ใช้ Tailwind CSS สร้าง UI สไตล์ Claymorphism, โค้ดเชื่อมต่อ MQTT over WebSocket สำหรับกราฟ Real-time, และตารางข้อมูล) พร้อมนำเสนอ Tailwind CSS best practices
4. คำแนะนำทีละขั้นตอนสำหรับการตั้งค่าและรันโปรเจกต์ (Local setup)
