'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, Download, RefreshCw, Activity, MapPin } from 'lucide-react';
import ClaySelect from './ClaySelect';

export default function DataTable({ externalData = null, externalLoading = false, initialRoom = '' }) {
  const isControlled = externalData !== null;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [internalData, setInternalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastKey, setLastKey] = useState(null);
  const [pageKeys, setPageKeys] = useState([null]); // stack of keys for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters (only used if not controlled)
  const [deviceId, setDeviceId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [room, setRoom] = useState(initialRoom);
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Sync initialRoom prop to internal state if not controlled
  useEffect(() => {
    if (!isControlled && initialRoom !== undefined) {
      setRoom(initialRoom);
      setCurrentPage(0);
      setPageKeys([null]);
    }
  }, [initialRoom, isControlled]);

  const data = isControlled ? externalData : internalData;
  const isLoading = isControlled ? externalLoading : loading;

  const fetchData = useCallback(async (exclusiveStartKey = null) => {
    if (isControlled) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (deviceId) params.set('deviceId', deviceId);
      if (sensorType) params.set('sensorType', sensorType);
      if (room) params.set('room', room);
      params.set('limit', String(limit));
      if (exclusiveStartKey) {
        params.set('lastKey', typeof exclusiveStartKey === 'string' ? exclusiveStartKey : JSON.stringify(exclusiveStartKey));
      }

      const baseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const url = new URL(`${baseUrl}/api/sensor-data`);
      
      if (deviceId) url.searchParams.set('deviceId', deviceId);
      if (sensorType) url.searchParams.set('sensorType', sensorType);
      if (room) url.searchParams.set('room', room);
      url.searchParams.set('limit', String(limit));
      
      if (exclusiveStartKey) {
        const keyStr = typeof exclusiveStartKey === 'string' ? exclusiveStartKey : JSON.stringify(exclusiveStartKey);
        url.searchParams.set('lastKey', keyStr);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch data');

      const result = await res.json();
      setInternalData(result.items || []);
      setLastKey(result.lastKey);
      setTotalCount(result.count || 0);
    } catch (err) {
      setError(err.message);
      setInternalData([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, deviceId, sensorType, room, limit, isControlled]);

  useEffect(() => {
    if (!isControlled) {
      fetchData();
    }
  }, [fetchData, isControlled]);

  const handleNextPage = () => {
    if (!lastKey) return;
    const newPageKeys = [...pageKeys, lastKey];
    setPageKeys(newPageKeys);
    setCurrentPage(currentPage + 1);
    fetchData(lastKey);
  };

  const handlePrevPage = () => {
    if (currentPage <= 0) return;
    const newPage = currentPage - 1;
    setCurrentPage(newPage);
    fetchData(pageKeys[newPage]);
  };

  const handleFilter = () => {
    setCurrentPage(0);
    setPageKeys([null]);
    fetchData();
  };

  const handleReset = () => {
    setDeviceId('');
    setSensorType('');
    setRoom('');
    setCurrentPage(0);
    setPageKeys([null]);
  };

  const sensorTypeOptions = [
    { label: 'ทุกประเภท (All Types)', value: '' },
    { label: 'Temperature (อุณหภูมิ)', value: 'temperature' },
    { label: 'Humidity (ความชื้น)', value: 'humidity' },
    { label: 'Sound (ระดับเสียง)', value: 'sound' },
    { label: 'Light (ความสว่าง)', value: 'light' },
    { label: 'Motion (การเคลื่อนไหว)', value: 'motion' },
  ];

  const roomOptions = [
    { label: 'ทุกห้อง (All Rooms)', value: '' },
    { label: 'R200', value: 'R200' },
    { label: 'R201', value: 'R201' },
    { label: 'R302', value: 'R302' },
    { label: 'Co_Ai', value: 'Co_Ai' },
    { label: 'AIE', value: 'AIE' },
    { label: 'NETWORK', value: 'NETWORK' },
  ];

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="clay-card animate-fade-in">
      {/* ส่วนหัว (Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
            <Activity size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-700">
            {isControlled ? 'ตารางข้อมูลรายการ' : 'ประวัติข้อมูล Telemetry'}
          </h3>
        </div>
        {!isControlled && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`clay-button !px-4 !py-2 text-sm flex items-center gap-2 transition-all duration-300 ${showFilters ? 'gradient-purple scale-105' : 'bg-gray-100 !text-gray-600'
                }`}
            >
              <Filter size={14} />
              {showFilters ? 'ซ่อนตัวกรอง' : 'แสดงตัวกรอง'}
            </button>
            <button
              onClick={() => fetchData(pageKeys[currentPage])}
              className="clay-button !px-4 !py-2 bg-gray-100 !text-gray-600 text-sm flex items-center gap-2"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              รีเฟรช
            </button>
          </div>
        )}
      </div>

      {/* แผงตัวกรอง (Filters Panel) - Hide if controlled */}
      {!isControlled && showFilters && (
        <div className="clay-card-inset mb-6 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1 uppercase tracking-wider">Device ID</label>
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="เช่น gateway-one"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border-none shadow-sm text-sm font-semibold text-gray-700
                    focus:ring-2 focus:ring-blue-300 transition-all outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
            
            <ClaySelect
              label="Sensor Type (ประเภทเซ็นเซอร์)"
              value={sensorType}
              onChange={setSensorType}
              options={sensorTypeOptions}
              icon={Activity}
            />

            <ClaySelect
              label="Room (ห้อง)"
              value={room}
              onChange={setRoom}
              options={roomOptions}
              icon={MapPin}
            />

            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                className="clay-button gradient-blue text-sm flex-1 h-[42px] flex items-center justify-center gap-2"
              >
                <Filter size={14} />
                นำไปใช้
              </button>
              <button
                onClick={handleReset}
                className="clay-button bg-gray-200 !text-gray-600 text-sm h-[42px] flex items-center justify-center px-4"
              >
                รีเซ็ต
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ข้อความแจ้งเตือนเมื่อเกิดข้อผิดพลาด */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ตารางข้อมูล (Table) */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Device ID
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Room
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Timestamp
              </th>
              <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Sensor Type
              </th>
              <th className="text-right py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <Database size={32} className="mx-auto mb-2 opacity-40" />
                  ไม่พบข้อมูล
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr
                  key={`${item.DeviceId}-${item.Timestamp}-${idx}`}
                  className="hover:bg-blue-50/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="font-medium text-gray-700">{item.DeviceId}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-medium capitalize">
                      {item.Room || item.room || item.DeviceId || 'ไม่ระบุ'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    {formatTimestamp(item.Timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium">
                      {item.SensorType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                    {item.SensorType === 'light'
                      ? (item.SensorValue === 1 ? 'ON' : 'OFF')
                      : (typeof item.SensorValue === 'number'
                        ? item.SensorValue.toFixed(2)
                        : item.SensorValue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ส่วนควบคุมหน้า (Pagination) */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          หน้า {currentPage + 1} · แสดง {data.length} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="clay-button !px-3 !py-1.5 bg-gray-100 !text-gray-600 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            ก่อนหน้า
          </button>
          <button
            onClick={handleNextPage}
            disabled={!lastKey}
            className="clay-button !px-3 !py-1.5 bg-gray-100 !text-gray-600 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            ถัดไป
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Database({ size, className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}
