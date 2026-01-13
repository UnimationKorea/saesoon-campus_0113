
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calendar, 
  LayoutDashboard, 
  MapPin, 
  Users, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Info,
  ChevronRight,
  PlusCircle,
  Menu,
  X,
  Send,
  Loader2,
  User,
  Type as TypeIcon,
  CalendarDays,
  Timer,
  AlertCircle,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  Bell,
  BellDot,
  Trash2,
  ChevronLeft,
  List,
  Megaphone,
  Lock,
  Plus,
  Settings as SettingsIcon,
  Mail,
  ToggleLeft,
  ToggleRight,
  Save
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types & Data ---

interface Space {
  id: string;
  name: string;
  description: string;
  capacity: number;
  facilities: string[];
  imageUrl: string;
  category: 'hall' | 'room' | 'cafe' | 'studio';
}

interface Reservation {
  id: string;
  spaceId: string;
  userName: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
  isRead?: boolean;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  date: string;
  isImportant: boolean;
}

interface UserSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const SPACES: Space[] = [
  {
    id: 'ieum-hall',
    name: '이음홀 (대강당)',
    description: '공연, 예배, 대규모 세미나가 가능한 다목적 홀입니다.',
    capacity: 200,
    facilities: ['고급 음향', '4K 빔프로젝터', '무대 조명', '피아노'],
    category: 'hall',
    imageUrl: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'nuri-room',
    name: '누리룸 (세미나실)',
    description: '집중도 높은 회의나 교육을 위한 공간입니다.',
    capacity: 20,
    facilities: ['전자칠판', '초고속 와이파이', '냉난방기'],
    category: 'room',
    imageUrl: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'share-cafe',
    name: '공유 카페 이음',
    description: '편안한 분위기에서 담소를 나누거나 개인 작업을 할 수 있는 공간입니다.',
    capacity: 40,
    facilities: ['커피머신', '바 테이블', '야외 테라스 연결'],
    category: 'cafe',
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'creators-studio',
    name: '크리에이터 스튜디오',
    description: '유튜브 촬영, 팟캐스트 녹음이 가능한 전문 스튜디오입니다.',
    capacity: 5,
    facilities: ['콘덴서 마이크', '크로마키 배경', '편집용 PC'],
    category: 'studio',
    imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800'
  }
];

// --- Helpers ---
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// --- Storage Service ---
const StorageService = {
  getReservations: (): Reservation[] => {
    const data = localStorage.getItem('ieumnuri_reservations');
    return data ? JSON.parse(data) : [];
  },
  saveReservation: (res: Reservation) => {
    const all = StorageService.getReservations();
    all.push({ ...res, isRead: true });
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(all));
  },
  updateStatus: (id: string, status: Reservation['status']) => {
    const all = StorageService.getReservations();
    const updated = all.map(r => r.id === id ? { ...r, status, isRead: false } : r);
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(updated));
  },
  markAsRead: (id: string) => {
    const all = StorageService.getReservations();
    const updated = all.map(r => r.id === id ? { ...r, isRead: true } : r);
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(updated));
  },
  markAllAsRead: () => {
    const all = StorageService.getReservations();
    const updated = all.map(r => ({ ...r, isRead: true }));
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(updated));
  },
  getNotices: (): Notice[] => {
    const data = localStorage.getItem('ieumnuri_notices');
    return data ? JSON.parse(data) : [
      { id: '1', title: '이음누리 캠퍼스 정식 오픈 안내', content: '지역 사회와 함께하는 공간으로 새롭게 문을 열었습니다.', date: '2024-03-20', isImportant: true }
    ];
  },
  saveNotice: (notice: Notice) => {
    const all = StorageService.getNotices();
    all.unshift(notice);
    localStorage.setItem('ieumnuri_notices', JSON.stringify(all));
  },
  deleteNotice: (id: string) => {
    const all = StorageService.getNotices();
    const filtered = all.filter(n => n.id !== id);
    localStorage.setItem('ieumnuri_notices', JSON.stringify(filtered));
  },
  getSettings: (): UserSettings => {
    const data = localStorage.getItem('ieumnuri_settings');
    return data ? JSON.parse(data) : { emailNotifications: true, inAppNotifications: true };
  },
  saveSettings: (settings: UserSettings) => {
    localStorage.setItem('ieumnuri_settings', JSON.stringify(settings));
  }
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, unreadCount }: { activeTab: string, setActiveTab: (t: string) => void, unreadCount: number }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'spaces', label: '공간 둘러보기', icon: MapPin },
    { id: 'reservations', label: '예약 내역', icon: Calendar, badge: unreadCount },
    { id: 'ai-chat', label: 'AI 매니저', icon: MessageSquare },
    { id: 'settings', label: '설정', icon: SettingsIcon },
    { id: 'admin', label: '관리자', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-campus-green text-white h-screen fixed left-0 top-0 p-6 hidden md:block">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight italic">이음누리</h1>
        <p className="text-xs text-green-200 mt-1">CAMPUS RESERVATION</p>
      </div>
      <nav className="space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
              activeTab === item.id ? 'bg-white/20 shadow-inner' : 'hover:bg-white/10'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </div>
            {item.badge && item.badge > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="absolute bottom-10 left-6 right-6 p-4 rounded-xl bg-green-800/50 border border-green-700">
        <p className="text-xs opacity-80">이음누리는 지역 사회와 함께합니다. 문의: 02-1234-5678</p>
      </div>
    </aside>
  );
};

const CalendarView = ({ reservations }: { reservations: Reservation[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const confirmedReservations = useMemo(() => reservations.filter(r => r.status === 'confirmed'), [reservations]);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < firstDayOfMonth; i++) arr.push(null);
    for (let i = 1; i <= daysInMonth; i++) arr.push(i);
    return arr;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  const changeMonth = (offset: number) => setCurrentDate(new Date(year, month + offset, 1));

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
      <div className="p-8 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-2xl font-bold text-gray-800">{year}년 {month + 1}월</h3>
        <div className="flex items-center space-x-2">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><ChevronLeft size={24} /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-sm font-bold text-campus-green hover:bg-green-50 rounded-xl transition-all">오늘</button>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><ChevronRight size={24} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['일', '월', '화', '수', '목', '금', '토'].map(d => (
          <div key={d} className={`py-4 text-center text-xs font-bold uppercase tracking-widest ${d === '일' ? 'text-red-400' : d === '토' ? 'text-blue-400' : 'text-gray-400'}`}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-32 border-b border-r border-gray-50 bg-gray-50/30" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayRes = confirmedReservations.filter(r => r.date === dateStr);
          const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
          return (
            <div key={day} className="h-40 border-b border-r border-gray-100 p-3 hover:bg-gray-50 transition-colors group">
              <span className={`text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center ${isToday ? 'bg-campus-green text-white shadow-md' : 'text-gray-400 group-hover:text-gray-800'}`}>{day}</span>
              <div className="space-y-1 overflow-y-auto max-h-24 mt-2">
                {dayRes.map(res => {
                  const space = SPACES.find(s => s.id === res.spaceId);
                  return (
                    <div key={res.id} className="text-[10px] bg-green-50 text-green-700 p-1.5 rounded-lg border border-green-100 truncate font-medium">
                      <span className="block opacity-70">{res.startTime}</span>
                      <span className="block font-bold truncate">{space?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Dashboard = ({ reservations, spaces, onReserveClick }: { reservations: Reservation[], spaces: Space[], onReserveClick: () => void }) => {
  const today = new Date().toISOString().split('T')[0];
  const todaysRes = reservations.filter(r => r.date === today && r.status !== 'cancelled');
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    setNotices(StorageService.getNotices());
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">안녕하세요!</h2>
          <p className="text-gray-500">이음누리캠퍼스의 오늘 현황입니다.</p>
        </div>
        <button 
          onClick={onReserveClick}
          className="bg-campus-green text-white px-6 py-3 rounded-full font-bold flex items-center space-x-2 hover:shadow-lg transform hover:-translate-y-1 transition-all"
        >
          <PlusCircle size={20} />
          <span>새 예약 신청</span>
        </button>
      </header>

      {/* Notice Section */}
      <section className="bg-orange-50/50 border border-orange-100 rounded-[2rem] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Megaphone size={120} className="text-orange-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-4">
            <Megaphone size={20} className="text-orange-500" />
            <h3 className="font-bold text-orange-800">공지사항</h3>
          </div>
          <div className="space-y-2">
            {notices.slice(0, 2).map(notice => (
              <div key={notice.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border border-orange-100">
                <div className="flex items-center space-x-3">
                  {notice.isImportant && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">중요</span>}
                  <span className="text-sm font-medium text-gray-700">{notice.title}</span>
                </div>
                <span className="text-xs text-gray-400">{notice.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-campus-green"><Calendar size={20} /><h3 className="font-bold">오늘의 예약</h3></div>
          <p className="text-4xl font-bold text-gray-800">{todaysRes.length}<span className="text-lg font-normal ml-1">건</span></p>
        </div>
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-blue-600"><MapPin size={20} /><h3 className="font-bold">운영 공간</h3></div>
          <p className="text-4xl font-bold text-gray-800">{spaces.length}<span className="text-lg font-normal ml-1">곳</span></p>
        </div>
        <div className="glass-card p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-orange-500"><Users size={20} /><h3 className="font-bold">전체 예약 건수</h3></div>
          <p className="text-4xl font-bold text-gray-800">{reservations.length}<span className="text-lg font-normal ml-1">건</span></p>
        </div>
      </div>

      <section>
        <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
          <span>실시간 공간 현황</span>
          <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">LIVE</span>
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-sm uppercase">
              <tr><th className="px-6 py-4">공간명</th><th className="px-6 py-4">신청자</th><th className="px-6 py-4">시간</th><th className="px-6 py-4">상태</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {todaysRes.length > 0 ? (
                todaysRes.map(res => {
                  const space = spaces.find(s => s.id === res.spaceId);
                  return (
                    <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-800">{space?.name}</td>
                      <td className="px-6 py-4 text-gray-600">{res.userName}</td>
                      <td className="px-6 py-4 text-gray-600">{res.startTime} - {res.endTime}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{res.status === 'confirmed' ? '확정' : res.status === 'cancelled' ? '취소' : '대기'}</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">오늘은 아직 예약이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const SettingsView = () => {
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [showToast, setShowToast] = useState(false);

  const toggleEmail = () => setSettings(prev => ({ ...prev, emailNotifications: !prev.emailNotifications }));
  const toggleInApp = () => setSettings(prev => ({ ...prev, inAppNotifications: !prev.inAppNotifications }));

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="max-w-3xl animate-in fade-in duration-500 space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-800">환경 설정</h2>
        <p className="text-gray-500 font-medium">서비스 이용을 위한 알림 및 개인 설정을 관리합니다.</p>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-campus-green rounded-2xl"><Bell size={24} /></div>
          <div>
            <h3 className="font-bold text-xl text-gray-800">알림 설정</h3>
            <p className="text-sm text-gray-500">예약 상태 변경에 대한 알림 방식을 선택하세요.</p>
          </div>
        </div>
        
        <div className="p-8 space-y-6">
          {/* Email Notification */}
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center group-hover:bg-green-50 group-hover:text-campus-green transition-colors"><Mail size={20} /></div>
              <div>
                <p className="font-bold text-gray-800">이메일 알림</p>
                <p className="text-xs text-gray-400">등록된 이메일로 예약 승인/거절 소식을 받습니다.</p>
              </div>
            </div>
            <button onClick={toggleEmail} className="text-campus-green transition-transform active:scale-95">
              {settings.emailNotifications ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-gray-300" />}
            </button>
          </div>

          {/* In-App Notification */}
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center group-hover:bg-green-50 group-hover:text-campus-green transition-colors"><BellDot size={20} /></div>
              <div>
                <p className="font-bold text-gray-800">인앱 알림</p>
                <p className="text-xs text-gray-400">앱 내 대시보드 및 알림 목록에서 상태 변화를 확인합니다.</p>
              </div>
            </div>
            <button onClick={toggleInApp} className="text-campus-green transition-transform active:scale-95">
              {settings.inAppNotifications ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-gray-300" />}
            </button>
          </div>
        </div>

        <div className="bg-gray-50 p-6 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-campus-green text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-2 hover:bg-green-800 transition-all shadow-md active:scale-95"
          >
            <Save size={18} />
            <span>설정 저장하기</span>
          </button>
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-10 right-10 bg-gray-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 animate-in slide-in-from-bottom duration-300 z-[60]">
          <CheckCircle2 size={20} className="text-green-400" />
          <span className="font-bold">설정이 성공적으로 저장되었습니다.</span>
        </div>
      )}

      <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 flex items-start space-x-3">
        <Info size={18} className="text-orange-500 mt-0.5" />
        <div className="text-xs text-orange-800 leading-relaxed font-medium">
          <p className="font-bold mb-1">알림 수신 안내</p>
          알림을 비활성화하더라도 관리자 승인이 필요한 중요 사항은 직접 예약 내역에서 확인이 가능합니다. 서비스 품질 향상을 위해 이메일 수신을 권장합니다.
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ reservations, onUpdate }: { reservations: Reservation[], onUpdate: () => void }) => {
  const [adminTab, setAdminTab] = useState<'res' | 'notices'>('res');
  const pendingRes = reservations.filter(r => r.status === 'pending');
  const otherRes = reservations.filter(r => r.status !== 'pending');
  const [notices, setNotices] = useState<Notice[]>([]);
  const [newNotice, setNewNotice] = useState({ title: '', content: '', isImportant: false });

  useEffect(() => {
    setNotices(StorageService.getNotices());
  }, []);

  const handleAction = (id: string, status: Reservation['status']) => {
    StorageService.updateStatus(id, status);
    onUpdate();
  };

  const handleAddNotice = () => {
    if (!newNotice.title) return;
    const notice: Notice = {
      id: Math.random().toString(36).substr(2, 9),
      title: newNotice.title,
      content: newNotice.content,
      date: new Date().toISOString().split('T')[0],
      isImportant: newNotice.isImportant
    };
    StorageService.saveNotice(notice);
    setNotices(StorageService.getNotices());
    setNewNotice({ title: '', content: '', isImportant: false });
  };

  const handleDeleteNotice = (id: string) => {
    StorageService.deleteNotice(id);
    setNotices(StorageService.getNotices());
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">관리자 대시보드</h2>
          <p className="text-gray-500">시스템 설정 및 관리를 진행합니다.</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
          <button onClick={() => setAdminTab('res')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${adminTab === 'res' ? 'bg-white text-campus-green shadow-sm' : 'text-gray-400'}`}>예약 승인</button>
          <button onClick={() => setAdminTab('notices')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${adminTab === 'notices' ? 'bg-white text-campus-green shadow-sm' : 'text-gray-400'}`}>공지 관리</button>
        </div>
      </div>

      {adminTab === 'res' ? (
        <>
          <section>
            <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
              <span>승인 대기 중</span>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">{pendingRes.length}</span>
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {pendingRes.length > 0 ? (
                pendingRes.map(res => {
                  const space = SPACES.find(s => s.id === res.spaceId);
                  return (
                    <div key={res.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-yellow-50 text-yellow-600 rounded-2xl"><Clock size={24} /></div>
                        <div>
                          <h4 className="font-bold text-lg text-gray-800">{space?.name} - {res.userName}</h4>
                          <p className="text-sm text-gray-500 font-bold">{res.date} | {res.startTime} - {res.endTime}</p>
                          <p className="text-sm text-gray-600 mt-1 italic">"{res.purpose}"</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleAction(res.id, 'confirmed')} className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center space-x-2"><ThumbsUp size={16} /><span>승인</span></button>
                        <button onClick={() => handleAction(res.id, 'cancelled')} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center space-x-2"><ThumbsDown size={16} /><span>거절</span></button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-400 font-bold">대기 중인 예약이 없습니다.</div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 flex items-center space-x-2"><Plus size={20} /><span>새 공지 작성</span></h3>
            <input 
              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 font-medium"
              placeholder="공지 제목"
              value={newNotice.title}
              onChange={e => setNewNotice({...newNotice, title: e.target.value})}
            />
            <textarea 
              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-2xl focus:border-campus-green outline-none h-24 text-gray-900 font-medium"
              placeholder="공지 내용"
              value={newNotice.content}
              onChange={e => setNewNotice({...newNotice, content: e.target.value})}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" checked={newNotice.isImportant} onChange={e => setNewNotice({...newNotice, isImportant: e.target.checked})} className="w-4 h-4 text-campus-green rounded" />
                <span className="text-sm font-medium text-gray-600">중요 공지 여부</span>
              </label>
              <button onClick={handleAddNotice} className="bg-campus-green text-white px-6 py-2 rounded-xl font-bold transition-all hover:bg-green-800">공지 등록</button>
            </div>
          </div>

          <div className="space-y-4">
            {notices.map(notice => (
              <div key={notice.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between transition-all hover:bg-gray-50">
                <div>
                  <div className="flex items-center space-x-2">
                    {notice.isImportant && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">중요</span>}
                    <h4 className="font-bold text-gray-800">{notice.title}</h4>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 font-medium">{notice.date}</p>
                </div>
                <button onClick={() => handleDeleteNotice(notice.id)} className="p-2 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const ReservationModal = ({ space, onClose, onReserved }: { space: Space, onClose: () => void, onReserved: () => void }) => {
  const [formData, setFormData] = useState({
    userName: '',
    purpose: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00'
  });
  const [error, setError] = useState<string | null>(null);
  const [existingReservations, setExistingReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const all = StorageService.getReservations();
    const filtered = all.filter(r => r.spaceId === space.id && r.date === formData.date && r.status === 'confirmed');
    setExistingReservations(filtered);
    setError(null);
  }, [formData.date, space.id]);

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const checkDurationPolicy = () => {
    const all = StorageService.getReservations();
    const userHasRes = all.some(r => r.userName.trim().toLowerCase() === formData.userName.trim().toLowerCase() && r.date === formData.date && r.spaceId === space.id);
    
    const startMins = timeToMinutes(formData.startTime);
    const endMins = timeToMinutes(formData.endTime);
    const duration = endMins - startMins;

    if (!userHasRes) {
      if (duration > 120) return "초기 예약은 최대 2시간까지만 가능합니다.";
    } else {
      if (duration !== 60) return "추가 예약은 1시간 단위로만 신청 가능합니다.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userName.trim()) {
      setError('이름 또는 단체명을 입력해주세요.');
      return;
    }
    if (!formData.purpose.trim()) {
      setError('사용 목적을 입력해주세요.');
      return;
    }

    const startMins = timeToMinutes(formData.startTime);
    const endMins = timeToMinutes(formData.endTime);

    if (endMins <= startMins) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    const policyError = checkDurationPolicy();
    if (policyError) {
      setError(policyError);
      return;
    }

    const hasOverlap = existingReservations.some(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return Math.max(startMins, resStart) < Math.min(endMins, resEnd);
    });

    if (hasOverlap) {
      setError('이미 해당 시간에 예약이 존재합니다.');
      return;
    }

    const newRes: Reservation = {
      id: Math.random().toString(36).substr(2, 9),
      spaceId: space.id,
      userName: formData.userName,
      purpose: formData.purpose,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: 'pending',
      createdAt: Date.now(),
      isRead: true
    };
    StorageService.saveReservation(newRes);
    onReserved();
    alert('예약 신청이 완료되었습니다. 관리자 승인 후 확정됩니다.');
  };

  const startHour = 9;
  const endHour = 22;
  const totalMinutes = (endHour - startHour) * 60;

  const timelineItems = useMemo(() => {
    return existingReservations.map(res => {
      const start = Math.max(timeToMinutes(res.startTime), startHour * 60);
      const end = Math.min(timeToMinutes(res.endTime), endHour * 60);
      const left = ((start - startHour * 60) / totalMinutes) * 100;
      const width = ((end - start) / totalMinutes) * 100;
      return { id: res.id, left, width, label: `${res.startTime}-${res.endTime}` };
    });
  }, [existingReservations, totalMinutes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-campus-green p-8 text-white relative">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-white/20 rounded-2xl"><MapPin size={28} /></div>
            <div><h2 className="text-2xl font-bold tracking-tight">{space.name}</h2><p className="text-sm text-green-100 opacity-90">선택하신 공간의 예약 신청을 진행합니다.</p></div>
          </div>
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-campus-green border-b border-gray-100 pb-2"><User size={18} /><h3 className="font-bold text-sm uppercase tracking-wider">신청자 정보</h3></div>
            <div className="grid grid-cols-1 gap-6">
              <div className="group">
                <label className="text-sm font-bold text-gray-700 mb-2 block">이름 또는 단체명</label>
                <input 
                  autoFocus
                  required 
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 placeholder:text-gray-300 transition-all font-medium" 
                  value={formData.userName} 
                  onChange={e => updateField('userName', e.target.value)} 
                  placeholder="예: 홍길동 또는 이음누리 독서회" 
                />
              </div>
              <div className="group">
                <label className="text-sm font-bold text-gray-700 mb-2 block">사용 목적</label>
                <textarea 
                  required 
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none h-28 resize-none text-gray-900 placeholder:text-gray-300 transition-all font-medium" 
                  value={formData.purpose} 
                  onChange={e => updateField('purpose', e.target.value)} 
                  placeholder="공간 사용 목적을 상세히 기술해 주세요" 
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-campus-green border-b border-gray-100 pb-2"><CalendarDays size={18} /><h3 className="font-bold text-sm uppercase tracking-wider">예약 일정 및 예약 가능 시간</h3></div>
            
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <div className="flex justify-between text-[10px] text-gray-400 font-black mb-3 uppercase tracking-tighter">
                <span>09:00</span>
                <span>12:00</span>
                <span>15:00</span>
                <span>18:00</span>
                <span>21:00</span>
              </div>
              <div className="relative h-7 bg-gray-200 rounded-full overflow-hidden mb-4 shadow-inner">
                {timelineItems.map(item => (
                  <div 
                    key={item.id} 
                    className="absolute h-full bg-red-400/90 border-x border-red-600/20" 
                    style={{ left: `${item.left}%`, width: `${item.width}%` }}
                    title={item.label}
                  />
                ))}
                {(() => {
                  const s = Math.max(timeToMinutes(formData.startTime), startHour * 60);
                  const e = Math.min(timeToMinutes(formData.endTime), endHour * 60);
                  if (e > s) {
                    const l = ((s - startHour * 60) / totalMinutes) * 100;
                    const w = ((e - s) / totalMinutes) * 100;
                    return <div className="absolute h-full bg-green-500/50 border-x-2 border-green-600 z-10 animate-pulse" style={{ left: `${l}%`, width: `${w}%` }} />;
                  }
                  return null;
                })()}
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-start space-x-2 mb-2">
                <Info size={14} className="text-campus-green mt-0.5" />
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  <span className="font-bold text-campus-green">예약 정책: </span> 
                  초기 예약은 최대 2시간까지 가능합니다. 추가 예약은 1시간 단위로 나누어 신청해 주세요. (예: 4시간 예약 시 2시간 + 1시간 + 1시간)
                </p>
              </div>
              <p className="text-[10px] text-gray-500 flex items-center space-x-2 font-medium">
                <span className="inline-block w-2.5 h-2.5 bg-red-400 rounded-sm"></span>
                <span>이미 예약됨</span>
                <span className="inline-block w-2.5 h-2.5 bg-green-500/50 rounded-sm ml-2"></span>
                <span>내 선택 영역</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">예약 날짜</label>
                <input 
                  type="date" 
                  required 
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 transition-all font-bold" 
                  value={formData.date} 
                  onChange={e => updateField('date', e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-bold text-gray-700 mb-2 block">이용 시간</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="time" 
                    required 
                    className="w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-sm text-gray-900 font-bold" 
                    value={formData.startTime} 
                    onChange={e => updateField('startTime', e.target.value)} 
                  />
                  <span className="text-gray-400 font-bold">~</span>
                  <input 
                    type="time" 
                    required 
                    className="w-full px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-sm text-gray-900 font-bold" 
                    value={formData.endTime} 
                    onChange={e => updateField('endTime', e.target.value)} 
                  />
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-red-500 text-xs font-black flex items-center space-x-2 animate-bounce-short bg-red-50 p-3 rounded-xl border border-red-100"><AlertCircle size={14} /><span>{error}</span></p>}
          </div>

          <div className="pt-6 flex space-x-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">취소</button>
            <button type="submit" className="flex-[2] bg-campus-green text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-green-800 transition-all">예약 신청 완료</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SpaceExplorer = ({ onSelect }: { onSelect: (s: Space) => void }) => {
  const [filter, setFilter] = useState<Space['category'] | 'all'>('all');
  const filteredSpaces = filter === 'all' ? SPACES : SPACES.filter(s => s.category === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap gap-2">
        {(['all', 'hall', 'room', 'cafe', 'studio'] as const).map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${filter === cat ? 'bg-campus-green text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'}`}>
            {cat === 'all' ? '전체' : cat === 'hall' ? '강당' : cat === 'room' ? '세미나실' : cat === 'cafe' ? '카페' : '스튜디오'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredSpaces.map(space => (
          <div key={space.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
            <div className="relative h-56 overflow-hidden">
              <img src={space.imageUrl} alt={space.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute top-4 left-4"><span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-campus-green shadow-sm">{space.category.toUpperCase()}</span></div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2"><h3 className="text-xl font-bold text-gray-800">{space.name}</h3><div className="flex items-center text-gray-500 text-sm font-bold"><Users size={14} className="mr-1" /><span>{space.capacity}인</span></div></div>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{space.description}</p>
              <div className="flex flex-wrap gap-2 mb-6">{space.facilities.map(f => (<span key={f} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 font-bold">{f}</span>))}</div>
              <button onClick={() => onSelect(space)} className="w-full py-4 bg-gray-50 text-campus-green font-extrabold rounded-xl hover:bg-campus-green hover:text-white transition-all flex items-center justify-center space-x-2 transition-all"><span>예약 신청하기</span><ChevronRight size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AIChatManager = () => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([{ role: 'assistant', content: '안녕하세요! 이음누리 캠퍼스 AI 매니저입니다. 어떤 공간을 찾고 계신가요?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput('');
    const updatedMessages: any[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setIsLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: updatedMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
        config: { systemInstruction: `You are an AI Manager for '이음누리 캠퍼스'. Recommend appropriate spaces. Available spaces: ${JSON.stringify(SPACES)}`, },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || '오류가 발생했습니다.' }]);
    } catch (e) { setMessages(prev => [...prev, { role: 'assistant', content: '연결 오류가 발생했습니다.' }]); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-[600px] overflow-hidden">
      <div className="bg-campus-green p-6 text-white flex items-center space-x-4"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><MessageSquare size={20} /></div><div><h3 className="font-bold">AI 캠퍼스 매니저</h3><p className="text-xs text-green-100 font-medium font-bold">실시간으로 답변해 드립니다</p></div></div>
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed font-medium ${msg.role === 'user' ? 'bg-campus-green text-white shadow-md' : 'bg-white text-gray-800 shadow-sm border border-gray-100'}`}>{msg.content}</div></div>
        ))}
        {isLoading && <div className="flex justify-start"><div className="bg-white p-4 rounded-2xl flex items-center space-x-2 border border-gray-100 shadow-sm"><Loader2 className="animate-spin text-campus-green" size={16} /><span className="text-xs text-gray-400 font-black">생각 중...</span></div></div>}
      </div>
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2 bg-gray-50 rounded-2xl px-4 py-1.5 focus-within:ring-2 focus-within:ring-campus-green/20 transition-all"><input type="text" className="flex-1 bg-transparent py-2.5 text-sm outline-none text-gray-900 font-bold" placeholder="궁금한 점을 입력하세요..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} /><button onClick={handleSend} disabled={isLoading || !input.trim()} className="p-2.5 bg-campus-green text-white rounded-xl disabled:opacity-50 transition-all hover:bg-green-800 shadow-md"><Send size={18} /></button></div>
      </div>
    </div>
  );
};

// --- App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [resViewMode, setResViewMode] = useState<'list' | 'calendar'>('list');
  
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  useEffect(() => {
    const res = StorageService.getReservations();
    setReservations(res);
  }, [activeTab]);

  const refreshReservations = () => {
    setReservations(StorageService.getReservations());
    setSelectedSpace(null);
    if (activeTab === 'spaces') setActiveTab('reservations');
  };

  const unreadCount = useMemo(() => reservations.filter(r => !r.isRead && r.status !== 'pending').length, [reservations]);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === '1225') {
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#FDFBF7]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={unreadCount} />
      
      <main className="flex-1 md:ml-64 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard reservations={reservations} spaces={SPACES} onReserveClick={() => setActiveTab('spaces')} />}

          {activeTab === 'spaces' && (
            <div>
              <div className="mb-8"><h2 className="text-3xl font-bold text-gray-800">공간 둘러보기</h2><p className="text-gray-500 font-bold font-medium">다양한 목적에 맞는 최고의 공간을 제안합니다.</p></div>
              <SpaceExplorer onSelect={setSelectedSpace} />
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-8 gap-4">
                <div><h2 className="text-3xl font-bold text-gray-800">내 예약 현황</h2><p className="text-gray-500 font-bold font-medium">신청하신 예약의 상태를 확인할 수 있습니다.</p></div>
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center shadow-inner">
                    <button onClick={() => setResViewMode('list')} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${resViewMode === 'list' ? 'bg-white text-campus-green shadow-sm' : 'text-gray-400'}`}><List size={16} /><span>목록</span></button>
                    <button onClick={() => setResViewMode('calendar')} className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${resViewMode === 'calendar' ? 'bg-white text-campus-green shadow-sm' : 'text-gray-400'}`}><CalendarDays size={16} /><span>달력</span></button>
                  </div>
                  {unreadCount > 0 && <button onClick={() => { StorageService.markAllAsRead(); setReservations(StorageService.getReservations()); }} className="flex items-center space-x-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-xl font-bold transition-all hover:bg-orange-100"><Trash2 size={16} /><span>알림 지우기 ({unreadCount})</span></button>}
                </div>
              </div>
              {unreadCount > 0 && <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-6 flex items-center space-x-3 text-orange-800 shadow-sm"><BellDot className="animate-pulse" size={20} /><p className="text-sm font-bold">상태가 변경된 새로운 알림이 {unreadCount}건 있습니다.</p></div>}
              {resViewMode === 'list' ? (
                <div className="space-y-4">
                  {reservations.length > 0 ? (
                    reservations.sort((a,b) => b.createdAt - a.createdAt).map(res => {
                      const space = SPACES.find(s => s.id === res.spaceId);
                      const isNew = !res.isRead && res.status !== 'pending';
                      return (
                        <div key={res.id} onClick={() => { if (isNew) { StorageService.markAsRead(res.id); setReservations(StorageService.getReservations()); } }} className={`bg-white p-6 rounded-2xl shadow-sm border transition-all cursor-pointer hover:shadow-md ${isNew ? 'border-orange-300 ring-2 ring-orange-50 translate-x-1' : 'border-gray-100'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`p-3 rounded-full relative ${res.status === 'confirmed' ? 'bg-green-100 text-green-700 shadow-sm' : res.status === 'cancelled' ? 'bg-red-100 text-red-700 shadow-sm' : 'bg-yellow-100 text-yellow-700 shadow-sm'}`}>{res.status === 'confirmed' ? <CheckCircle2 size={24} /> : res.status === 'cancelled' ? <XCircle size={24} /> : <Clock size={24} />}{isNew && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white animate-ping"></span>}</div>
                              <div><div className="flex items-center space-x-2"><h4 className="font-bold text-lg text-gray-800">{space?.name}</h4>{isNew && <span className="text-[10px] font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">Update</span>}</div><p className="text-sm text-gray-500 font-black font-medium">{res.date} | {res.startTime} - {res.endTime}</p></div>
                            </div>
                            <span className={`px-4 py-1 rounded-full text-xs font-bold ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{res.status === 'confirmed' ? '승인완료' : res.status === 'cancelled' ? '거절됨' : '승인대기'}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (<div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300"><Calendar className="mx-auto text-gray-300 mb-4" size={48} /><p className="text-gray-400 font-bold font-black">예약된 내역이 없습니다.</p></div>)}
                </div>
              ) : <CalendarView reservations={reservations} />}
            </div>
          )}

          {activeTab === 'ai-chat' && (<div><div className="mb-8"><h2 className="text-3xl font-bold text-gray-800">AI 매니저 상담</h2><p className="text-gray-500 font-bold font-medium">공간 추천 및 이용 안내를 도와드립니다.</p></div><AIChatManager /></div>)}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'admin' && (
            <div className="max-w-2xl mx-auto">
              {!isAdminAuthenticated ? (
                <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-gray-100 text-center animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-green-50 text-campus-green rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={40} /></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">관리자 전용</h2>
                  <p className="text-gray-500 mb-8 font-black font-bold">액세스를 위해 비밀번호를 입력해주세요.</p>
                  <form onSubmit={handleAdminAuth} className="space-y-6">
                    <div className="relative">
                      <input 
                        type="password" 
                        className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-3xl focus:border-campus-green outline-none text-center text-4xl font-bold text-gray-900 tracking-widest placeholder:tracking-normal transition-all shadow-inner" 
                        placeholder="••••" 
                        value={adminPasswordInput}
                        onChange={e => setAdminPasswordInput(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <button type="submit" className="w-full bg-campus-green text-white py-5 rounded-3xl font-black text-lg shadow-lg hover:bg-green-800 transition-all transform hover:-translate-y-1">관리자 로그인</button>
                  </form>
                </div>
              ) : (
                <AdminDashboard reservations={reservations} onUpdate={() => setReservations(StorageService.getReservations())} />
              )}
            </div>
          )}
        </div>
      </main>

      {selectedSpace && <ReservationModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onReserved={refreshReservations} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
