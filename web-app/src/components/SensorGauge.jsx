'use client';

export default function SensorGauge({ value = 0, max = 100, label = '', color = '#3b82f6', size = 140 }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const safeValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const safeMax = Number.isFinite(Number(max)) && Number(max) > 0 ? Number(max) : 1;
  const percentage = Math.min(Math.max(safeValue / safeMax, 0), 1);
  const strokeDashoffset = circumference * (1 - percentage);

  const getStatusColor = () => {
    if (percentage >= 0.8) return '#ef4444';
    if (percentage >= 0.6) return '#f97316';
    return color;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          style={{ width: size, height: size }}
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getStatusColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="animate-gauge transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {safeValue.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400 font-medium">/ {safeMax}</span>
        </div>
      </div>
      {label && (
        <span className="text-sm font-medium text-gray-600">{label}</span>
      )}
    </div>
  );
}
