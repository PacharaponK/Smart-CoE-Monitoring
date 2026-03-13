'use client';

import { Activity, Zap } from 'lucide-react';
import RealtimeChart from '../RealtimeChart';
import SensorGauge from '../SensorGauge';

export default function AnalyticsRow({ filteredMessages, stats }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* กราฟ Real-time Chart */}
      <div className="xl:col-span-2 space-y-4">
        <div className="clay-card !p-0 overflow-hidden group">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-500">
                <Activity size={18} />
              </div>
              <h3 className="font-bold text-gray-700">Live Telemetry</h3>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Live Stream
            </div>
          </div>
          <div className="p-4">
            <RealtimeChart title="" chartType="area" messages={filteredMessages} />
          </div>
        </div>
      </div>

      {/* แผงแสดงมาตรวัดเซ็นเซอร์ (Sensor Gauges Card) */}
      <div className="clay-card h-full flex flex-col">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
            <Zap size={18} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">มาตรวัดสภาพแวดล้อม</h3>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-10 items-center">
          <SensorGauge
            value={stats.avgTemperature}
            max={50}
            label="Temperature"
            color="#f97316"
          />
          <SensorGauge
            value={stats.avgHumidity}
            max={100}
            label="Humidity"
            color="#14b8a6"
          />
          <SensorGauge
            value={stats.avgSound}
            max={120}
            label="Sound (dB)"
            color="#22c55e"
          />
          <SensorGauge
            value={stats.avgLight}
            max={1}
            label="Light"
            color="#fbbf24"
          />
        </div>
      </div>
    </div>
  );
}
