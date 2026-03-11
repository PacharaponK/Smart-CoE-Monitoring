import Link from 'next/link';
import { Home, History, Settings, Bell } from 'lucide-react';

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md z-50 flex items-center justify-between px-8 border-b border-gray-100">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
          S
        </div>
        <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          Smart COE
        </span>
      </div>
      <div className="flex items-center gap-6">
        <button className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="w-10 h-10 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center text-blue-700 font-medium">
          JD
        </div>
      </div>
    </nav>
  );
};

export const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white/50 backdrop-blur-sm border-r border-gray-100 p-6 flex flex-col gap-2 z-40">
      <Link href="/" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 text-blue-600 font-medium transition-all group">
        <Home size={20} className="group-hover:scale-110 transition-transform" />
        <span>Dashboard</span>
      </Link>
      <Link href="/history" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-purple-50 text-gray-600 hover:text-purple-600 font-medium transition-all group">
        <History size={20} className="group-hover:scale-110 transition-transform" />
        <span>Historical Data</span>
      </Link>
      <Link href="/settings" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-teal-50 text-gray-600 hover:text-teal-600 font-medium transition-all group">
        <Settings size={20} className="group-hover:scale-110 transition-transform" />
        <span>Settings</span>
      </Link>
    </aside>
  );
};
