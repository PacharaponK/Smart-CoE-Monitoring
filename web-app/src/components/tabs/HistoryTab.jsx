'use client';

import HistoryDashboard from '../HistoryDashboard';

export default function HistoryTab() {
  return (
    <div className="space-y-6">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
          ประวัติข้อมูลย้อนหลัง
        </h2>
        <p className="text-sm text-gray-400 mt-1 font-medium">
          เรียกดูและกรองข้อมูลการตรวจวัดเซ็นเซอร์ที่จัดเก็บใน DynamoDB พร้อมการวิเคราะห์ข้อมูล
        </p>
      </div>
      
      <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
        <HistoryDashboard />
      </div>
    </div>
  );
}
