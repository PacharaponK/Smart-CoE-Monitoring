'use client';

import { 
  Activity, Cpu, Thermometer, Wifi, AlertTriangle, CheckCircle, 
  Volume2, Lightbulb, Droplets, Sun, Radio 
} from 'lucide-react';

const iconMap = {
  activity: Activity,
  cpu: Cpu,
  thermometer: Thermometer,
  wifi: Wifi,
  alert: AlertTriangle,
  check: CheckCircle,
  'volume-2': Volume2,
  lightbulb: Lightbulb,
  droplets: Droplets,
  sun: Sun,
  radio: Radio,
};

const gradientMap = {
  blue: 'gradient-blue',
  purple: 'gradient-purple',
  teal: 'gradient-teal',
  orange: 'gradient-orange',
  pink: 'gradient-pink',
  green: 'gradient-green',
  yellow: 'gradient-yellow',
  emerald: 'gradient-emerald',
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
    <div className="clay-card animate-slide-up group border border-white/50 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1.5">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-gray-800 tracking-tighter tabular-nums leading-none">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{unit}</span>
            )}
          </div>
          {trend !== null && (
            <div className={`flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-wider ${trend >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
              <div className={`p-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                <span>{trend >= 0 ? '↑' : '↓'}</span>
              </div>
              <span>{Math.abs(trend)}%</span>
              <span className="text-gray-400 opacity-60">ชั่วโมงก่อน</span>
            </div>
          )}
          {subtitle && (
            <p className="text-[10px] font-bold text-gray-400 mt-2 italic opacity-80 truncate">{subtitle}</p>
          )}
        </div>
        <div className={`${gradientClass} p-3.5 rounded-[1.25rem] text-white shadow-xl 
          group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative overflow-hidden shrink-0`}>
          <div className="absolute inset-0 bg-white/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <Icon size={26} strokeWidth={2.5} className="relative z-10" />
          <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-white/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        </div>
      </div>
    </div>
  );
}
