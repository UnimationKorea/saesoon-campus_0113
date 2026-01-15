
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Calendar as CalendarIcon, 
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
  Minus,
  Settings as SettingsIcon,
  Mail,
  ToggleLeft,
  ToggleRight,
  Save,
  Cloud,
  FileText
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

interface Announcement {
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

const minutesToTime = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// --- Simulated Cloud Service ---
const CloudService = {
  delay: () => new Promise(resolve => setTimeout(resolve, 800)),

  getReservations: async (): Promise<Reservation[]> => {
    await CloudService.delay();
    const data = localStorage.getItem('ieumnuri_reservations');
    return data ? JSON.parse(data) : [];
  },

  saveReservation: async (res: Reservation): Promise<void> => {
    await CloudService.delay();
    const all = await CloudService.getReservations();
    all.push({ ...res, isRead: true });
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(all));
  },

  updateStatus: async (id: string, status: Reservation['status']): Promise<void> => {
    await CloudService.delay();
    const all = await CloudService.getReservations();
    const updated = all.map(r => r.id === id ? { ...r, status, isRead: false } : r);
    localStorage.setItem('ieumnuri_reservations', JSON.stringify(updated));
  },

  getSettings: async (): Promise<UserSettings> => {
    await CloudService.delay();
    const data = localStorage.getItem('ieumnuri_settings');
    return data ? JSON.parse(data) : { emailNotifications: true, inAppNotifications: true };
  },

  saveSettings: async (settings: UserSettings): Promise<void> => {
    await CloudService.delay();
    localStorage.setItem('ieumnuri_settings', JSON.stringify(settings));
  },

  getAnnouncements: async (): Promise<Announcement[]> => {
    await CloudService.delay();
    const data = localStorage.getItem('ieumnuri_announcements');
    return data ? JSON.parse(data) : [];
  },

  saveAnnouncement: async (ann: Announcement): Promise<void> => {
    await CloudService.delay();
    const all = await CloudService.getAnnouncements();
    all.unshift(ann); // Newest first
    localStorage.setItem('ieumnuri_announcements', JSON.stringify(all));
  }
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, unreadCount }: { activeTab: string, setActiveTab: (t: string) => void, unreadCount: number }) => {
  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'spaces', label: '공간 둘러보기', icon: MapPin },
    { id: 'reservations', label: '예약 현황', icon: CalendarIcon, badge: unreadCount },
    { id: 'ai-chat', label: 'AI 매니저', icon: MessageSquare },
    { id: 'settings', label: '설정', icon: SettingsIcon },
    { id: 'admin', label: '관리자', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-campus-green text-white h-screen fixed left-0 top-0 p-6 hidden md:block shadow-2xl z-40">
      <div className="mb-10 flex items-center space-x-2">
        <div className="p-1.5 bg-white/10 rounded-lg"><Cloud size={20} className="text-green-300" /></div>
        <div>
          <h1 className="text-2xl font-black tracking-tight italic">이음누리</h1>
          <p className="text-[10px] text-green-300/80 font-bold uppercase tracking-widest">Connected</p>
        </div>
      </div>
      <nav className="space-y-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${
              activeTab === item.id ? 'bg-white/20 shadow-lg scale-[1.02]' : 'hover:bg-white/10 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center space-x-3">
              <item.icon size={18} />
              <span className="font-bold text-sm">{item.label}</span>
            </div>
            {item.badge && item.badge > 0 && (
              <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};

const LoadingState = ({ message = "데이터를 불러오는 중입니다..." }) => (
  <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
    <div className="relative">
      <Loader2 size={48} className="text-campus-green animate-spin opacity-20" />
      <Loader2 size={48} className="text-campus-green animate-spin absolute top-0 left-0" style={{ animationDuration: '1.5s' }} />
    </div>
    <p className="text-gray-400 font-bold text-sm">{message}</p>
  </div>
);

const ReservationModal = ({ space, onClose, onReserved }: { space: Space, onClose: () => void, onReserved: () => void }) => {
  const [formData, setFormData] = useState({
    userName: '',
    purpose: '',
    date: formatDate(new Date()),
    startTime: '10:00',
    endTime: '12:00'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingReservations, setExistingReservations] = useState<Reservation[]>([]);
  const [isRepeatUser, setIsRepeatUser] = useState(false);

  const START_HOUR = 9;
  const END_HOUR = 22;

  useEffect(() => {
    const fetchConflicts = async () => {
      const all = await CloudService.getReservations();
      const userDayRes = all.filter(r => 
        r.userName.trim().toLowerCase() === formData.userName.trim().toLowerCase() && 
        r.date === formData.date &&
        r.status !== 'cancelled'
      );
      setIsRepeatUser(userDayRes.length > 0);
      const confirmed = all.filter(r => r.spaceId === space.id && r.date === formData.date && r.status === 'confirmed');
      setExistingReservations(confirmed);
    };
    if (formData.userName.length > 1 || formData.date) fetchConflicts();
  }, [formData.date, formData.userName, space.id]);

  const slots = useMemo(() => {
    const s = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      s.push(`${h.toString().padStart(2, '0')}:00`);
      s.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return s;
  }, []);

  const isSlotBooked = (time: string) => {
    const tMin = timeToMinutes(time);
    return existingReservations.some(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return tMin >= resStart && tMin < resEnd;
    });
  };

  const isSelectionInvalid = () => {
    const start = timeToMinutes(formData.startTime);
    const end = timeToMinutes(formData.endTime);
    const duration = end - start;
    if (duration <= 0) return "종료 시간은 시작 시간보다 늦어야 합니다.";
    if (!isRepeatUser && duration > 120) return "초기 예약은 최대 2시간까지 가능합니다.";
    if (isRepeatUser && duration > 60) return "추가 예약은 1시간까지만 가능합니다.";
    
    const hasOverlap = existingReservations.some(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return Math.max(start, resStart) < Math.min(end, resEnd);
    });
    if (hasOverlap) return "해당 시간에 이미 예약이 존재합니다.";
    
    return null;
  };

  const handleSlotClick = (time: string) => {
    if (isSlotBooked(time)) return;
    
    const tMin = timeToMinutes(time);
    const defaultDuration = isRepeatUser ? 60 : 120;
    setFormData({
      ...formData,
      startTime: time,
      endTime: minutesToTime(Math.min(tMin + defaultDuration, END_HOUR * 60))
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = isSelectionInvalid();
    if (validationError) { setError(validationError); return; }
    if (!formData.userName.trim()) { setError('성함 또는 단체명을 입력하세요.'); return; }
    
    setIsSubmitting(true);
    setError(null);

    try {
      const newRes: Reservation = {
        id: Math.random().toString(36).substr(2, 9),
        spaceId: space.id,
        userName: formData.userName,
        purpose: formData.purpose,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: 'pending',
        createdAt: Date.now()
      };
      await CloudService.saveReservation(newRes);
      onReserved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300 my-8">
        <div className="bg-campus-green p-8 text-white relative">
          <div className="flex items-center space-x-4 mb-2">
            <div className="p-3 bg-white/20 rounded-2xl"><MapPin size={28} /></div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{space.name}</h2>
              <p className="text-sm text-green-100 font-medium opacity-80 italic">서버 실시간 동기화 중</p>
            </div>
          </div>
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-white/10 text-white/70 transition-all"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div className="flex items-center space-x-2 text-campus-green font-black text-xs uppercase tracking-widest">신청자 정보</div>
                    {formData.userName.length > 1 && (
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isRepeatUser ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                            {isRepeatUser ? '추가 예약 (1시간)' : '초기 예약 (2시간)'}
                        </span>
                    )}
                </div>
                <input required disabled={isSubmitting} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none text-gray-900 rounded-2xl transition-all font-bold shadow-sm" value={formData.userName} onChange={e => setFormData({...formData, userName: e.target.value})} placeholder="성함 또는 단체명" />
                <textarea required disabled={isSubmitting} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none h-32 resize-none text-gray-900 rounded-2xl transition-all font-bold shadow-sm" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} placeholder="사용 목적 (예: 소그룹 독서 모임)" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-campus-green font-black text-xs uppercase tracking-widest border-b border-gray-100 pb-2">날짜 선택</div>
                <input type="date" required disabled={isSubmitting} className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:border-campus-green outline-none text-gray-900 font-bold shadow-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center space-x-2 text-campus-green font-black text-xs uppercase tracking-widest">시간 슬롯 선택</div>
                <div className="flex items-center space-x-2 text-[10px] font-bold text-gray-400">
                  <span className="flex items-center"><span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>예약됨</span>
                  <span className="flex items-center"><span className="w-2 h-2 bg-campus-green rounded-full mr-1"></span>선택됨</span>
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {slots.map(time => {
                  const booked = isSlotBooked(time);
                  const selected = timeToMinutes(time) >= timeToMinutes(formData.startTime) && timeToMinutes(time) < timeToMinutes(formData.endTime);
                  
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={booked || isSubmitting}
                      onClick={() => handleSlotClick(time)}
                      className={`py-2 rounded-xl text-[11px] font-black transition-all border-2 ${
                        selected 
                          ? 'bg-campus-green text-white border-campus-green shadow-lg scale-95' 
                          : booked 
                            ? 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed opacity-50' 
                            : 'bg-white text-gray-600 border-gray-100 hover:border-campus-green hover:text-campus-green shadow-sm'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs font-bold text-gray-500">
                  <Clock size={14} />
                  <span>{formData.startTime} - {formData.endTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button type="button" onClick={() => {
                    const s = timeToMinutes(formData.startTime);
                    const e = timeToMinutes(formData.endTime);
                    setFormData({...formData, endTime: minutesToTime(Math.max(s + 30, e - 30))});
                  }} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400"><Minus size={14} /></button>
                  <button type="button" onClick={() => {
                    const e = timeToMinutes(formData.endTime);
                    setFormData({...formData, endTime: minutesToTime(Math.min(END_HOUR * 60, e + 30))});
                  }} className="p-1 hover:bg-gray-200 rounded-lg text-gray-400"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center space-x-3 text-red-600 animate-bounce-short">
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-sm font-black tracking-tight">{error}</p>
            </div>
          )}

          <div className="pt-4 flex space-x-4">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="flex-1 py-5 rounded-[1.5rem] font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all uppercase tracking-widest text-xs">Close</button>
            <button type="submit" disabled={isSubmitting} className="flex-[2] bg-campus-green text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center space-x-3 active:scale-95">
              {isSubmitting ? <><Loader2 className="animate-spin" size={24} /><span>처리 중...</span></> : <span>예약 신청 보내기</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DashboardView = ({ 
  reservations, 
  spaces, 
  announcements, 
  onReserveClick 
}: { 
  reservations: Reservation[], 
  spaces: Space[], 
  announcements: Announcement[],
  onReserveClick: () => void 
}) => {
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      <header className="space-y-2">
        <h2 className="text-4xl font-black text-gray-800 tracking-tight">좋은 하루입니다, <span className="text-campus-green">이음누리</span>입니다.</h2>
        <p className="text-gray-400 font-bold">오늘의 캠퍼스 현황을 한눈에 확인하세요.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6"><Clock size={24} /></div>
          <div><p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">대기 중인 예약</p><h3 className="text-3xl font-black text-gray-800">{pendingCount}건</h3></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-50 text-campus-green rounded-2xl flex items-center justify-center mb-6"><CheckCircle2 size={24} /></div>
          <div><p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">승인된 예약</p><h3 className="text-3xl font-black text-gray-800">{confirmedCount}건</h3></div>
        </div>
        <div className="bg-campus-green p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between group cursor-pointer hover:scale-[1.02] transition-all" onClick={onReserveClick}>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors"><PlusCircle size={24} /></div>
          <div><p className="text-green-100/70 font-bold text-[10px] uppercase mb-1 tracking-widest">새로운 시작</p><h3 className="text-2xl font-black">지금 예약하기</h3></div>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Megaphone size={20} className="text-campus-green" />
            <h3 className="text-xl font-black text-gray-800">캠퍼스 소식</h3>
          </div>
          <div className="flex space-x-6 overflow-x-auto pb-4 custom-scrollbar">
            {announcements.slice(0, 3).map(ann => (
              <div key={ann.id} className="min-w-[320px] bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:border-campus-green transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-gray-400 uppercase">{ann.date}</span>
                  {ann.isImportant && <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">Important</span>}
                </div>
                <h4 className="text-lg font-black text-gray-800 mb-3 group-hover:text-campus-green transition-colors">{ann.title}</h4>
                <p className="text-gray-500 text-sm font-medium line-clamp-2 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-800">추천 공간</h3>
          <button onClick={onReserveClick} className="text-sm font-black text-campus-green flex items-center space-x-1 hover:underline"><span>모두 보기</span><ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {spaces.slice(0, 2).map(space => (
            <div key={space.id} className="relative h-56 rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-lg" onClick={onReserveClick}>
              <img src={space.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-8 flex flex-col justify-end">
                <div className="mb-2"><span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase">{space.category}</span></div>
                <h4 className="text-white font-black text-xl mb-1">{space.name}</h4>
                <p className="text-white/70 text-sm font-medium line-clamp-1 leading-relaxed">{space.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AIChatView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: '안녕하세요! 이음누리 캠퍼스 AI 매니저입니다. 시설 안내나 예약 규칙에 대해 궁금한 점이 있으신가요?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMessage,
        config: {
            systemInstruction: "당신은 '이음누리 캠퍼스'의 친절한 AI 매니저입니다. 공간 정보를 안내하고 예약을 돕습니다."
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "죄송합니다. 메시지를 처리하지 못했습니다." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "네트워크 오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-500">
      <div className="p-8 border-b border-gray-50 flex items-center space-x-4 bg-green-50/20">
        <div className="w-12 h-12 bg-campus-green text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200/50"><MessageSquare size={24} /></div>
        <div>
          <h3 className="font-black text-gray-800 text-lg">AI 스마트 매니저</h3>
          <p className="text-[10px] text-campus-green font-black flex items-center space-x-1.5 uppercase tracking-widest"><span className="w-2 h-2 bg-campus-green rounded-full animate-ping"></span><span>Online Assistance</span></p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2`}>
            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] font-medium text-sm shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-campus-green text-white rounded-tr-none' : 'bg-gray-50 text-gray-700 rounded-tl-none border border-gray-100'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && <div className="flex justify-start animate-pulse"><div className="bg-gray-50 px-6 py-4 rounded-[2rem] rounded-tl-none text-xs text-gray-400 font-black tracking-widest uppercase">Thinking...</div></div>}
      </div>
      <form onSubmit={handleSend} className="p-8 bg-white border-t border-gray-50 flex items-center space-x-4">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="AI 매니저에게 질문하세요" className="flex-1 px-6 py-5 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none rounded-[2rem] font-bold text-gray-900 shadow-inner transition-all" />
        <button type="submit" disabled={!input.trim() || isTyping} className="p-5 bg-campus-green text-white rounded-[2rem] shadow-xl hover:bg-green-800 transition-all disabled:opacity-20"><Send size={24} /></button>
      </form>
    </div>
  );
};

const SettingsView = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  useEffect(() => { CloudService.getSettings().then(setSettings); }, []);
  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    await CloudService.saveSettings(settings);
    setIsSaving(false);
    alert('설정이 안전하게 업데이트되었습니다.');
  };
  if (!settings) return <LoadingState />;
  return (
    <div className="max-w-2xl animate-in fade-in duration-500 space-y-10">
        <header><h2 className="text-3xl font-black text-gray-800">사용자 환경 설정</h2><p className="text-gray-400 font-bold mt-1 text-sm">편리한 알림 설정을 통해 캠퍼스 소식을 빠르게 받아보세요.</p></header>
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-gray-100 space-y-10">
            <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem] group cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}>
                <div className="flex items-center space-x-5">
                    <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-500 group-hover:scale-110 transition-transform"><Mail size={28} /></div>
                    <div><h4 className="font-black text-gray-800 text-lg">이메일 알림</h4><p className="text-xs text-gray-400 font-bold mt-0.5">예약 승인/취소 상태를 메일로 수신</p></div>
                </div>
                <button className="text-campus-green transition-transform active:scale-90">{settings.emailNotifications ? <ToggleRight size={48} /> : <ToggleLeft size={48} className="text-gray-300" />}</button>
            </div>
            <div className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem] group cursor-pointer hover:bg-gray-100/50 transition-colors" onClick={() => setSettings({...settings, inAppNotifications: !settings.inAppNotifications})}>
                <div className="flex items-center space-x-5">
                    <div className="p-4 bg-white rounded-2xl shadow-sm text-orange-500 group-hover:scale-110 transition-transform"><Bell size={28} /></div>
                    <div><h4 className="font-black text-gray-800 text-lg">실시간 알림</h4><p className="text-xs text-gray-400 font-bold mt-0.5">예약 상태 실시간 푸시</p></div>
                </div>
                <button className="text-campus-green transition-transform active:scale-90">{settings.inAppNotifications ? <ToggleRight size={48} /> : <ToggleLeft size={48} className="text-gray-300" />}</button>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="w-full py-6 bg-campus-green text-white rounded-3xl font-black text-xl shadow-xl hover:bg-green-800 transition-all flex items-center justify-center space-x-2">
                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <><Save size={24} /><span>설정 저장</span></>}
            </button>
        </div>
    </div>
  );
};

const AdminAnnouncementForm = ({ onSaved }: { onSaved: () => void }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isImportant, setIsImportant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSaving(true);
    const ann: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      content,
      date: formatDate(new Date()),
      isImportant
    };
    await CloudService.saveAnnouncement(ann);
    setTitle('');
    setContent('');
    setIsImportant(false);
    setIsSaving(false);
    onSaved();
    alert('공지사항이 게시되었습니다.');
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 space-y-6 animate-in slide-in-from-right-4">
      <div className="flex items-center space-x-3 text-campus-green">
        <Megaphone size={24} />
        <h3 className="text-xl font-black tracking-tight">새 공지사항 작성</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          required 
          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none rounded-2xl font-bold text-gray-900 shadow-sm transition-all" 
          placeholder="공지 제목" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
        />
        <textarea 
          required 
          className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none rounded-2xl font-bold text-gray-900 shadow-sm h-32 resize-none transition-all" 
          placeholder="내용을 입력하세요" 
          value={content} 
          onChange={e => setContent(e.target.value)} 
        />
        <div className="flex items-center justify-between px-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              className="w-5 h-5 accent-campus-green rounded" 
              checked={isImportant} 
              onChange={e => setIsImportant(e.target.checked)} 
            />
            <span className="text-sm font-black text-gray-400 group-hover:text-orange-500 transition-colors">중요 공지로 표시</span>
          </label>
          <button 
            type="submit" 
            disabled={isSaving} 
            className="px-8 py-4 bg-campus-green text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center space-x-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /><span>게시하기</span></>}
          </button>
        </div>
      </form>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminView, setAdminView] = useState<'reservations' | 'announcements'>('reservations');

  const loadData = async () => {
    setIsLoading(true);
    try {
        const [resData, annData] = await Promise.all([
          CloudService.getReservations(),
          CloudService.getAnnouncements()
        ]);
        setReservations(resData);
        setAnnouncements(annData);
    } catch (e) {
        console.error("Failed to load data");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const refreshData = () => {
    loadData();
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
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} unreadCount={reservations.filter(r => r.status === 'pending').length} />
      
      <main className="flex-1 md:ml-64 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <LoadingState />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardView reservations={reservations} spaces={SPACES} announcements={announcements} onReserveClick={() => setActiveTab('spaces')} />}
              
              {activeTab === 'spaces' && (
                <div className="animate-in fade-in duration-500 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {SPACES.map(space => (
                        <div key={space.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all group">
                            <div className="relative h-60 overflow-hidden">
                                <img src={space.imageUrl} alt={space.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                <div className="absolute top-4 left-4"><span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black text-campus-green shadow-sm">{space.category.toUpperCase()}</span></div>
                            </div>
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-4"><h3 className="text-2xl font-black text-gray-800">{space.name}</h3><div className="flex items-center text-gray-400 font-bold"><Users size={16} className="mr-2" /><span>{space.capacity}인</span></div></div>
                                <p className="text-gray-500 text-sm mb-6 font-medium leading-relaxed">{space.description}</p>
                                <button onClick={() => setSelectedSpace(space)} className="w-full py-4 bg-gray-50 text-campus-green font-black rounded-2xl hover:bg-campus-green hover:text-white transition-all flex items-center justify-center space-x-2"><span>지금 예약하기</span><ChevronRight size={18} /></button>
                            </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reservations' && (
                <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <h2 className="text-3xl font-black text-gray-800">예약 현황</h2>
                    {reservations.length > 0 ? (
                        reservations.sort((a,b) => b.createdAt - a.createdAt).map(res => (
                            <div key={res.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between group hover:border-campus-green transition-colors">
                                <div className="flex items-center space-x-6">
                                    <div className={`p-4 rounded-2xl ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {res.status === 'confirmed' ? <CheckCircle2 size={24} /> : res.status === 'cancelled' ? <XCircle size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-gray-800">{SPACES.find(s => s.id === res.spaceId)?.name}</h4>
                                        <p className="text-sm text-gray-400 font-bold">{res.date} | {res.startTime} - {res.endTime}</p>
                                    </div>
                                </div>
                                <div className={`px-5 py-2 rounded-full text-xs font-black ${res.status === 'confirmed' ? 'bg-green-600 text-white' : res.status === 'cancelled' ? 'bg-red-600 text-white' : 'bg-yellow-500 text-white'}`}>
                                    {res.status === 'confirmed' ? '승인완료' : res.status === 'cancelled' ? '반려됨' : '대기중'}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-20 text-center text-gray-300 font-bold">표시할 예약이 없습니다.</div>
                    )}
                </div>
              )}

              {activeTab === 'ai-chat' && <AIChatView />}
              
              {activeTab === 'settings' && <SettingsView />}

              {activeTab === 'admin' && (
                <div className="max-w-4xl mx-auto space-y-8">
                    {!isAdminAuthenticated ? (
                        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-50 text-center animate-in zoom-in-95 duration-500 mt-10">
                            <div className="w-20 h-20 bg-green-50 text-campus-green rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"><Lock size={40} /></div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">관리자 로그인</h2>
                            <p className="text-gray-400 text-sm mb-8 font-bold">서버 권한 확인이 필요합니다 (Pass: 1225)</p>
                            <form onSubmit={handleAdminAuth} className="space-y-6">
                                <input type="password" name="adminPassword" className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white rounded-3xl outline-none text-center text-5xl font-black text-gray-900 tracking-widest transition-all shadow-inner" placeholder="••••" value={adminPasswordInput} onChange={e => setAdminPasswordInput(e.target.value)} autoFocus />
                                <button type="submit" className="w-full bg-campus-green text-white py-5 rounded-3xl font-black text-lg shadow-xl hover:bg-green-800 hover:scale-[1.02] transition-all">접속하기</button>
                            </form>
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500 space-y-8">
                            <div className="flex items-center justify-between">
                              <div className="flex space-x-4">
                                <button 
                                  onClick={() => setAdminView('reservations')} 
                                  className={`px-6 py-3 rounded-2xl font-black transition-all ${adminView === 'reservations' ? 'bg-campus-green text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                  예약 관리
                                </button>
                                <button 
                                  onClick={() => setAdminView('announcements')} 
                                  className={`px-6 py-3 rounded-2xl font-black transition-all ${adminView === 'announcements' ? 'bg-campus-green text-white shadow-lg' : 'bg-white text-gray-400 hover:bg-gray-50'}`}
                                >
                                  공지사항 작성
                                </button>
                              </div>
                              <button onClick={() => setIsAdminAuthenticated(false)} className="text-xs font-black text-red-500 px-4 py-2 hover:bg-red-50 rounded-xl transition-all">로그아웃</button>
                            </div>

                            {adminView === 'reservations' ? (
                              <div className="grid grid-cols-1 gap-4">
                                  {reservations.filter(r => r.status === 'pending').map(res => (
                                      <div key={res.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-xl transition-all">
                                          <div className="space-y-2">
                                              <div className="flex items-center space-x-3 mb-1"><h4 className="font-black text-xl text-gray-800">{res.userName}</h4><span className="text-xs font-bold text-campus-green bg-green-50 px-3 py-1 rounded-full">{SPACES.find(s => s.id === res.spaceId)?.name}</span></div>
                                              <p className="text-sm text-gray-400 font-bold">{res.date} | {res.startTime} - {res.endTime}</p>
                                              <div className="p-4 bg-gray-50 rounded-2xl text-sm text-gray-600 font-medium leading-relaxed italic border border-gray-100">"{res.purpose}"</div>
                                          </div>
                                          <div className="flex flex-col space-y-2">
                                              <button onClick={async () => { await CloudService.updateStatus(res.id, 'confirmed'); refreshData(); }} className="px-6 py-4 bg-green-600 text-white rounded-2xl font-black hover:bg-green-700 shadow-md flex items-center space-x-2 transition-all active:scale-95"><ThumbsUp size={18} /><span>승인</span></button>
                                              <button onClick={async () => { await CloudService.updateStatus(res.id, 'cancelled'); refreshData(); }} className="px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-black hover:bg-red-100 flex items-center space-x-2 transition-all active:scale-95"><ThumbsDown size={18} /><span>반려</span></button>
                                          </div>
                                      </div>
                                  ))}
                                  {reservations.filter(r => r.status === 'pending').length === 0 && (
                                      <div className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-gray-200 text-gray-300 font-black uppercase tracking-[0.2em] animate-pulse">All Tasks Completed</div>
                                  )}
                              </div>
                            ) : (
                              <AdminAnnouncementForm onSaved={refreshData} />
                            )}
                        </div>
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {selectedSpace && <ReservationModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onReserved={refreshData} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
