'use client';

import { Navbar, Sidebar } from '@/components/layout/Navigation';
import { StatusCard } from '@/components/dashboard/StatusCard';
import { RealTimeChart } from '@/components/dashboard/RealTimeChart';
import { Thermometer, Droplets, Gauge, Cpu } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Sidebar />
      
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              IoT Dashboard
            </h1>
            <p className="text-gray-500 font-medium">
              Real-time monitoring and analytics for your connected devices.
            </p>
          </header>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatusCard 
              label="Temperature" 
              unit="°C" 
              sensorType="Temperature" 
              icon={Thermometer} 
              color="orange" 
            />
            <StatusCard 
              label="Humidity" 
              unit="%" 
              sensorType="Humidity" 
              icon={Droplets} 
              color="blue" 
            />
            <StatusCard 
              label="Pressure" 
              unit="hPa" 
              sensorType="Pressure" 
              icon={Gauge} 
              color="teal" 
            />
            <StatusCard 
              label="Active Devices" 
              unit="" 
              sensorType="System" 
              icon={Cpu} 
              color="purple" 
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <RealTimeChart sensorType="Temperature" />
            <RealTimeChart sensorType="Humidity" />
          </div>

          <div className="grid grid-cols-1 gap-8">
            <RealTimeChart sensorType="Pressure" />
          </div>
        </div>
      </main>
    </div>
  );
}
