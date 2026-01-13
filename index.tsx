
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
  if (!time) return 0;
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
        <p className="text-xs text-green-200 mt-1 uppercase">Campus Reservation</p>
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
    </aside>
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
          <h2 className="text-3xl font-bold text-gray-800">이음누리 캠퍼스</h2>
          <p className="text-gray-500 font-medium">지역 주민을 위한 열린 공간 예약 시스템입니다.</p>
        </div>
        <button 
          onClick={onReserveClick}
          className="bg-campus-green text-white px-6 py-3 rounded-full font-black flex items-center space-x-2 hover:shadow-lg transition-all"
        >
          <PlusCircle size={20} />
          <span>공간 예약하기</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-campus-green"><Calendar size={20} /><h3 className="font-bold">오늘의 예약</h3></div>
          <p className="text-4xl font-black text-gray-800">{todaysRes.length}<span className="text-lg font-normal ml-1">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-blue-600"><MapPin size={20} /><h3 className="font-bold">운영 공간</h3></div>
          <p className="text-4xl font-black text-gray-800">{spaces.length}<span className="text-lg font-normal ml-1">곳</span></p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4 text-orange-500"><Users size={20} /><h3 className="font-bold">전체 예약</h3></div>
          <p className="text-4xl font-black text-gray-800">{reservations.length}<span className="text-lg font-normal ml-1">건</span></p>
        </div>
      </div>
      
      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">최신 공지사항</h3>
        </div>
        <div className="divide-y divide-gray-50">
            {notices.map(notice => (
                <div key={notice.id} className="p-4 px-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                        {notice.isImportant && <span className="bg-red-100 text-red-600 text-[10px] font-black px-2 py-0.5 rounded-full">중요</span>}
                        <span className="text-sm font-bold text-gray-700">{notice.title}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{notice.date}</span>
                </div>
            ))}
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
              <p className="text-sm text-gray-500 font-medium">예약 상태 변경에 대한 알림 방식을 선택하세요.</p>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center group-hover:bg-green-50 group-hover:text-campus-green transition-colors"><Mail size={20} /></div>
                <div>
                  <p className="font-bold text-gray-800">이메일 알림</p>
                  <p className="text-xs text-gray-400 font-medium">등록된 이메일로 예약 승인/거절 소식을 받습니다.</p>
                </div>
              </div>
              <button onClick={toggleEmail} className="text-campus-green transition-transform active:scale-95">
                {settings.emailNotifications ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-gray-300" />}
              </button>
            </div>
  
            <div className="flex items-center justify-between group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center group-hover:bg-green-50 group-hover:text-campus-green transition-colors"><BellDot size={20} /></div>
                <div>
                  <p className="font-bold text-gray-800">인앱 알림</p>
                  <p className="text-xs text-gray-400 font-medium">앱 내 대시보드 및 알림 목록에서 상태 변화를 확인합니다.</p>
                </div>
              </div>
              <button onClick={toggleInApp} className="text-campus-green transition-transform active:scale-95">
                {settings.inAppNotifications ? <ToggleRight size={44} /> : <ToggleLeft size={44} className="text-gray-300" />}
              </button>
            </div>
          </div>
  
          <div className="bg-gray-50 p-6 flex justify-end">
            <button onClick={handleSave} className="bg-campus-green text-white px-8 py-3 rounded-2xl font-black flex items-center space-x-2 hover:bg-green-800 transition-all shadow-md active:scale-95">
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
  const [isRepeatUser, setIsRepeatUser] = useState(false);

  useEffect(() => {
    const all = StorageService.getReservations();
    // 해당 날짜, 해당 공간에 신청자 이름으로 예약이 있는지 확인 (취소건 제외)
    const userResOnDay = all.filter(r => 
        r.userName.trim().toLowerCase() === formData.userName.trim().toLowerCase() && 
        r.date === formData.date && 
        r.spaceId === space.id &&
        r.status !== 'cancelled'
    );
    setIsRepeatUser(userResOnDay.length > 0);
    
    // 타임라인용 (모든 확정된 예약 표시)
    const confirmed = all.filter(r => r.spaceId === space.id && r.date === formData.date && r.status === 'confirmed');
    setExistingReservations(confirmed);
    setError(null);
  }, [formData.date, formData.userName, space.id]);

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.userName.trim()) { setError('이름 또는 단체명을 입력해주세요.'); return; }
    if (!formData.purpose.trim()) { setError('사용 목적을 입력해주세요.'); return; }

    const startMins = timeToMinutes(formData.startTime);
    const endMins = timeToMinutes(formData.endTime);
    const durationMins = endMins - startMins;

    if (durationMins <= 0) { setError('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }

    // 예약 정책 체크
    if (!isRepeatUser) {
        // 초기 예약: 최대 2시간
        if (durationMins > 120) {
            setError('초기 예약은 최대 2시간까지만 가능합니다.');
            return;
        }
    } else {
        // 재예약: 정확히 1시간 단위
        if (durationMins !== 60) {
            setError('추가 예약은 1시간 단위로만 신청 가능합니다.');
            return;
        }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-campus-green p-8 text-white relative">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-white/20 rounded-2xl"><MapPin size={28} /></div>
            <div><h2 className="text-2xl font-black tracking-tight">{space.name}</h2><p className="text-sm text-green-100 font-medium">공간 예약 신청</p></div>
          </div>
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-all"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2 text-campus-green"><User size={18} /><h3 className="font-bold text-sm uppercase">신청 정보</h3></div>
                {formData.userName && (
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full ${isRepeatUser ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isRepeatUser ? '추가 예약 모드 (1시간)' : '초기 예약 모드 (최대 2시간)'}
                    </span>
                )}
            </div>
            
            <div className="space-y-4">
              <div className="group">
                <label className="text-xs font-black text-gray-500 mb-2 block uppercase">이름 또는 단체명</label>
                <input 
                  autoFocus
                  required 
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 placeholder:text-gray-300 transition-all font-bold shadow-sm" 
                  value={formData.userName} 
                  onChange={e => updateField('userName', e.target.value)} 
                  placeholder="예: 홍길동 또는 이음누리 독서회" 
                />
              </div>
              <div className="group">
                <label className="text-xs font-black text-gray-500 mb-2 block uppercase">사용 목적</label>
                <textarea 
                  required 
                  className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none h-24 resize-none text-gray-900 placeholder:text-gray-300 transition-all font-bold shadow-sm" 
                  value={formData.purpose} 
                  onChange={e => updateField('purpose', e.target.value)} 
                  placeholder="공간 사용 목적을 상세히 기술해 주세요" 
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-campus-green border-b border-gray-100 pb-2"><CalendarDays size={18} /><h3 className="font-bold text-sm uppercase">일정 선택</h3></div>
            
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
              <div className="flex justify-between text-[10px] text-gray-400 font-black mb-3 uppercase tracking-tighter">
                <span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span><span>21:00</span>
              </div>
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mb-4 shadow-inner">
                {timelineItems.map(item => (
                  <div key={item.id} className="absolute h-full bg-red-400/80 border-x border-red-600/10" style={{ left: `${item.left}%`, width: `${item.width}%` }} />
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
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-red-400 rounded-full"></span><span className="text-[10px] font-bold text-gray-500">예약됨</span></div>
                <div className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 bg-green-500/50 rounded-full"></span><span className="text-[10px] font-bold text-gray-500">내 선택</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-gray-500 mb-2 block uppercase">예약 날짜</label>
                <input type="date" required className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 font-bold shadow-sm" value={formData.date} onChange={e => updateField('date', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 mb-2 block uppercase">시간 설정</label>
                <div className="flex items-center space-x-2">
                  <input type="time" required className="w-full px-3 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-sm text-gray-900 font-bold shadow-sm" value={formData.startTime} onChange={e => updateField('startTime', e.target.value)} />
                  <span className="text-gray-400 font-black">~</span>
                  <input type="time" required className="w-full px-3 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-sm text-gray-900 font-bold shadow-sm" value={formData.endTime} onChange={e => updateField('endTime', e.target.value)} />
                </div>
              </div>
            </div>
            {error && <p className="mt-2 text-red-600 text-xs font-black flex items-center space-x-2 animate-bounce-short bg-red-50 p-3 rounded-xl border border-red-100"><AlertCircle size={14} /><span>{error}</span></p>}
          </div>

          <div className="pt-4 flex space-x-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">취소</button>
            <button type="submit" className="flex-[2] bg-campus-green text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-green-800 transition-all">예약 신청하기</button>
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
                <p className="text-gray-500 text-sm mb-4 line-clamp-2 font-medium">{space.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">{space.facilities.map(f => (<span key={f} className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded-md border border-gray-100 font-bold">{f}</span>))}</div>
                <button onClick={() => onSelect(space)} className="w-full py-4 bg-gray-50 text-campus-green font-black rounded-xl hover:bg-campus-green hover:text-white transition-all flex items-center justify-center space-x-2"><span>이 공간 선택</span><ChevronRight size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');

  useEffect(() => {
    setReservations(StorageService.getReservations());
  }, [activeTab]);

  const refreshReservations = () => {
    setReservations(StorageService.getReservations());
    setSelectedSpace(null);
    if (activeTab === 'spaces') setActiveTab('reservations');
  };

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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={0} />
      <main className="flex-1 md:ml-64 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard reservations={reservations} spaces={SPACES} onReserveClick={() => setActiveTab('spaces')} />}
          {activeTab === 'spaces' && <SpaceExplorer onSelect={setSelectedSpace} />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && (
            <div className="max-w-2xl mx-auto">
              {!isAdminAuthenticated ? (
                <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-gray-100 text-center">
                  <div className="w-20 h-20 bg-green-50 text-campus-green rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={40} /></div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">관리자 로그인</h2>
                  <form onSubmit={handleAdminAuth} className="space-y-6">
                    <input type="password" className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-3xl focus:border-campus-green outline-none text-center text-4xl font-black text-gray-900 tracking-widest transition-all" placeholder="••••" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} autoFocus />
                    <button type="submit" className="w-full bg-campus-green text-white py-5 rounded-3xl font-black text-lg shadow-lg hover:bg-green-800 transition-all">접속하기</button>
                  </form>
                </div>
              ) : (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <h2 className="text-3xl font-bold text-gray-800">관리자 제어판</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {reservations.filter(r => r.status === 'pending').map(res => (
                            <div key={res.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-800">{res.userName} - {SPACES.find(s => s.id === res.spaceId)?.name}</h4>
                                    <p className="text-sm text-gray-500 font-bold">{res.date} | {res.startTime} - {res.endTime}</p>
                                    <p className="text-xs text-gray-400 mt-1 italic">"{res.purpose}"</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => { StorageService.updateStatus(res.id, 'confirmed'); refreshReservations(); }} className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center space-x-2"><ThumbsUp size={16} /><span>승인</span></button>
                                    <button onClick={() => { StorageService.updateStatus(res.id, 'cancelled'); refreshReservations(); }} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 flex items-center space-x-2"><ThumbsDown size={16} /><span>거절</span></button>
                                </div>
                            </div>
                        ))}
                        {reservations.filter(r => r.status === 'pending').length === 0 && <p className="text-center py-20 text-gray-400 font-bold">처리할 예약이 없습니다.</p>}
                    </div>
                </div>
              )}
            </div>
          )}
          {/* 다른 탭 생략 가능하나 reservations 탭은 필요할 수 있음 */}
        </div>
      </main>
      {selectedSpace && <ReservationModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onReserved={refreshReservations} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
