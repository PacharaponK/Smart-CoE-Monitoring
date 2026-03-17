'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Image as ImageIcon, ExternalLink, Calendar } from 'lucide-react';

export default function ImagesTab() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://aboha2uci0.execute-api.ap-southeast-1.amazonaws.com/list-images');
      if (!response.ok) {
        throw new Error('ไม่สามารถดึงข้อมูลรูปภาพได้');
      }
      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // Helper function to extract date from filename (20260313_062024.jpg)
  const formatImageDate = (url) => {
    try {
      const filename = url.split('/').pop().split('?')[0];
      const match = filename.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
      if (match) {
        const [_, year, month, day, hour, minute] = match;
        return `${day}/${month}/${year} ${hour}:${minute}`;
      }
      return 'ไม่ทราบวันที่';
    } catch (e) {
      return 'ไม่ทราบวันที่';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">รูปภาพห้องเรียน (Classroom Images)</h2>
          <p className="text-sm text-gray-400 mt-1">
            แสดงรูปภาพล่าสุดจากการตรวจวัดในห้องเรียนต่างๆ
          </p>
        </div>
        <button
          onClick={fetchImages}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl shadow-sm border border-blue-100 hover:bg-blue-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
        </button>
      </div>

      {error && (
        <div className="clay-card p-6 border-red-100 bg-red-50 text-red-600 text-center">
          <p>{error}</p>
          <button onClick={fetchImages} className="mt-2 underline font-semibold">ลองใหม่อีกครั้ง</button>
        </div>
      )}

      {!loading && !error && images.length > 0 && (
        <div className="space-y-8">
          {/* Latest Featured Image */}
          <div className="clay-card overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/30">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">รูปภาพล่าสุด</span>
              </div>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                {formatImageDate(images[0])}
              </span>
            </div>
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-gray-900">
              <img
                src={images[0]}
                alt="Latest classroom snapshot"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-6 left-6 right-6 flex justify-end">
                <a
                  href={images[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl text-blue-600 font-semibold shadow-lg hover:bg-white transition-all"
                >
                  <ExternalLink size={18} />
                  ดูรูปขนาดเต็ม
                </a>
              </div>
            </div>
            <div className="p-4 bg-white/50 backdrop-blur-sm">
              <p className="text-xs text-gray-400 truncate text-center">
                ไฟล์: {images[0].split('/').pop().split('?')[0]}
              </p>
            </div>
          </div>

          {/* Other Images Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <ImageIcon size={20} className="text-blue-500" />
              รูปภาพก่อนหน้า
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {images.slice(1).map((url, index) => (
                <div key={index + 1} className="clay-card group overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <div className="relative aspect-video overflow-hidden bg-gray-900">
                    <img
                      src={url}
                      alt={`Classroom view ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white rounded-full text-blue-600 hover:bg-blue-50 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-75"
                      >
                        <ExternalLink size={20} />
                      </a>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="text-sm font-medium">{formatImageDate(url)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {url.split('/').pop().split('?')[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="clay-card overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-200"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
