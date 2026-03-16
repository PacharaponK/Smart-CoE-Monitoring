'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Filter, RefreshCw, Activity, MapPin, Database, Download, Calendar, TrendingUp, Clock } from 'lucide-react';
import ClaySelect from './ClaySelect';
import HistoryChart from './HistoryChart';
import DataTable from './DataTable';

export default function HistoryDashboard() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');

  // Data State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestSeqRef = useRef(0);

  // Filter State
  const [deviceId, setDeviceId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [room, setRoom] = useState('');
  const [timePreset, setTimePreset] = useState('1d');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [limit, setLimit] = useState(20000); // Default to a very high number as required by API
  const [showFilters, setShowFilters] = useState(true);

  // Time preset options
  const timePresets = [
    { label: '1 ชม.', value: '1h' },
    { label: '6 ชม.', value: '6h' },
    { label: '1 วัน', value: '1d' },
    { label: '7 วัน', value: '7d' },
    { label: '30 วัน', value: '30d' },
    { label: 'กำหนดเอง', value: 'custom' },
  ];

  // Handle preset change
  useEffect(() => {
    if (timePreset && timePreset !== 'custom') {
      const now = new Date();
      let start = new Date();

      switch (timePreset) {
        case '1h':
          start = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          start = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '1d':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const toLocalISO = (date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
      };

      setStartTime(toLocalISO(start));
      setEndTime(toLocalISO(now));
    }
  }, [timePreset]);

  const fetchData = useCallback(async () => {
    const requestSeq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const baseUrl = backendUrl ? (backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl) : '';
      const url = new URL(`${baseUrl}/api/sensor-data`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

      if (deviceId) url.searchParams.set('deviceId', deviceId);
      if (sensorType) url.searchParams.set('sensorType', sensorType);
      if (room) url.searchParams.set('room', room);
      if (startTime) url.searchParams.set('startTime', new Date(startTime).toISOString());
      if (endTime) url.searchParams.set('endTime', new Date(endTime).toISOString());
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('fetchAll', 'true');

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch data');

      const result = await res.json();
      if (requestSeq !== requestSeqRef.current) return;
      setData(result.items || []);
    } catch (err) {
      if (requestSeq !== requestSeqRef.current) return;
      setError(err.message);
      setData([]);
    } finally {
      if (requestSeq !== requestSeqRef.current) return;
      setLoading(false);
    }
  }, [backendUrl, deviceId, sensorType, room, startTime, endTime, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReset = () => {
    setDeviceId('');
    setSensorType('');
    setRoom('');
    setStartTime('');
    setEndTime('');
    setLimit(20000);
    setTimePreset('1d');
  };

  const sensorTypeOptions = [
    { label: 'ทุกประเภท', value: '' },
    { label: 'Temperature (อุณหภูมิ)', value: 'temperature' },
    { label: 'Humidity (ความชื้น)', value: 'humidity' },
    { label: 'Sound (ระดับเสียง)', value: 'sound' },
    { label: 'Light (ความสว่าง)', value: 'light' },
    { label: 'Motion (การเคลื่อนไหว)', value: 'motion' },
  ];

  const roomOptions = [
    { label: 'ทุกห้อง', value: '' },
    { label: 'R200', value: 'R200' },
    { label: 'R201', value: 'R201' },
    { label: 'R303', value: 'R303' },
    { label: 'AI Co-Working Space', value: 'Co_Ai' },
  ];

  const stats = useMemo(() => {
    if (!data.length) return null;
    const values = data.map(d => typeof d.SensorValue === 'number' ? d.SensorValue : parseFloat(d.SensorValue) || 0);
    const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
    const isLightData = sensorType === 'light';

    return {
      avg: avgValue,
      max: Math.max(...values),
      min: Math.min(...values),
      count: data.length,
      isLightData
    };
  }, [data, sensorType]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="clay-card !p-6 relative z-30">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
              <Filter size={20} />
            </div>
            <h3 className="text-lg font-bold text-gray-700">ตัวกรองข้อมูล (Filters)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (data.length === 0) return;
                const headers = ['DeviceId', 'Room', 'Timestamp', 'SensorType', 'SensorValue'];
                const csvRows = [
                  headers.join(','),
                  ...data.map(item => [
                    item.DeviceId,
                    item.Room || item.room || '',
                    item.Timestamp,
                    item.SensorType,
                    item.SensorValue
                  ].join(','))
                ];
                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.setAttribute('hidden', '');
                a.setAttribute('href', url);
                a.setAttribute('download', `sensor_data_${new Date().toISOString()}.csv`);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              disabled={data.length === 0}
              className="clay-button !px-4 !py-2 bg-gray-100 !text-gray-600 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={14} />
              ส่งออก CSV
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="clay-button !px-4 !py-2 bg-gray-100 !text-gray-600 text-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              โหลดใหม่
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6 p-1.5 bg-gray-50/50 rounded-2xl border border-gray-100/50">
          <div className="flex items-center gap-2 px-3 py-1.5 border-r border-gray-200 mr-1">
            <Clock size={14} className="text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">ช่วงเวลา:</span>
          </div>
          {timePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setTimePreset(preset.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${timePreset === preset.value
                ? 'bg-white text-blue-600 shadow-md scale-105'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100/50'
                }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">Device ID</label>
            <div className="relative group">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="เช่น gateway-one"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-gray-50 border-none shadow-inner-sm text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-blue-300 transition-all outline-none"
              />
            </div>
          </div>

          <ClaySelect
            label="ประเภทเซ็นเซอร์"
            value={sensorType}
            onChange={setSensorType}
            options={sensorTypeOptions}
            icon={Activity}
          />

          <ClaySelect
            label="ห้อง / บริเวณ"
            value={room}
            onChange={setRoom}
            options={roomOptions}
            icon={MapPin}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">วันเวลาเริ่มต้น</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setTimePreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border-none text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">วันเวลาสิ้นสุด</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setTimePreset('custom');
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 border-none text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleReset}
            className="px-6 py-2 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all"
          >
            รีเซ็ตทั้งหมด
          </button>
          <button
            onClick={fetchData}
            className="clay-button gradient-blue !px-8 !py-2 text-sm flex items-center gap-2"
          >
            ค้นหาข้อมูล
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <StatMiniCard
            title={stats.isLightData ? "สถานะการเปิดไฟ (ON Time)" : "ค่าเฉลี่ยรวม"}
            value={stats.isLightData ? `${(stats.avg * 100).toFixed(1)}%` : stats.avg.toFixed(2)}
            icon={Activity}
            color="text-blue-500"
            bg="bg-blue-50"
          />
          <StatMiniCard
            title={stats.isLightData ? "สถานะล่าสุด" : "ค่าสูงสุด (Max)"}
            value={stats.isLightData ? (data[0]?.SensorValue === 1 ? 'เปิด (ON)' : 'ปิด (OFF)') : stats.max.toFixed(2)}
            icon={TrendingUp}
            color="text-emerald-500"
            bg="bg-emerald-50"
          />
          <StatMiniCard
            title={stats.isLightData ? "สถานะต่ำสุด" : "ค่าต่ำสุด (Min)"}
            value={stats.isLightData ? (stats.min === 1 ? 'เปิด (ON)' : 'ปิด (OFF)') : stats.min.toFixed(2)}
            icon={TrendingUp}
            color="text-orange-500"
            bg="bg-orange-50"
            className={stats.isLightData ? "" : "rotate-180"}
          />
          <StatMiniCard title="จำนวนตัวอย่างข้อมูล" value={stats.count} icon={Database} color="text-purple-500" bg="bg-purple-50" />
        </div>
      )}

      <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
        <HistoryChart data={data} loading={loading} />
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <DataTable externalData={data} externalLoading={loading} />
      </div>
    </div>
  );
}

function StatMiniCard({ title, value, icon: Icon, color, bg, className = '' }) {
  return (
    <div className="clay-card !p-4 flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${bg} ${color} ${className}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}
