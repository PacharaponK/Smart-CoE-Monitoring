บทบาท: คุณเป็นนักพัฒนา Full-Stack และผู้เชี่ยวชาญด้าน UI/UX ที่มีประสบการณ์ในการสร้าง IoT Platform และ Data Visualization

งานที่ต้องทำ: พัฒนาและสร้างเว็บแอปพลิเคชัน IoT Dashboard สำหรับแพลตฟอร์มรวบรวมและแสดงผลข้อมูล (IoT data aggregation and visualization platform) โดยผสานการทำงานของ Backend ที่แข็งแกร่งเข้ากับ Frontend ที่มีสไตล์การออกแบบแบบ soft 3D claymorphism cards สร้างด้วย Next.js และ Tailwind CSS

เทคโนโลยีที่ต้องการ (Technology Stack):

- ฝั่ง Backend: Node.js ร่วมกับ Express (หรือใช้ Next.js API Routes หากเหมาะสม)
- ฝั่ง Frontend: Next.js พร้อมด้วย Tailwind CSS
- การสื่อสารแบบ Real-time: Socket.io
- ไลบรารีสำหรับสร้างกราฟ: Chart.js หรือ Recharts

ฟีเจอร์หลักและการออกแบบ (Features & Design):

1. Modern UI/UX Layout: ออกแบบเลย์เอาต์ที่สะอาดตา (clean layout) มีความเป็นมืออาชีพแต่เข้าถึงง่าย (Professional yet approachable design) รองรับ Responsive design เต็มรูปแบบผ่าน Tailwind breakpoints (sm, md, lg, xl) โดยใช้ flexbox และ grid layouts
2. Claymorphism & Aesthetics: ใช้สไตล์ soft 3D claymorphism สำหรับการ์ดแสดงผล ใช้ Tailwind utility classes ในการตกแต่งด้วยสีสันที่ดูมีพลัง (vibrant, engaging colors) เช่น electric blue, purple, teal และ orange gradients พร้อมใส่ภาพไอคอนอุปกรณ์เชื่อมต่อ (connected device icons)
3. Real-time Data Monitoring Demo: รับข้อมูลเซ็นเซอร์ใหม่ผ่าน WebSocket และแสดงผล data visualizations ทันที (charts, graphs, gauges, real-time sensor data displays) พร้อมด้วย animated metrics และ status indicators
4. Historical Data & Filters: ดึงข้อมูลย้อนหลังจาก Azure SQL Database มาแสดงผลในตารางที่มี UI ทันสมัย รองรับ Pagination และสามารถกรองข้อมูล (Filter) ตาม "DeviceId" หรือ "SensorType" ได้

โครงสร้างฐานข้อมูล (Database Schema):
ชื่อตาราง: Telemetry
คอลัมน์:

- Id (bigint, PK, not null)
- DeviceId (varchar 50, not null)
- SensorType (varchar 50, not null)
- SensorValue (float, not null)
- QualityStatus (tinyint, null)
- CreatedAt (datetime2, null)

การตั้งค่า Configuration (ใช้ Environment Variables):

- SqlConnectionString: "Server=tcp:smartcoe.database.windows.net,1433;Initial Catalog=smartcoe-database;Persist Security Info=False;User ID=smartcoe;Password=123456789aA!;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"

ผลลัพธ์ที่ต้องการ (Expected Output):

1. อธิบายภาพรวมโครงสร้างของโปรเจกต์ (Project structure แบบ Next.js App Router/Pages Router)
2. โค้ดฝั่ง Backend (API, WebSocket server, และ SQL connection)
3. โค้ดฝั่ง Frontend (Next.js components ที่ใช้ Tailwind CSS สร้าง UI สไตล์ Claymorphism, กราฟ Real-time, และตารางข้อมูล) พร้อมนำเสนอ Tailwind CSS best practices
4. สคริปต์ SQL หรือ โมเดล ORM
5. คำแนะนำทีละขั้นตอนสำหรับการตั้งค่าและรันโปรเจกต์ (Local setup)
