'use client';

import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { ClayCard } from '../ui/ClayCard';

interface SensorData {
  DeviceId: string;
  SensorType: string;
  SensorValue: number;
  Timestamp: string;
}

export const RealTimeChart = ({ sensorType }: { sensorType: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketIo = io();
    setSocket(socketIo);

    socketIo.on('sensorData', (newData: SensorData) => {
      if (newData.SensorType === sensorType) {
        setData((prev) => {
          const updated = [...prev, {
            time: new Date(newData.Timestamp).toLocaleTimeString(),
            value: parseFloat(newData.SensorValue.toString()),
          }].slice(-20); // Keep last 20 points
          return updated;
        });
      }
    });

    return () => {
      socketIo.disconnect();
    };
  }, [sensorType]);

  return (
    <ClayCard className="h-[400px] w-full flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-xl text-gray-800">{sensorType} Real-time</h3>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-sm text-gray-500 font-medium">Live</span>
        </div>
      </div>
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
              animationDuration={300}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ClayCard>
  );
};
