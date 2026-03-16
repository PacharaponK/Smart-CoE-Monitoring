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
        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-[2rem] bg-gray-50/50">
          <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
            <Activity size={40} className="text-gray-200" />
          </div>
          <p className="text-sm font-bold text-gray-600">ไม่พบข้อมูลสำหรับแสดงกราฟ</p>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">Adjust filters to see results</p>
        </div>
      );
    }

    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;

    return (
      <div className="h-full w-full animate-in fade-in zoom-in-95 duration-1000">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={groupedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {sensorTypes.map((type, i) => (
                <linearGradient key={type} id={`color-${type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis 
              domain={[0, isDigitalOnly ? 1.2 : 'auto']}
              ticks={isDigitalOnly ? [0, 1] : undefined}
              tickFormatter={(val) => {
                if (isDigitalOnly) return val === 1 ? 'ON' : val === 0 ? 'OFF' : '';
                return val;
              }}
              tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              wrapperStyle={{ 
                paddingBottom: '30px', 
                fontSize: '11px', 
                fontWeight: '900', 
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
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
                    strokeWidth={4}
                    dot={!isTypeDigital ? { r: 5, strokeWidth: 3, fill: 'white', stroke: color } : false}
                    activeDot={{ r: 8, strokeWidth: 0, fill: color }}
                    animationDuration={2000}
                  />
                );
              } else if (chartType === 'bar') {
                return (
                  <Bar
                    key={type}
                    dataKey={type}
                    fill={color}
                    radius={[6, 6, 0, 0]}
                    animationDuration={2000}
                  />
                );
              } else {
                return (
                  <Area
                    key={type}
                    type={isTypeDigital ? "stepAfter" : "monotone"}
                    dataKey={type}
                    stroke={color}
                    strokeWidth={4}
                    fillOpacity={1}
                    fill={`url(#color-${type})`}
                    animationDuration={2000}
                  />
                );
              }
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="clay-card !p-8 border border-white/50 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-blue-100/40 transition-colors duration-1000" />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white rounded-2xl text-blue-500 shadow-sm border border-blue-50 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase tracking-widest">แนวโน้มข้อมูล</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Sensor Analytics & Trends</p>
          </div>
        </div>

        <div className="flex bg-gray-100/50 p-1.5 rounded-2xl self-start shadow-inner-sm border border-gray-100">
          <button
            onClick={() => setChartType('area')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
              chartType === 'area' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Activity size={14} />
            Area
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
              chartType === 'line' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <TrendingUp size={14} />
            Line
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${
              chartType === 'bar' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <BarChart2 size={14} />
            Bar
          </button>
        </div>
      </div>

      <div className="h-[400px] w-full relative z-10">
        {renderChart()}
      </div>
    </div>
  );
}
