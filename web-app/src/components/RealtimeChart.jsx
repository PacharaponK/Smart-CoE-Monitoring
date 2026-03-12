'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { useMqtt } from './MqttProvider';

const COLORS = ['#3b82f6', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];
const MAX_POINTS = 30;
const CHART_TIMEOUT = 15000; // Consider data stale after 15 seconds

export default function RealtimeChart({ title = 'Real-time Sensor Data', chartType = 'area' }) {
  const { messages, isConnected } = useMqtt();
  const [chartData, setChartData] = useState([]);
  const [sensorTypes, setSensorTypes] = useState(new Set());
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isDataStale, setIsDataStale] = useState(false);
  const dataRef = useRef([]);

  useEffect(() => {
    if (messages.length === 0) return;

    const latest = messages[0];
    if (!latest) return;

    const timeLabel = new Date(latest.receivedAt).toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const newPoint = {
      time: timeLabel,
      [latest.SensorType || 'value']: latest.SensorValue ?? 0,
      device: latest.DeviceId || 'unknown',
      timestamp: latest.receivedAt,
    };

    if (latest.SensorType) {
      setSensorTypes((prev) => new Set([...prev, latest.SensorType]));
    }

    dataRef.current = [...dataRef.current, newPoint].slice(-MAX_POINTS);
    setChartData([...dataRef.current]);
    setLastUpdateTime(new Date(latest.receivedAt));
    setIsDataStale(false);
  }, [messages]);

  // Check for stale data
  useEffect(() => {
    if (!lastUpdateTime) return;

    const checkStaleData = () => {
      const now = new Date();
      const timeSinceLastUpdate = now - lastUpdateTime;
      setIsDataStale(timeSinceLastUpdate > CHART_TIMEOUT);
    };

    const interval = setInterval(checkStaleData, 1000);
    return () => clearInterval(interval);
  }, [lastUpdateTime]);

  const activeTypes = Array.from(sensorTypes);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="clay-card !p-3 !rounded-xl text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span className="font-mono font-semibold">
              {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  };

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;

  return (
    <div className="clay-card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-gray-700">{title}</h3>
          {isDataStale && chartData.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              Data Stale
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {activeTypes.map((type, i) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${COLORS[i % COLORS.length]}15`,
                color: COLORS[i % COLORS.length],
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {type}
            </span>
          ))}
        </div>
      </div>

      <div className="h-72">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center rounded-2xl border border-dashed border-gray-200 text-sm text-gray-400">
            {isConnected
              ? 'Connected to backend socket, waiting for telemetry...'
              : 'Backend socket disconnected. Check backend server status.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <defs>
                {activeTypes.map((type, i) => (
                  <linearGradient key={type} id={`gradient-${type}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {activeTypes.map((type, i) =>
                chartType === 'line' ? (
                  <Line
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                ) : (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    fill={`url(#gradient-${type})`}
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                )
              )}
            </ChartComponent>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
