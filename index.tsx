
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
  Settings as SettingsIcon,
  Mail,
  ToggleLeft,
  ToggleRight,
  Save,
  Cloud,
  Calendar
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

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
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

/**
 * FullCalendarView Component
 * Displays reservations in Month, Week, or Day format.
 */
const FullCalendarView = ({ reservations }: { reservations: Reservation[] }) => {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  const navigateDate = (amount: number) => {
    const newDate = new Date(currentDate);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + amount);
    if (view === 'week') newDate.setDate(newDate.getDate() + amount * 7);
    if (view === 'day') newDate.setDate(newDate.getDate() + amount);
    setCurrentDate(newDate);
  };

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const monthLabel = currentDate.toLocaleString('ko-KR', { year: 'numeric', month: 'long' });
  const dayLabel = currentDate.toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });

  // Month View Logic
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Fill previous month days
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`prev-${i}`} className="h-32 border-b border-r border-gray-100 bg-gray-50/50" />);
    }

    // Fill current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(new Date(year, month, d));
      const dailyReservations = reservations.filter(r => r.date === dateStr);
      const isToday = formatDate(new Date()) === dateStr;

      days.push(
        <div key={d} className={`h-32 border-b border-r border-gray-100 p-2 overflow-hidden hover:bg-green-50/20 transition-colors ${isToday ? 'bg-green-50/10' : ''}`}>
          <div className={`text-xs font-black mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-campus-green text-white shadow-lg' : 'text-gray-400'}`}>
            {d}
          </div>
          <div className="space-y-1">
            {dailyReservations.map(res => (
              <div key={res.id} className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold truncate ${getStatusColor(res.status)}`}>
                {res.startTime} {SPACES.find(s => s.id === res.spaceId)?.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-100">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 border-l border-gray-100">
          {days}
        </div>
      </div>
    );
  };

  // Week/Day View Logic
  const renderTimeGrid = (numDays: number) => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 9); // 9 AM to 10 PM
    const weekStart = new Date(currentDate);
    if (numDays === 7) {
      weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    }

    return (
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50/80">
          <div className="w-20 border-r border-gray-100"></div>
          {Array.from({ length: numDays }).map((_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const isToday = formatDate(new Date()) === formatDate(date);
            return (
              <div key={i} className="flex-1 py-4 text-center border-r border-gray-100 last:border-r-0">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{date.toLocaleString('ko-KR', { weekday: 'short' })}</p>
                <p className={`text-sm font-black ${isToday ? 'text-campus-green' : 'text-gray-800'}`}>{date.getDate()}</p>
              </div>
            );
          })}
        </div>
        <div className="flex h-[600px] overflow-y-auto">
          <div className="w-20 border-r border-gray-100 bg-gray-50/30">
            {hours.map(h => (
              <div key={h} className="h-16 border-b border-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400">
                {h}:00
              </div>
            ))}
          </div>
          <div className="flex-1 flex">
            {Array.from({ length: numDays }).map((_, i) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + i);
              const dateStr = formatDate(date);
              const dailyRes = reservations.filter(r => r.date === dateStr);

              return (
                <div key={i} className="flex-1 relative border-r border-gray-50 last:border-r-0">
                  {hours.map(h => (
                    <div key={h} className="h-16 border-b border-gray-50" />
                  ))}
                  {dailyRes.map(res => {
                    const startMins = timeToMinutes(res.startTime);
                    const endMins = timeToMinutes(res.endTime);
                    const top = ((startMins - 9 * 60) / 60) * 64; // 1h = 64px (h-16)
                    const height = ((endMins - startMins) / 60) * 64;
                    if (top < 0) return null; // Outside display range
                    return (
                      <div 
                        key={res.id} 
                        className={`absolute left-1 right-1 rounded-xl p-2 shadow-lg border-l-4 border-white/20 z-10 overflow-hidden ${getStatusColor(res.status)}`}
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <p className="text-[9px] font-black opacity-80 uppercase leading-none mb-1">{res.startTime}-{res.endTime}</p>
                        <p className="text-[10px] font-black leading-tight line-clamp-1">{res.userName}</p>
                        <p className="text-[8px] font-bold opacity-70 truncate">{SPACES.find(s => s.id === res.spaceId)?.name}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ChevronLeft size={20} className="text-gray-400" /></button>
          <h3 className="text-sm font-black text-gray-800 min-w-[120px] text-center">{view === 'month' ? monthLabel : dayLabel}</h3>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-gray-100 rounded-xl transition-all"><ChevronRight size={20} className="text-gray-400" /></button>
          <div className="w-px h-6 bg-gray-100 mx-2" />
          <button onClick={() => setCurrentDate(new Date())} className="text-[10px] font-black text-campus-green px-3 py-1.5 hover:bg-green-50 rounded-lg uppercase tracking-tighter">Today</button>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-2xl self-start">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v as any)}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                view === v ? 'bg-white text-campus-green shadow-md' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {v.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' ? renderMonthView() : renderTimeGrid(view === 'week' ? 7 : 1)}

      <div className="flex items-center space-x-6 px-4 py-3 bg-white/50 rounded-2xl border border-dashed border-gray-200">
        <span className="text-[10px] font-black text-gray-400 uppercase">Legend:</span>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-green-500 rounded-full" /><span className="text-[10px] font-bold text-gray-500">Confirmed</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-yellow-500 rounded-full" /><span className="text-[10px] font-bold text-gray-500">Pending</span></div>
        <div className="flex items-center space-x-2"><div className="w-3 h-3 bg-red-500 rounded-full" /><span className="text-[10px] font-bold text-gray-500">Cancelled</span></div>
      </div>
    </div>
  );
};

const Dashboard = ({ reservations, spaces, onReserveClick }: { reservations: Reservation[], spaces: Space[], onReserveClick: () => void }) => {
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

const AIChat = () => {
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

const Settings = () => {
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
                    <div><h4 className="font-black text-gray-