'use client';

import { useState } from 'react';
import {
  LayoutDashboard, Database, Settings, ChevronLeft, ChevronRight,
  Radio, Activity, Bell, HelpCircle,
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'devices', label: 'อุปกรณ์', icon: Radio },
  { id: 'data', label: 'ข้อมูลย้อนหลัง', icon: Database },
  { id: 'alerts', label: 'การแจ้งเตือน', icon: Bell },
];

const bottomItems = [
  { id: 'help', label: 'ความช่วยเหลือ', icon: HelpCircle },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, collapsed, setCollapsed }) {
  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-white z-30 flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-64'
        }`}
      style={{
        boxShadow: '8px 0 24px #d1d1d9',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
        <img 
          src="/images/coe-icon.jpg" 
          alt="Smart CoE Logo" 
          className="w-10 h-10 rounded-2xl flex-shrink-0 object-cover"
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-sm font-bold text-gray-800 whitespace-nowrap">Smart CoE</h1>
            <p className="text-xs text-gray-400 whitespace-nowrap">ระบบตรวจวัด IoT</p>
          </div>
        )}
      </div>

      {/* Main Menu */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-blue-50 text-blue-600 font-semibold shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Menu */}
      <div className="py-4 px-3 border-t border-gray-100 space-y-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 
                hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-7 -right-3 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 
          flex items-center justify-center hover:bg-gray-50 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}