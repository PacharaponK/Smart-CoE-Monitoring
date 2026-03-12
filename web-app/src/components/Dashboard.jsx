'use client';

import { useMqtt } from './MqttProvider';
import StatCard from './StatCard';
import RealtimeChart from './RealtimeChart';
import SensorGauge from './SensorGauge';
import DataTable from './DataTable';
import StatusIndicator from './StatusIndicator';
import { useMemo } from 'react';

export default function Dashboard() {
  const { isConnected, messages, deviceData, reconnect } = useMqtt();

  const stats = useMemo(() => {
    const devices = new Set(messages.map((m) => m.DeviceId).filter(Boolean));
    const temps = messages.filter((m) => m.SensorType === 'temperature').map((m) => m.SensorValue);
    const humids = messages.filter((m) => m.SensorType === 'humidity').map((m) => m.SensorValue);
    const sounds = messages.filter((m) => m.SensorType === 'sound').map((m) => m.SensorValue);
    const lights = messages.filter((m) => m.SensorType === 'light').map((m) => m.SensorValue);

    const avg = (arr) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return {
      totalDevices: devices.size,
      avgTemperature: temps.length > 0 ? avg(temps) : 0,
      avgHumidity: humids.length > 0 ? avg(humids) : 0,
      avgSound: sounds.length > 0 ? avg(sounds) : 0,
      avgLight: lights.length > 0 ? avg(lights) : 0,
      totalMessages: messages.length,
    };
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time IoT sensor monitoring and analytics
          </p>
        </div>
        <StatusIndicator isConnected={isConnected} onReconnect={reconnect} />
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Connected Devices"
          value={stats.totalDevices}
          unit="devices"
          icon="wifi"
          gradient="blue"
          subtitle="Active gateways"
        />
        <StatCard
          title="Avg Temperature"
          value={stats.avgTemperature.toFixed(1)}
          unit="°C"
          icon="thermometer"
          gradient="orange"
          trend={2.3}
        />
        <StatCard
          title="Avg Sound Level"
          value={stats.avgSound.toFixed(1)}
          unit="dB"
          icon="volume-2"
          gradient="green"
          trend={0.8}
        />
        <StatCard
          title="Light Status"
          value={stats.avgLight === 1 ? 'ON' : 'OFF'}
          unit=""
          icon="lightbulb"
          gradient="yellow"
        />
      </div>

      {/* Charts & Gauges Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Real-time Chart */}
        <div className="xl:col-span-2">
          <RealtimeChart title="Real-time Sensor Data" chartType="area" />
        </div>

        {/* Gauges */}
        <div className="clay-card animate-fade-in">
          <h3 className="text-lg font-bold text-gray-700 mb-6">Sensor Levels</h3>
          <div className="grid grid-cols-2 gap-6">
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
              label="Light (On/Off)"
              color="#fbbf24"
            />
          </div>
        </div>
      </div>

      {/* Device Status Cards */}
      <div className="clay-card animate-fade-in">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Device Status</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.keys(deviceData).length > 0 ? (
            Object.entries(deviceData).map(([id, data]) => (
              <div key={id} className="clay-card-inset flex items-center gap-3">
                <div className="gradient-blue w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">
                    {id.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-700 truncate">{id}</p>
                  <p className="text-xs text-gray-400">
                    Last: {data.SensorType} = {data.SensorValue}
                  </p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-slow flex-shrink-0" />
              </div>
            ))
          ) : (
            <div className="sm:col-span-2 lg:col-span-3 clay-card-inset text-sm text-gray-400 text-center py-8">
              No active device telemetry received yet.
            </div>
          )}
        </div>
      </div>

      {/* Data Table */}
      <DataTable />
    </div>
  );
}
