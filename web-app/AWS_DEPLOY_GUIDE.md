# คู่มือการ Deploy Smart CoE Monitoring บน AWS EC2 Free Tier (t2.micro/t3.micro)

แอปพลิเคชันนี้รันบนเครื่อง RAM 1GB ได้ แต่ต้องมีการตั้งค่าพิเศษเพื่อไม่ให้เครื่องค้างระหว่าง Build Next.js

---

## ส่วนที่ 1: การเตรียมเครื่อง EC2 (Ubuntu 22.04 LTS)

1. **Launch Instance**: เลือก Ubuntu 22.04 LTS (t3.micro หรือ t2.micro)
2. **Security Group**: เปิด Port ดังนี้:
   * **TCP 22** (SSH) - สำหรับคุณเข้าเครื่อง
   * **TCP 80** (HTTP) - สำหรับหน้าเว็บหลัก
   * **TCP 443** (HTTPS) - สำหรับ SSL
   * **TCP 3000** (Next.js) และ **TCP 4000** (Socket.io) - (แนะนำให้ปิดไว้แล้วใช้ Nginx เป็น Proxy แทน)

---

## ส่วนที่ 2: ขั้นตอนการตั้งค่าเครื่อง (Run these commands on EC2)

### 1. ติดตั้ง Node.js และ PM2
```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. **สำคัญมาก**: สร้าง Swap File (ป้องกันเครื่องค้าง)
เครื่อง Free Tier มี RAM แค่ 1GB แต่ Next.js Build ต้องการมากกว่านั้น
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 3. เตรียมโปรเจกต์
```bash
git clone <URL_GitHub_ของคุณ>
cd smart-coe-monitoring/web-app

# ติดตั้ง Dependencies
npm run install:all

# Build Frontend (จะใช้เวลานิดหน่อย แต่ Swap จะช่วยให้ไม่ค้าง)
npm run build:frontend
```

---

## ส่วนที่ 3: การรันแอปพลิเคชันด้วย PM2

เพื่อให้แอปทำงานเบื้องหลังและรันใหม่เองเมื่อเครื่องรีสตาร์ท:
```bash
# รันทั้งคู่ตาม config ที่ผมเตรียมไว้
pm2 start ecosystem.config.js

# บันทึกสถานะเพื่อให้รันใหม่หลังรีบูต
pm2 save
pm2 startup
# (ทำตามคำสั่งที่ระบบแนะนำในขั้นตอนนี้)
```

---

## ส่วนที่ 4: การตั้งค่า Nginx (เพื่อให้เข้าเว็บผ่าน IP ได้เลย)

1. ติดตั้ง Nginx: `sudo apt install nginx -y`
2. ตั้งค่า Proxy: `sudo nano /etc/nginx/sites-available/default`
3. แก้ไขไฟล์ให้เป็นดังนี้ (เน้นการใช้ IP):
```nginx
server {
    listen 80;
    server_name _; # ยอมรับการเชื่อมต่อผ่าน IP ทุกตัว

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend (Socket.io / API Proxy)
    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```
4. Restart Nginx: `sudo systemctl restart nginx`

---

## หมายเหตุสำคัญสำหรับการใช้ IP:
* **Public IP**: ตรวจสอบ Public IP ของคุณในหน้า AWS Console (ควรทำเป็น Elastic IP เพื่อไม่ให้ IP เปลี่ยนเมื่อรีสตาร์ทเครื่อง)
* **.env**: ในไฟล์ `web-app/frontend/.env` ให้ตั้งค่า:
    * `NEXT_PUBLIC_BACKEND_URL=http://<เลข-IP-ของคุณ>`
* **Security Group**: ใน AWS Console ต้องเปิดพอร์ต **TCP 80** (HTTP) ให้กับ `0.0.0.0/0` (ทุกคนเข้าได้)
