'use client';

export default function DevicesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">อุปกรณ์ (Devices)</h2>
        <p className="text-sm text-gray-400 mt-1">
          จัดการและตรวจสอบสถานะของอุปกรณ์ IoT ที่เชื่อมต่อ
        </p>
      </div>
      <div className="clay-card animate-fade-in">
        <p className="text-gray-500 text-center py-12">
          แผงจัดการอุปกรณ์ — เชื่อมต่อกับ AWS IoT Core เพื่อดูอุปกรณ์ที่เปิดใช้งานอยู่
        </p>
      </div>
    </div>
  );
}
