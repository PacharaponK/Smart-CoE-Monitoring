'use client';

export default function HelpTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ความช่วยเหลือ (Help)</h2>
        <p className="text-sm text-gray-400 mt-1">
          เอกสารประกอบการใช้งานและการสนับสนุน
        </p>
      </div>
      <div className="clay-card animate-fade-in">
        <div className="max-w-2xl mx-auto py-8">
          <h3 className="text-lg font-bold text-gray-700 mb-4">
            เริ่มต้นใช้งาน
          </h3>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              1. กำหนดค่าฝั่ง Frontend ในไฟล์{" "}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                .env.local
              </code>{" "}
              ด้วย URL ของ Backend
            </p>
            <p>
              2. กำหนดค่าฝั่ง Backend ในไฟล์{" "}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                backend/.env
              </code>{" "}
              ด้วยพาธของใบรับรอง AWS IoT mTLS และข้อมูลประจำตัว DynamoDB
            </p>
            <p>
              3. ตรวจสอบให้แน่ใจว่ามีตาราง DynamoDB ชื่อ{" "}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                SensorData
              </code>{" "}
              อยู่ในบัญชี AWS ของคุณ
            </p>
            <p>4. รัน Backend Proxy จากนั้นจึงรัน Next.js Frontend</p>
            <p>
              5. ติดตั้ง IoT Gateways ที่ทำการส่งข้อมูลไปยัง Topic{" "}
              <code className="px-1.5 py-0.5 rounded bg-gray-100 text-purple-600 text-xs">
                gateway/+/telemetry/aggregated
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
