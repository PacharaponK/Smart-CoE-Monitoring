'use client';

import { Activity, Zap } from 'lucide-react';

export default function NodeStatus({ filteredDeviceData, selectedRoom }) {
  return (
    <div className="clay-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
            <Zap size={18} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">สถานะอุปกรณ์</h3>
        </div>
        <div className="text-xs font-semibold text-gray-400 bg-gray-50 px-3 py-1 rounded-lg">
          {Object.keys(filteredDeviceData).length} โหนดที่เปิดใช้งาน
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.keys(filteredDeviceData).length > 0 ? (
          Object.entries(filteredDeviceData).map(([id, data]) => (
            <div key={id} className="clay-card-inset !p-3 flex items-center gap-4 group hover:scale-[1.02] transition-all duration-300">
              <div className="gradient-blue w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-100 group-hover/item:rotate-6 transition-transform">
                <span className="text-white text-lg font-black">
                  {id.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-700 truncate">{id}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase truncate">
                    {data.SensorType}
                  </p>
                </div>
              </div>
              <div className="font-mono text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                {data.SensorValue}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full clay-card-inset text-sm text-gray-400 text-center py-12 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
              <Activity size={20} className="text-gray-200" />
            </div>
            <p>กำลังรอข้อมูลจาก {selectedRoom === 'Co_Ai' ? 'AI Co-Working Space' : selectedRoom || 'โหนดที่เปิดใช้งาน'}...</p>
          </div>
        )}
      </div>
    </div>
  );
}
