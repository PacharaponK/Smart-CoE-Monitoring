'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Zap, Search, Calendar, RefreshCw, AlertCircle, 
  TrendingUp, DollarSign, Activity, ChevronRight,
  Info, BarChart3, Settings2, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, AreaChart, Area
} from 'recharts';
import ClaySelect from '../ClaySelect';
import { processEnergyData } from '@/lib/energy-utils';

export default function EnergyCostTab() {
  // Filters & State
  const [deviceId, setDeviceId] = useState('R200');
  const [mode, setMode] = useState('monthly'); // 'monthly', 'custom'
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  
  // Tariff settings
  const [ftRate, setFtRate] = useState(0.3972);
  const [serviceCharge, setServiceCharge] = useState(38.22);
  
  // Data state
  const [allRawItems, setAllRawItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set default dates on mount and when mode changes
  useEffect(() => {
    if (mode === 'monthly') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const formatDate = (date) => {
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
      };

      setStartTime(formatDate(firstDay));
      setEndTime(formatDate(now));
    }
  }, [mode]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 
        (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : '');
      const baseUrl = backendUrl ? (backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl) : '';
      
      const endpoint = `${baseUrl}/api/sensor-data`;
      const url = new URL(endpoint);
      url.searchParams.set('limit', '2000');

      console.log("[EnergyTab] Fetching from:", url.toString());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('ไม่สามารถดึงข้อมูลเซ็นเซอร์ได้');

      const result = await res.json();
      console.log(`[EnergyTab] Received ${result.items?.length || 0} items`);
      setAllRawItems(result.items || []);
    } catch (err) {
      console.error("[EnergyTab] Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Compute results locally whenever raw items or filters change
  const data = useMemo(() => {
    if (!allRawItems || allRawItems.length === 0) {
      return null;
    }
    if (!startTime || !endTime) return null;
    
    const processed = processEnergyData(allRawItems, {
      deviceId,
      startTime,
      endTime,
      ftRate,
      serviceCharge
    });
    
    // Check if there is any actual kWh data to justify showing the cards
    if (processed?.summary?.totalKWh === 0 && (!processed?.dailySeries || processed.dailySeries.every(d => d.kWh === 0))) {
        return null;
    }

    return processed;
  }, [allRawItems, deviceId, startTime, endTime, ftRate, serviceCharge]);

  const deviceOptions = [
    { label: 'R200 (ห้อง 200)', value: 'R200' },
    { label: 'R201 (ห้อง 201)', value: 'R201' },
    { label: 'R303 (ห้อง 303)', value: 'R303' },
    { label: 'Co_Ai (ห้อง Co-Ai)', value: 'Co_Ai' },
  ];

  const modeOptions = [
    { label: 'รายเดือน (ปัจจุบัน)', value: 'monthly' },
    { label: 'กำหนดเอง (Custom Range)', value: 'custom' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="clay-card !p-3 !rounded-xl text-sm shadow-xl border-none">
        <p className="font-bold text-gray-700 mb-2 border-b pb-1">วันที่ {label}</p>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-6 py-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-gray-600 font-medium">{entry.name}:</span>
            </div>
            <span className="font-mono font-bold text-gray-900">
              {entry.value.toFixed(2)} {entry.name === 'หน่วยไฟ (kWh)' ? 'หน่วย' : 'บาท'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">
            พลังงานและค่าไฟ
          </h2>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            การวิเคราะห์การใช้พลังงานไฟฟ้าและการคำนวณค่าไฟฟ้าประมาณการตามอัตรา MEA/PEA
          </p>
        </div>
        <div className="flex items-center gap-2">
           <button
            onClick={fetchAllData}
            disabled={loading}
            className="clay-button !px-4 !py-2 bg-gray-100 !text-gray-600 text-sm flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            โหลดข้อมูลใหม่
          </button>
        </div>
      </div>

      {/* Filters & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <div className="clay-card !p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-1.5">
              <Calendar size={18} className="text-blue-500" />
              <h3 className="text-base font-bold text-gray-700">ตัวเลือกการแสดงผล</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 flex-grow content-start mt-2">
              <ClaySelect
                label="อุปกรณ์"
                value={deviceId}
                onChange={setDeviceId}
                options={deviceOptions}
                icon={Zap}
              />
              
              <ClaySelect
                label="โหมดเวลา"
                value={mode}
                onChange={setMode}
                options={modeOptions}
                icon={Calendar}
              />

              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">เริ่มต้น</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-none shadow-inner-sm text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">สิ้นสุด</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-none shadow-inner-sm text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="clay-card !p-5 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-1.5">
              <Settings2 size={18} className="text-purple-500" />
              <h3 className="text-base font-bold text-gray-700">ตั้งค่าอัตรา</h3>
            </div>
            
            <div className="space-y-3 flex-grow content-start mt-2">
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">ค่า Ft (บาท/หน่วย)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={ftRate}
                  onChange={(e) => setFtRate(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-none shadow-inner-sm text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 mb-1 ml-1 uppercase tracking-widest">ค่าบริการ (บาท/เดือน)</label>
                <input
                  type="number"
                  step="0.01"
                  value={serviceCharge}
                  onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-none shadow-inner-sm text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {data?.warnings?.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-amber-800 font-bold text-sm">ข้อควรระวัง</p>
            <ul className="text-amber-700 text-xs mt-1 list-disc list-inside">
              {data.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Stats - 1 Row 3 Columns */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch animate-in slide-in-from-bottom-4 duration-500">
          {/* Energy Total */}
          <div className="clay-card !p-6 gradient-blue !text-white flex flex-col justify-between min-h-[140px] h-full shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <Zap size={28} />
              </div>
              <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-full backdrop-blur-md uppercase tracking-widest">Energy Total</span>
            </div>
            <div>
              <p className="text-sm font-bold opacity-80 mb-1">พลังงานรวมที่ใช้</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black">{(data.summary?.totalKWh ?? 0).toLocaleString()}</h4>
                <span className="text-lg font-bold opacity-80 uppercase tracking-widest">kWh</span>
              </div>
            </div>
          </div>

          {/* Base Rate */}
          <div className="clay-card !p-6 bg-white border-l-8 border-l-emerald-500 flex flex-col justify-between min-h-[140px] h-full shadow-md">
             <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                <DollarSign size={28} />
              </div>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">Base Rate</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 mb-1">ค่าไฟฟ้าฐาน</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black text-gray-800">{(data.summary?.baseCharge ?? 0).toLocaleString()}</h4>
                <span className="text-lg font-bold text-gray-400">บาท</span>
              </div>
            </div>
          </div>

          {/* Ft Adjustment */}
          <div className="clay-card !p-6 bg-white border-l-8 border-l-orange-500 flex flex-col justify-between min-h-[140px] h-full shadow-md">
             <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-orange-50 rounded-xl text-orange-500">
                <Activity size={28} />
              </div>
              <span className="text-[10px] font-black text-orange-500 bg-orange-50 px-2 py-1 rounded-full uppercase tracking-widest">Ft Adjustment</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 mb-1">ค่า Ft รวม</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-4xl font-black text-gray-800">{(data.summary?.ftCharge ?? 0).toLocaleString()}</h4>
                <span className="text-lg font-bold text-gray-400">บาท</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts & Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        <div className="xl:col-span-2">
          <div className="clay-card !p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-2xl text-blue-500">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">กราฟการใช้พลังงาน</h3>
                  <p className="text-xs text-gray-400 font-medium">เปรียบเทียบหน่วยไฟและค่าใช้จ่ายรายวัน</p>
                </div>
              </div>
            </div>
            
            <div className="h-[400px] flex-grow">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm font-medium">กำลังประมวลผล...</p>
                </div>
              ) : data?.dailySeries?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.dailySeries} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px' }} />
                    <Bar yAxisId="left" dataKey="kWh" name="หน่วยไฟ (kWh)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="cost" name="ค่าไฟ (บาท)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl">
                  <Activity size={48} className="mb-4 opacity-10" />
                  <p className="text-sm font-medium">ไม่พบข้อมูลพลังงานในช่วงเวลาที่เลือก</p>
                  <p className="text-xs mt-1 opacity-60 italic">ลองเปลี่ยนช่วงเวลาหรือตรวจสอบอุปกรณ์ที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="clay-card !p-6 h-full flex flex-col">
             <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-500">
                <Info size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-700">รายละเอียดบิลประมาณการ</h3>
            </div>

            {data ? (
              <div className="space-y-4 flex-grow flex flex-col">
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-500">ค่าไฟฟ้าฐาน</span>
                  <span className="text-sm font-bold text-gray-800">{(data.summary?.baseCharge ?? 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-500">ค่า Ft ({ftRate})</span>
                  <span className="text-sm font-bold text-gray-800">{(data.summary?.ftCharge ?? 0).toLocaleString()} บาท</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-500">ค่าบริการรายเดือน</span>
                  <span className="text-sm font-bold text-gray-800">{(data.summary?.serviceCharge ?? 0).toLocaleString()} บาท</span>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-700">ยอดรวมก่อนภาษี</span>
                    <span className="text-sm font-black text-gray-900">
                      {((data.summary?.baseCharge ?? 0) + (data.summary?.ftCharge ?? 0) + (data.summary?.serviceCharge ?? 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-sm font-medium text-gray-500">ภาษีมูลค่าเพิ่ม (7%)</span>
                  <span className="text-sm font-bold text-gray-800">{(data.summary?.vatAmount ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท</span>
                </div>
                <div className="pt-2 mt-auto">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-blue-600">รวมทั้งสิ้น</span>
                    <span className="text-2xl font-black text-blue-600">
                      {(data.summary?.totalBill ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} บาท
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-2xl text-[10px] text-blue-600 font-medium leading-relaxed">
                  <p className="font-bold mb-1 uppercase tracking-wider">สูตรการคำนวณ:</p>
                  <p>ค่าไฟรวม = (ค่าไฟฐาน + Ft + ค่าบริการ) + VAT 7%</p>
                  <p className="mt-2 opacity-70">* ข้อมูลนี้เป็นเพียงการประมาณการเบื้องต้นเท่านั้น ตัวเลขจริงอาจมีความคลาดเคลื่อนขึ้นอยู่กับการคิดแบบขั้นบันไดและค่าธรรมเนียมอื่นของการไฟฟ้า</p>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center py-10 opacity-40">
                <Search size={40} className="mb-2 text-gray-300" />
                <p className="text-sm text-gray-400 font-medium">ไม่มีข้อมูลสรุปบิล</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
