'use client';

import { 
  HelpCircle, BookOpen, Monitor, Database, Zap, 
  Info, Activity, Mail, CheckCircle2, AlertCircle,
  Thermometer, Droplets, Volume2, Lightbulb
} from 'lucide-react';

export default function HelpTab() {
  const sections = [
    {
      title: "หน้าแดชบอร์ด",
      icon: <Monitor className="text-blue-500" />,
      content: "แสดงสถานะปัจจุบันของทุกห้องแบบเรียลไทม์ คุณสามารถดูอุณหภูมิ, ความชื้น, ระดับเสียง และสถานะไฟได้ทันที พร้อมกราฟแสดงแนวโน้มใน 24 ชั่วโมงล่าสุด"
    },
    {
      title: "ข้อมูลย้อนหลัง",
      icon: <Database className="text-purple-500" />,
      content: "เลือกดูข้อมูลย้อนหลังตามช่วงเวลาที่ต้องการ โดยสามารถเลือกเฉพาะห้องหรือประเภทเซ็นเซอร์ที่สนใจ เพื่อนำไปวิเคราะห์หรือตรวจสอบเหตุการณ์ย้อนหลัง"
    },
    {
      title: "พลังงานและค่าไฟ",
      icon: <Zap className="text-amber-500" />,
      content: "ระบบจะประมาณการการใช้ไฟฟ้าจากสถานะการเปิด-ปิดไฟในแต่ละห้อง และคำนวณเป็นค่าใช้จ่ายตามอัตราค่าไฟฟ้าฐานและค่า Ft ของการไฟฟ้า (MEA/PEA)"
    }
  ];

  const sensors = [
    { name: "อุณหภูมิ", unit: "°C", icon: <Thermometer size={18} />, desc: "แสดงความร้อนภายในห้อง" },
    { name: "ความชื้น", unit: "%", icon: <Droplets size={18} />, desc: "แสดงปริมาณไอน้ำในอากาศ" },
    { name: "ระดับเสียง", unit: "dB", icon: <Volume2 size={18} />, desc: "แสดงความดังของเสียงในห้อง" },
    { name: "แสงสว่าง", unit: "ON/OFF", icon: <Lightbulb size={18} />, desc: "แสดงสถานะการเปิด-ปิดไฟ" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-200">
          <HelpCircle size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">ศูนย์ความช่วยเหลือ</h2>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            เรียนรู้การใช้งานระบบ Smart CoE Monitoring เบื้องต้น
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Usage Guide */}
          <div className="clay-card !p-8">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
              <BookOpen className="text-blue-500" size={20} />
              <h3 className="text-lg font-bold text-gray-700">คำแนะนำการใช้งาน</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {sections.map((section, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-blue-50">
                  <div className="shrink-0 p-3 bg-white rounded-xl shadow-sm h-fit">
                    {section.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 mb-1">{section.title}</h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{section.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensor Guide */}
          <div className="clay-card !p-8">
            <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
              <Activity className="text-emerald-500" size={20} />
              <h3 className="text-lg font-bold text-gray-700">ความหมายของข้อมูลเซ็นเซอร์</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sensors.map((s, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-emerald-50/30 border border-emerald-100/50">
                  <div className="p-2 bg-white text-emerald-500 rounded-lg shadow-sm">
                    {s.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">{s.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-600 rounded-md font-black">{s.unit}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* System Status Info */}
          <div className="clay-card !p-6 bg-gradient-to-br from-blue-500 to-indigo-600 !text-white">
            <div className="flex items-center gap-2 mb-4">
              <Info size={20} />
              <h3 className="font-bold">ข้อมูลระบบ</h3>
            </div>
            <div className="space-y-4 text-sm opacity-90">
              <div className="flex gap-3">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p>ข้อมูลอัปเดตทุก 10 วินาที ผ่านระบบ MQTT</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <p>รองรับการเข้าถึงจากมือถือและแท็บเล็ต</p>
              </div>
              <div className="flex gap-3">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>การคำนวณค่าไฟเป็นเพียงการประมาณการเบื้องต้น</p>
              </div>
            </div>
          </div>

          {/* Contact Support */}
          <div className="clay-card !p-6 border-2 border-dashed border-gray-200 shadow-none bg-transparent hover:border-blue-300 transition-colors group">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                <Mail size={24} className="text-gray-400 group-hover:text-blue-500" />
              </div>
              <h3 className="font-bold text-gray-700 mb-2">แจ้งปัญหาการใช้งาน</h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                หากพบปัญหาในการใช้งานหรือเซ็นเซอร์ขัดข้อง สามารถติดต่อได้ที่ภาควิชาวิศวกรรมคอมพิวเตอร์
              </p>
              <a 
                href="mailto:support@coe.psu.ac.th"
                className="inline-block w-full py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
              >
                ติดต่อผู้ดูแลระบบ
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
