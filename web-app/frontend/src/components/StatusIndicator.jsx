'use client';

import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function StatusIndicator({ isConnected, onReconnect }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
        ${isConnected
          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          : 'bg-red-50 text-red-500 border border-red-200'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse-slow' : 'bg-red-400'
          }`} />
        {isConnected ? (
          <>
            <Wifi size={14} />
            <span>Live</span>
          </>
        ) : (
          <>
            <WifiOff size={14} />
            <span>Offline</span>
          </>
        )}
      </div>
      {!isConnected && onReconnect && (
        <button
          onClick={onReconnect}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          title="Reconnect"
        >
          <RefreshCw size={14} className="text-gray-500" />
        </button>
      )}
    </div>
  );
}
