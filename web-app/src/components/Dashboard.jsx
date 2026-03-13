'use client';

import { useMemo, useState } from 'react';
import { useMqtt } from './MqttProvider';
import DataTable from './DataTable';

// Modular Sub-components
import HeroSection from './dashboard/HeroSection';
import DashboardHeader from './dashboard/DashboardHeader';
import QuickStats from './dashboard/QuickStats';
import AnalyticsRow from './dashboard/AnalyticsRow';
import NodeStatus from './dashboard/NodeStatus';

export default function Dashboard() {
  const { isConnected, messages, deviceData, reconnect } = useMqtt();
  const [selectedRoom, setSelectedRoom] = useState('');

  // Memoized filtered messages based on room selection
  const filteredMessages = useMemo(() => {
    if (!selectedRoom) return messages;
    return messages.filter(m => m.DeviceId === selectedRoom);
  }, [messages, selectedRoom]);

  // Memoized stats calculation
  const stats = useMemo(() => {
    const devices = new Set(filteredMessages.map((m) => m.DeviceId).filter(Boolean));
    const temps = filteredMessages.filter((m) => m.SensorType === 'temperature').map((m) => m.SensorValue);
    const humids = filteredMessages.filter((m) => m.SensorType === 'humidity').map((m) => m.SensorValue);
    const sounds = filteredMessages.filter((m) => m.SensorType === 'sound').map((m) => m.SensorValue);
    const lights = filteredMessages.filter((m) => m.SensorType === 'light').map((m) => m.SensorValue);

    const avg = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return {
      totalDevices: devices.size,
      avgTemperature: temps.length > 0 ? avg(temps) : 0,
      avgHumidity: humids.length > 0 ? avg(humids) : 0,
      avgSound: sounds.length > 0 ? avg(sounds) : 0,
      avgLight: lights.length > 0 ? avg(lights) : 0,
      totalMessages: messages.length,
    };
  }, [filteredMessages, messages.length]);

  // Memoized filtered device data for status panel
  const filteredDeviceData = useMemo(() => {
    if (!selectedRoom) return deviceData;
    const filtered = {};
    Object.entries(deviceData).forEach(([id, data]) => {
      if (id === selectedRoom) {
        filtered[id] = data;
      }
    });
    return filtered;
  }, [deviceData, selectedRoom]);

  // Dynamic room options discovery
  const roomOptions = useMemo(() => {
    const uniqueRooms = new Set(messages.map(m => m.DeviceId).filter(Boolean));
    // Core PSU CoE rooms
    ['R200', 'R201', 'Co_Ai'].forEach(r => uniqueRooms.add(r));
    return [
      { label: 'ทุกห้อง (All Rooms)', value: '' },
      ...Array.from(uniqueRooms).sort().map(room => ({ label: room, value: room }))
    ];
  }, [messages]);

  return (
    <div className="space-y-6">
      <HeroSection />

      <DashboardHeader 
        selectedRoom={selectedRoom}
        onRoomChange={setSelectedRoom}
        roomOptions={roomOptions}
        isConnected={isConnected}
        onReconnect={reconnect}
      />

      <QuickStats 
        stats={stats} 
        selectedRoom={selectedRoom} 
      />

      <AnalyticsRow 
        filteredMessages={filteredMessages} 
        stats={stats} 
      />

      <NodeStatus 
        filteredDeviceData={filteredDeviceData} 
        selectedRoom={selectedRoom} 
      />

      <DataTable />
    </div>
  );
}
