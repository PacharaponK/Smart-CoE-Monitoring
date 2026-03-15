'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar,
  Legend
} from 'recharts';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

export default function HistoryChart({ data = [], loading = false }) {
  const [chartType, setChartType] = useState('area'); // 'line', 'area', 'bar'

  const formattedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort by timestamp ascending for the chart
    return [...data]
      .sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
      .map(item => ({
        ...item,
        time: new Date(item.Timestamp).toLocaleString('th-TH', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: typeof item.SensorValue === 'number' ? item.SensorValue : parseFloat(item.SensorValue) || 0,
        type: item.SensorType,
        deviceId: item.DeviceId
      }));
  }, [data]);

  const sensorTypes = useMemo(() => {
    const types = new Set(formattedData.map(d => d.type));
    return Array.from(types);
  }, [formattedData]);

  // Group data by timestamp for multi-line charts if multiple types exist
  const groupedData = useMemo(() => {
    const timeMap = {};
    formattedData.forEach(item => {
      const time = item.time;
      if (!timeMap[time]) {
        timeMap[time] = { time };
      }
      timeMap[time][item.type] = item.value;
    });
    return Object.values(timeMap);
  }, [formattedData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="clay-card !p-3 !rounded-xl text-sm shadow-xl border-none">
        <p className="font-bold text-gray-700 mb-2 border-b pb-1">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-gray-600 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-gray-900">
              {entry.name === 'light' 
                ? (entry.value === 1 ? 'ON' : 'OFF')
                : (typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const isDigitalOnly = sensorTypes.length === 1 && sensorTypes[0] === 'light';

  const renderChart = () => {
    if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium">กำลังประมวลผลข้อมูล...</p>
        </div>
      );
    }

    if (formattedData.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
          <Activity size={40} className="mb-2 opacity-20" />
          <p className="text-sm font-medium">ไม่พบข้อมูลสำหรับแสดงกราฟ</p>
          <p className="text-xs opacity-60">ลองปรับเปลี่ยนตัวกรองข้อมูล</p>
        </div>
      );
    }

    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={groupedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {sensorTypes.map((type, i) => (
              <linearGradient key={type} id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            domain={[0, isDigitalOnly ? 1.2 : 'auto']}
            ticks={isDigitalOnly ? [0, 1] : undefined}
            tickFormatter={(val) => {
              if (isDigitalOnly) return val === 1 ? 'ON' : val === 0 ? 'OFF' : '';
              return val;
            }}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 'bold' }}
          />
          {sensorTypes.map((type, i) => {
            const color = COLORS[i % COLORS.length];
            const isTypeDigital = type === 'light';
            
            if (chartType === 'line') {
              return (
                <Line
                  key={type}
                  type={isTypeDigital ? "stepAfter" : "monotone"}
                  dataKey={type}
                  stroke={color}
                  strokeWidth={3}
                  dot={!isTypeDigital ? { r: 4, strokeWidth: 2, fill: 'white' } : false}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              );
            } else if (chartType === 'bar') {
              return (
                <Bar
                  key={type}
                  dataKey={type}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              );
            } else {
              return (
                <Area
                  key={type}
                  type={isTypeDigital ? "stepAfter" : "monotone"}
                  dataKey={type}
                  stroke={color}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#color-${type})`}
                  animationDuration={1500}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="clay-card !p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-500 shadow-sm">
            <TrendingUp size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">แนวโน้มข้อมูล (Data Trends)</h3>
            <p className="text-xs text-gray-400 font-medium">แสดงการเปลี่ยนแปลงของเซ็นเซอร์ตามช่วงเวลา</p>
          </div>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-xl self-start">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              chartType === 'area' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={14} />
            Area
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              chartType === 'line' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp size={14} />
            Line
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              chartType === 'bar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart2 size={14} />
            Bar
          </button>
        </div>
      </div>

      <div className="h-[350px] w-full">
        {renderChart()}
      </div>
    </div>
  );
}
