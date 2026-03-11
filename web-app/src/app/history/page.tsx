'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, Sidebar } from '@/components/layout/Navigation';
import { ClayCard } from '@/components/ui/ClayCard';
import { Search, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface TelemetryData {
  Id: number;
  DeviceId: string;
  SensorType: string;
  SensorValue: number;
  QualityStatus: number;
  CreatedAt: string;
}

export default function HistoryPage() {
  const [data, setData] = useState<TelemetryData[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [deviceId, setDeviceId] = useState('');
  const [sensorType, setSensorType] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(deviceId && { deviceId }),
        ...(sensorType && { sensorType }),
      });
      const response = await fetch(`/api/telemetry?${params}`);
      const result = await response.json();
      if (result.data) {
        setData(result.data);
        setTotalPages(result.pagination.totalPages);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, deviceId, sensorType]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <Sidebar />
      
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <header className="flex flex-col gap-2">
            <h1 className="text-4xl font-extrabold tracking-tight">
              Historical Data
            </h1>
            <p className="text-gray-500 font-medium">
              Browse and filter past telemetry records from the database.
            </p>
          </header>

          <ClayCard className="p-8">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-8 items-end">
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Device ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Device..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
                    value={deviceId}
                    onChange={(e) => { setDeviceId(e.target.value); setPage(1); }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-[200px] flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Sensor Type</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                  value={sensorType}
                  onChange={(e) => { setSensorType(e.target.value); setPage(1); }}
                >
                  <option value="">All Types</option>
                  <option value="Temperature">Temperature</option>
                  <option value="Humidity">Humidity</option>
                  <option value="Pressure">Pressure</option>
                </select>
              </div>
              <button 
                onClick={fetchData}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-200"
              >
                Apply Filter
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-3xl bg-gray-50/50">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Device</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">Loading records...</td></tr>
                  ) : data.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">No records found.</td></tr>
                  ) : data.map((item) => (
                    <tr key={item.Id} className="hover:bg-white transition-colors">
                      <td className="px-6 py-4 font-mono text-sm text-gray-400">{item.Id}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{item.DeviceId}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">
                          {item.SensorType}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-gray-900">{item.SensorValue.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${item.QualityStatus === 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-sm font-medium text-gray-600">{item.QualityStatus === 1 ? 'Good' : 'Bad'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(item.CreatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-8 flex items-center justify-between">
              <p className="text-sm text-gray-500 font-medium">
                Page <span className="text-gray-900 font-bold">{page}</span> of <span className="text-gray-900 font-bold">{totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </ClayCard>
        </div>
      </main>
    </div>
  );
}
