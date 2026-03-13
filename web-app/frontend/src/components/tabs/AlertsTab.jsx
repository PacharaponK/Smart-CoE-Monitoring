'use client';

export default function AlertsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">การแจ้งเตือน (Alerts)</h2>
        <p className="text-sm text-gray-400 mt-1">
          ดูรายการแจ้งเตือนและการแจ้งเหตุผิดปกติของระบบ
        </p>
      </div>
      <div className="clay-card animate-fade-in">
        <p className="text-gray-500 text-center py-12">
          การตั้งค่าและการประวัติการแจ้งเตือน — กำหนดเกณฑ์สำหรับระบบตรวจจับความผิดปกติ
        </p>
      </div>
    </div>
  );
}
