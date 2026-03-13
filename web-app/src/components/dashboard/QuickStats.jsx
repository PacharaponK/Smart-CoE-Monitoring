'use client';

import StatCard from '../StatCard';

export default function QuickStats({ stats, selectedRoom }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="อุปกรณ์ที่เชื่อมต่อ"
        value={stats.totalDevices}
        unit="ตัว"
        icon="wifi"
        gradient="blue"
        subtitle={selectedRoom ? `ในห้อง ${selectedRoom}` : "ทั้งอาคาร"}
      />
      <StatCard
        title="อุณหภูมิเฉลี่ย"
        value={stats.avgTemperature.toFixed(1)}
        unit="°C"
        icon="thermometer"
        gradient="orange"
        trend={2.3}
      />
      <StatCard
        title="ระดับเสียงเฉลี่ย"
        value={stats.avgSound.toFixed(1)}
        unit="dB"
        icon="volume-2"
        gradient="green"
        trend={0.8}
      />
      <StatCard
        title="สถานะแสงสว่าง"
        value={stats.avgLight === 1 ? 'เปิด' : 'ปิด'}
        unit=""
        icon="lightbulb"
        gradient="yellow"
        subtitle={stats.avgLight === 1 ? "ความสว่างปกติ" : "แสงสว่างน้อย"}
      />
    </div>
  );
}
