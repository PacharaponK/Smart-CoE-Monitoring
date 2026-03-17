'use client';

import { useMemo } from 'react';
import { Activity, Gauge } from 'lucide-react';
import RealtimeChart from '../RealtimeChart';
import SensorGauge from '../SensorGauge';

export default function RoomAnalyticsCard({ room, messages }) {
  // Calculate stats for this specific room
  const roomStats = useMemo(() => {
    const latestMessages = {};
    
    // Get latest value for each sensor type for this room (case-insensitive)
    messages.forEach(msg => {
      const originalType = msg.SensorType || msg.sensorType || 'unknown';
      const type = originalType.toLowerCase();
      
      const msgDate = new Date(msg.receivedAt || msg.Timestamp);
      const latestDate = latestMessages[type] ? new Date(latestMessages[type].receivedAt || latestMessages[type].Timestamp) : new Date(0);
      
      if (!latestMessages[type] || msgDate > latestDate) {
        latestMessages[type] = msg;
      }
    });

    const getVal = (type) => {
      const lowerType = type.toLowerCase();
      const msg = latestMessages[lowerType];
      return Number(msg?.SensorValue ?? msg?.sensorValue ?? 0);
    };

    return {
      temperature: getVal('temperature'),
      humidity: getVal('humidity'),
      sound: getVal('sound'),
      light: getVal('light'),
    };
  }, [messages]);

  return (
    <div className="flex flex-col gap-6 w-full animate-slide-up">
      {/* Room Header & Chart */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 shadow-sm border border-blue-100">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">ห้อง: {room === 'Co_Ai' ? 'AI Co-Working Space' : room}</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">กระแสข้อมูลแบบ Real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-tight">กำลังใช้งาน</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart - Takes 2/3 space on large screens */}
          <div className="lg:col-span-2 clay-card bg-white/60 !p-6">
             <RealtimeChart 
                title="" 
                chartType="area" 
                messages={messages} 
              />
          </div>

          {/* Room Gauges - Takes 1/3 space on large screens */}
          <div className="lg:col-span-1 clay-card p-6 bg-white/80 relative overflow-hidden flex flex-col justify-center min-h-[400px]">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-100/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-amber-100/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-8 relative z-10">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-500 shadow-sm border border-amber-100/50">
                <Gauge size={16} />
              </div>
              <h4 className="font-bold text-gray-700 text-sm">ดัชนีสภาพแวดล้อม</h4>
            </div>

            <div className="grid grid-cols-2 gap-y-10 gap-x-4 relative z-10 items-center justify-items-center">
              <SensorGauge
                value={roomStats.temperature}
                max={50}
                label="อุณหภูมิ (°C)"
                color="#f97316"
                size={110}
              />
              <SensorGauge
                value={roomStats.humidity}
                max={100}
                label="ความชื้น (%RH)"
                color="#0ea5e9"
                size={110}
              />
              <SensorGauge
                value={roomStats.sound}
                max={120}
                label="ระดับเสียง (dB)"
                color="#8b5cf6"
                size={110}
              />
              <SensorGauge
                value={roomStats.light}
                max={1}
                label="แสงสว่าง"
                color="#fbbf24"
                size={110}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
