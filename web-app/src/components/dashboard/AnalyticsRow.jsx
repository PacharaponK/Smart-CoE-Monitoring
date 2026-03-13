'use client';

import { Activity, Gauge } from 'lucide-react';
import RealtimeChart from '../RealtimeChart';
import SensorGauge from '../SensorGauge';

export default function AnalyticsRow({ filteredMessages, stats }) {
  return (
    <div className="flex flex-col gap-6">
      {/* กราฟ Real-time Chart - Full Width */}
      <div className="w-full space-y-4">
        <div className="clay-card !p-0 overflow-hidden group">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50/50 rounded-2xl text-blue-600 shadow-inner">
                <Activity size={20} className="animate-pulse-slow" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 tracking-tight">กราฟติดตามข้อมูลแบบสด</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest -mt-0.5">Live Telemetry Stream</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Connected</span>
            </div>
          </div>
          <div className="p-4">
            <RealtimeChart title="" chartType="area" messages={filteredMessages} />
          </div>
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
