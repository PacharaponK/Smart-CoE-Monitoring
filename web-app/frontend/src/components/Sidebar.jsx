'use client';

import {
  LayoutDashboard, Database, Settings, ChevronLeft, ChevronRight,
  Radio, Activity, Bell, HelpCircle, Image as ImageIcon, Zap
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'data', label: 'ข้อมูลย้อนหลัง', icon: Database },
  { id: 'energy-cost', label: 'พลังงานและค่าไฟ', icon: Zap },
  { id: 'images', label: 'รูปภาพห้องเรียน', icon: ImageIcon },
];

const bottomItems = [
  { id: 'help', label: 'ความช่วยเหลือ', icon: HelpCircle },
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange, collapsed, setCollapsed }) {
  const sidebarWidthClass = collapsed ? 'w-[72px]' : 'w-[72px] sm:w-64';

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 bg-white z-30 flex flex-col overflow-hidden transition-all duration-300 ease-in-out ${sidebarWidthClass}`}
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
          <div className="hidden sm:block overflow-hidden">
            <h1 className="text-sm font-bold text-gray-800 whitespace-nowrap">Smart CoE</h1>
            <p className="text-xs text-gray-400 whitespace-nowrap">ระบบตรวจวัด IoT</p>
          </div>
        )}
      </div>

      {/* Main Menu */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-4 px-3 space-y-1">
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
                <span className="hidden sm:inline text-sm whitespace-nowrap">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="hidden sm:block ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
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
                <span className="hidden sm:inline text-sm whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden sm:flex absolute top-7 -right-3 w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 
          items-center justify-center hover:bg-gray-50 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}