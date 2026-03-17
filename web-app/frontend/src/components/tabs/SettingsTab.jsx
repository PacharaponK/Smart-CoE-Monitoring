'use client';

export default function SettingsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">ตั้งค่า</h2>
        <p className="text-sm text-gray-400 mt-1">
          กำหนดค่าการทำงานและความชอบส่วนตัว
        </p>
      </div>
      <div className="clay-card animate-fade-in">
        <p className="text-gray-500 text-center py-12">
          การตั้งค่าระบบและการจัดการค่ากำหนดของ AWS
        </p>
      </div>
    </div>
  );
}
