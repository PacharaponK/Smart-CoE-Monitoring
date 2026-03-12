'use client';

import React, { useEffect, useState } from 'react';
import awsIoTFrontend from '@/lib/aws-iot-frontend';
import { ClayCard } from '../ui/ClayCard';
import { LucideIcon } from 'lucide-react';

interface StatusCardProps {
  label: string;
  unit: string;
  sensorType: string;
  icon: LucideIcon;
  color: 'blue' | 'purple' | 'teal' | 'orange';
}

export const StatusCard: React.FC<StatusCardProps> = ({ label, unit, sensorType, icon: Icon, color }) => {
  const [value, setValue] = useState<string>('--');

  useEffect(() => {
    // Connect to AWS IoT frontend
    awsIoTFrontend.connect();
    
    // Register message handler
    const handlerKey = `status-card-${sensorType}`;
    awsIoTFrontend.onMessage(handlerKey, (data) => {
      if (data.SensorType === sensorType) {
        setValue(parseFloat(data.SensorValue.toString()).toFixed(1));
      }
    });

    return () => { 
      awsIoTFrontend.removeMessageHandler(handlerKey);
    };
  }, [sensorType]);

  return (
    <ClayCard color={color} className="flex flex-col gap-3 min-w-[200px]">
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/50 backdrop-blur-md rounded-2xl">
          <Icon size={24} className="text-gray-800" />
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className="flex items-baseline gap-1">
          <h2 className="text-4xl font-bold text-gray-900">{value}</h2>
          <span className="text-lg font-semibold text-gray-500">{unit}</span>
        </div>
      </div>
      <div className="mt-2 h-1.5 w-full bg-white/30 rounded-full overflow-hidden">
        <div 
          className="h-full bg-white/60 transition-all duration-500" 
          style={{ width: value === '--' ? '0%' : `${(parseFloat(value) / 100) * 100}%` }}
        />
      </div>
    </ClayCard>
  );
};
