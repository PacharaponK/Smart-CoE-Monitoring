'use client';

import { LayoutDashboard, Activity, MapPin } from 'lucide-react';
import ClaySelect from '../ClaySelect';
import StatusIndicator from '../StatusIndicator';

export default function DashboardHeader({ 
  selectedRoom, 
  onRoomChange, 
  roomOptions, 
  isConnected, 
  onReconnect 
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="gradient-blue p-3 rounded-2xl shadow-lg shadow-blue-200 animate-bounce-slow">
          <LayoutDashboard className="text-white" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
            <Activity size={14} className="text-emerald-400" />
            <span>ระบบวิเคราะห์ข้อมูล IoT แบบ Real-time</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <ClaySelect 
          value={selectedRoom}
          onChange={onRoomChange}
          options={roomOptions}
          placeholder="เลือกห้อง"
          icon={MapPin}
          className="w-48"
        />
        <StatusIndicator isConnected={isConnected} onReconnect={onReconnect} />
      </div>
    </div>
  );
}
