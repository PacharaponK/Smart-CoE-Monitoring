'use client';

import { useMemo } from 'react';
import RoomAnalyticsCard from './RoomAnalyticsCard';

export default function AnalyticsRow({ filteredMessages = [], selectedRoom = '' }) {
  // Group messages by room
  const messagesByRoom = useMemo(() => {
    const groups = {};
    if (!Array.isArray(filteredMessages)) return groups;
    
    filteredMessages.forEach(msg => {
      if (!msg) return;
      const room = msg.Room || msg.room || msg.DeviceId || 'Unknown';
      if (!groups[room]) groups[room] = [];
      groups[room].push(msg);
    });
    return groups;
  }, [filteredMessages]);

  const roomList = Object.keys(messagesByRoom).sort();

  if (roomList.length === 0) {
    return (
      <div className="clay-card p-12 text-center text-gray-400 bg-white/60 w-full">
        <p className="text-lg font-medium">ไม่พบข้อมูลเซ็นเซอร์ในขณะนี้</p>
        <p className="text-xs mt-2 opacity-60">กรุณาตรวจสอบการเชื่อมต่อหรือเลือกห้องอื่น</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in">
      {roomList.map(room => (
        <RoomAnalyticsCard 
          key={room} 
          room={room} 
          messages={messagesByRoom[room]} 
        />
      ))}
    </div>
  );
}

