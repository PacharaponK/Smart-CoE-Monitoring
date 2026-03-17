'use client';

import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, BarChart, Bar,
  Legend
} from 'recharts';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#6366f1', // indigo
  '#14b8a6', // teal
];

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
        deviceId: item.DeviceId,
        room: item.Room || item.room || item.DeviceId || 'N/A'
      }));
  }, [data]);

  const series = useMemo(() => {
    const uniqueRooms = new Set(formattedData.map(d => d.room));
    const uniqueTypes = new Set(formattedData.map(d => d.type));

    const uniqueSeries = new Set();
    formattedData.forEach(d => {
      uniqueSeries.add(`${d.room}#${d.type}`);
    });

    return Array.from(uniqueSeries).map(s => {
      const [room, type] = s.split('#');
      let label = `${room} - ${type}`;

      // Simplify label if only one dimension has multiple values
      if (uniqueRooms.size === 1 && uniqueTypes.size > 1) {
        label = type;
      } else if (uniqueTypes.size === 1 && uniqueRooms.size > 1) {
        label = room;
      } else if (uniqueRooms.size === 1 && uniqueTypes.size === 1) {
        label = type;
      }

      return {
        key: s,
        room,
        type,
        label,
        isDigital: type === 'light'
      };
    });
  }, [formattedData]);

  // Group data by timestamp for multi-series charts
  const groupedData = useMemo(() => {
    const timeMap = {};
    formattedData.forEach(item => {
      const time = item.time;
      if (!timeMap[time]) {
        timeMap[time] = { time };
      }
      const seriesKey = `${item.room}#${item.type}`;
      timeMap[time][seriesKey] = item.value;
    });
    return Object.values(timeMap);
  }, [formattedData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="clay-card !p-3 !rounded-xl text-sm shadow-xl border-none max-h-[300px] overflow-y-auto">
        <p className="font-bold text-gray-700 mb-2 border-b pb-1 sticky top-0 bg-white/80 backdrop-blur-sm z-10">{label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-gray-600 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-gray-900">
              {entry.dataKey?.endsWith('#light')
                ? (entry.value === 1 ? 'ON' : 'OFF')
                : (typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const isDigitalOnly = series.length > 0 && series.every(s => s.isDigital);

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
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-black">ปรับตัวกรองเพื่อดูข้อมูล</p>
        </div>
      );
    }

    const ChartComponent = chartType === 'line' ? LineChart : chartType === 'bar' ? BarChart : AreaChart;

    return (
      <div className="h-full w-full animate-in fade-in zoom-in-95 duration-1000">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={groupedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.key} id={`color-${s.key.replace(/[^a-zA-Z0-9]/g, '_')}`} x1="0" y1="0" x2="0" y2="1">
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
            {series.map((s, i) => {
              const color = COLORS[i % COLORS.length];
              const isTypeDigital = s.isDigital;
              const gradientId = `color-${s.key.replace(/[^a-zA-Z0-9]/g, '_')}`;

              if (chartType === 'line') {
                return (
                  <Line
                    key={s.key}
                    name={s.label}
                    type={isTypeDigital ? "stepAfter" : "monotone"}
                    dataKey={s.key}
                    stroke={color}
                    strokeWidth={3}
                    dot={!isTypeDigital && series.length < 5 ? { r: 4, strokeWidth: 2, fill: 'white', stroke: color } : false}
                    activeDot={{ r: 6, strokeWidth: 0, fill: color }}
                    animationDuration={1500}
                    connectNulls
                  />
                );
              } else if (chartType === 'bar') {
                return (
                  <Bar
                    key={s.key}
                    name={s.label}
                    dataKey={s.key}
                    fill={color}
                    radius={[4, 4, 0, 0]}
                    animationDuration={1500}
                  />
                );
              } else {
                return (
                  <Area
                    key={s.key}
                    name={s.label}
                    type={isTypeDigital ? "stepAfter" : "monotone"}
                    dataKey={s.key}
                    stroke={color}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill={`url(#${gradientId})`}
                    animationDuration={1500}
                    connectNulls
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
            <h3 className="text-xl font-black text-gray-800 tracking-tight uppercase tracking-widest">แนวโน้มข้อมูลแยกตามห้อง</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">สถิติและแนวโน้มทุกห้อง</p>
          </div>
        </div>

        <div className="flex bg-gray-100/50 p-1.5 rounded-2xl self-start shadow-inner-sm border border-gray-100">
          <button
            onClick={() => setChartType('area')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${chartType === 'area' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <Activity size={14} />
            พื้นที่
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${chartType === 'line' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <TrendingUp size={14} />
            เส้น
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${chartType === 'bar' ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <BarChart2 size={14} />
            แท่ง
          </button>
        </div>
      </div>

      <div className="h-[400px] w-full relative z-10">
        {renderChart()}
      </div>
    </div>
  );
}
