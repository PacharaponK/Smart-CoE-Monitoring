'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Filter, Download, RefreshCw } from 'lucide-react';

export default function DataTable() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastKey, setLastKey] = useState(null);
  const [pageKeys, setPageKeys] = useState([null]); // stack of keys for pagination
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [deviceId, setDeviceId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [limit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async (exclusiveStartKey = null) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (deviceId) params.set('deviceId', deviceId);
      if (sensorType) params.set('sensorType', sensorType);
      params.set('limit', String(limit));
      if (exclusiveStartKey) {
        params.set('lastKey', JSON.stringify(exclusiveStartKey));
      }

      const res = await fetch(`${backendUrl}/api/sensor-data?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data');

      const result = await res.json();
      setData(result.items);
      setLastKey(result.lastKey);
      setTotalCount(result.count);
    } catch (err) {
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, deviceId, sensorType, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
    setCurrentPage(0);
    setPageKeys([null]);
  };

  const getQualityBadge = (status) => {
    if (status === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          ปกติ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500 border border-red-200">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
        ผิดปกติ
      </span>
    );
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-bold text-gray-700">Historical Sensor Data</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`clay-button !px-3 !py-2 text-sm flex items-center gap-2 ${showFilters ? 'gradient-purple' : 'bg-gray-100 !text-gray-600'
              }`}
          >
            <Filter size={14} />
            Filters
          </button>
          <button
            onClick={() => fetchData(pageKeys[currentPage])}
            className="clay-button !px-3 !py-2 bg-gray-100 !text-gray-600 text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="clay-card-inset mb-4 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Device ID</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="e.g., gateway-one"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-gray-200 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Sensor Type</label>
              <select
                value={sensorType}
                onChange={(e) => setSensorType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent transition"
              >
                <option value="">All Types</option>
                <option value="temperature">Temperature</option>
                <option value="humidity">Humidity</option>
                <option value="pressure">Pressure</option>
                <option value="light">Light</option>
                <option value="motion">Motion</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleFilter}
                className="clay-button gradient-blue text-sm flex-1"
              >
                Apply
              </button>
              <button
                onClick={handleReset}
                className="clay-button bg-gray-200 !text-gray-600 text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Device ID
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
              <th className="text-center py-3 px-4 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                Quality
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400">
                  <Database size={32} className="mx-auto mb-2 opacity-40" />
                  No data found
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
                  <td className="py-3 px-4 text-gray-500 font-mono text-xs">
                    {formatTimestamp(item.Timestamp)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium">
                      {item.SensorType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-gray-800">
                    {typeof item.SensorValue === 'number'
                      ? item.SensorValue.toFixed(2)
                      : item.SensorValue}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getQualityBadge(item.QualityStatus)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Page {currentPage + 1} · {data.length} items shown
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className="clay-button !px-3 !py-1.5 bg-gray-100 !text-gray-600 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft size={14} />
            Prev
          </button>
          <button
            onClick={handleNextPage}
            disabled={!lastKey}
            className="clay-button !px-3 !py-1.5 bg-gray-100 !text-gray-600 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Next
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
