'use client';

import { Activity, Cpu, Thermometer, Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

const iconMap = {
  activity: Activity,
  cpu: Cpu,
  thermometer: Thermometer,
  wifi: Wifi,
  alert: AlertTriangle,
  check: CheckCircle,
};

const gradientMap = {
  blue: 'gradient-blue',
  purple: 'gradient-purple',
  teal: 'gradient-teal',
  orange: 'gradient-orange',
  pink: 'gradient-pink',
};

export default function StatCard({
  title,
  value,
  unit = '',
  icon = 'activity',
  gradient = 'blue',
  trend = null,
  subtitle = '',
}) {
  const Icon = iconMap[icon] || Activity;
  const gradientClass = gradientMap[gradient] || 'gradient-blue';

  return (
    <div className="clay-card animate-slide-up group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-gray-800 tracking-tight">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-medium text-gray-400">{unit}</span>
            )}
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
              <span>{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}%</span>
              <span className="text-gray-400 ml-1">เทียบกับชั่วโมงที่แล้ว</span>
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`${gradientClass} p-3 rounded-2xl text-white shadow-lg 
          group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
