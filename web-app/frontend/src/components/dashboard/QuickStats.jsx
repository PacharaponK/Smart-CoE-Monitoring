'use client';

import StatCard from '../StatCard';

export default function QuickStats({ stats, selectedRoom }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="อุณหภูมิเฉลี่ย"
        value={stats.avgTemperature.toFixed(1)}
        unit="°C"
        icon="thermometer"
        gradient="orange"
      />
      <StatCard
        title="ความชื้นเฉลี่ย"
        value={stats.avgHumidity.toFixed(1)}
        unit="%RH"
        icon="droplets"
        gradient="teal"
      />
      <StatCard
        title="ระดับเสียงเฉลี่ย"
        value={stats.avgSound.toFixed(1)}
        unit="dB"
        icon="volume-2"
        gradient="purple"
      />
      <StatCard
        title="สถานะแสงสว่าง"
        value={stats.avgLight >= 1 ? 'เปิด' : 'ปิด'}
        unit=""
        icon="lightbulb"
        gradient="yellow"
        subtitle={stats.avgLight >= 1 ? "ตรวจพบแสงสว่าง" : "ไม่มีแสงสว่าง / ปิดไฟ"}
      />
    </div>
  );
}
