'use client';

import { Activity, Zap } from 'lucide-react';

export default function HeroSection() {
  return (
    <div className="overflow-hidden group pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-center">
        {/* ภาพอาคาร */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-[2rem]">
          <img 
            src="/images/coe-building.png" 
            alt="ตึกวิศวกรรมคอมพิวเตอร์ - มหาวิทยาลัยสงขลานครินทร์" 
            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-700 ease-in-out"
          />
        </div>
        
        {/* รายละเอียด - แผงข้อมูลแบบรวมศูนย์ */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <div className="w-8 h-[2px] bg-blue-600 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">PSU Engineering</span>
            </div>
            <h4 className="text-4xl font-black text-gray-800 leading-[1.1] tracking-tight">
              ตึกวิศวกรรม <br/>คอมพิวเตอร์ <br/>(CoE Building)
            </h4>
            <p className="text-gray-500 text-sm leading-relaxed font-medium max-w-sm">
              ศูนย์กลางการเรียนการสอนและวิจัยนวัตกรรมด้านวิศวกรรมคอมพิวเตอร์ มหาวิทยาลัยสงขลานครินทร์ 
              ขับเคลื่อนด้วยระบบอัจฉริยะ IoT ตลอด 24 ชั่วโมง เพื่อประสิทธิภาพสูงสุดในการใช้งานอาคาร
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover/item:bg-blue-500 group-hover/item:text-white transition-all duration-300">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Analytics</p>
                <p className="text-xs font-bold text-gray-700 uppercase">ข้อมูลสภาพแวดล้อมแบบ Real-time</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 group/item">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all duration-300">
                <Zap size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Efficiency</p>
                <p className="text-xs font-bold text-gray-700 uppercase">การจัดการพลังงานอัจฉริยะ</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
