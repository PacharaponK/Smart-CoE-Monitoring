'use client';

import { useMemo } from 'react';
import { Activity, Gauge } from 'lucide-react';
import RealtimeChart from '../RealtimeChart';
import SensorGauge from '../SensorGauge';

export default function AnalyticsRow({ filteredMessages, stats, selectedRoom }) {
  // Group messages by room
  const messagesByRoom = useMemo(() => {
    const groups = {};
    filteredMessages.forEach(msg => {
      const room = msg.Room || msg.room || msg.DeviceId || 'Unknown';
      if (!groups[room]) groups[room] = [];
      groups[room].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  const roomList = Object.keys(messagesByRoom).sort();

  return (
    <div className="flex flex-col gap-6">
      {/* กราฟ Real-time Chart Section */}
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">กราฟติดตามข้อมูลแบบสด</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Live Telemetry Stream</p>
            </div>
          </div>
          {selectedRoom === '' && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              แสดงข้อมูล {roomList.length} ห้อง
            </span>
          )}
        </div>

        <div className="clay-card !p-0 overflow-hidden">
          {roomList.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              ไม่พบข้อมูลเซ็นเซอร์ในขณะนี้
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${selectedRoom === '' && roomList.length > 1 ? 'lg:grid-cols-2 lg:divide-x lg:divide-gray-50' : ''} divide-y divide-gray-50`}>
              {roomList.map(room => (
                <div key={room} className="flex flex-col group">
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white/40">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      <h4 className="font-bold text-gray-700">Room: {room}</h4>
                    </div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold uppercase">Live</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <RealtimeChart 
                      title="" 
                      chartType="area" 
                      messages={messagesByRoom[room]} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* แผงแสดงมาตรวัดเซ็นเซอร์ (Sensor Gauges Card) - Full Width */}
      <div className="clay-card flex flex-col bg-white/80 overflow-hidden relative">
        {/* Subtle decorative background element */}
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-100/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 mb-10 relative z-10">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shadow-sm border border-amber-100/50">
            <Gauge size={20} />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 tracking-tight">ดัชนีชี้วัดสภาพแวดล้อม</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest -mt-0.5">Environmental Indices</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 items-center relative z-10">
          <SensorGauge
            value={stats.avgTemperature}
            max={50}
            label="Temperature (°C)"
            color="#f97316"
          />
          <SensorGauge
            value={stats.avgHumidity}
            max={100}
            label="Humidity (%RH)"
            color="#0ea5e9"
          />
          <SensorGauge
            value={stats.avgSound}
            max={120}
            label="Sound (dB)"
            color="#8b5cf6"
          />
          <SensorGauge
            value={stats.avgLight}
            max={1}
            label="Ambient Light"
            color="#fbbf24"
          />
        </div>
      </div>
    </div>
  );
}
