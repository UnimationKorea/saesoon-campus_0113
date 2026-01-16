
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
  FileText,
  ArrowRight,
  Heart,
  Sparkles,
  Church,
  Home,
  Check,
  Ban,
  Filter,
  Baby,
  Dribbble,
  BookOpen,
  Coffee,
  Sun,
  Layout,
  CalendarDays as CalendarDaysIcon,
  History
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
  category: 'parenting' | 'activity' | 'edu' | 'meeting' | 'rest' | 'cafe';
  icon: React.ElementType;
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

interface UserSettings {
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

const SPACES: Space[] = [
  {
    id: 'kids-nuri',
    name: '키즈누리 (1층)',
    description: '지역사회와 함께하는 공동육아 및 아이들을 위한 창의적인 배움 공간입니다.',
    capacity: 15,
    facilities: ['놀이 매트', '아동 도서', '안전 울타리', '공기청정기'],
    category: 'parenting',
    icon: Baby,
    imageUrl: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'vision-nuri',
    name: '비전누리 (지하)',
    description: '주민들의 다양한 동아리 활동과 문화적 소통이 이루어지는 창의 마당입니다.',
    capacity: 30,
    facilities: ['음향 장비', '빔 프로젝터', '전신 거울', '방음 시설'],
    category: 'activity',
    icon: Dribbble,
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb28f74b671?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'edu-room',
    name: '강의실 (1, 2층)',
    description: '디지털 정보화 강좌, 웰니스 건강 강좌, 인문학 클래스가 열리는 배움터입니다.',
    capacity: 40,
    facilities: ['전자칠판', '강연대', '노트북 충전함', '화이트보드'],
    category: 'edu',
    icon: BookOpen,
    imageUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'small-group',
    name: '소그룹실 (2층)',
    description: '총 6개의 독립된 공간에서 소규모 모임, 상담, 스터디를 진행할 수 있습니다.',
    capacity: 6,
    facilities: ['개별 냉난방', '모니터링 월', '방음 도어'],
    category: 'meeting',
    icon: Users,
    imageUrl: 'https://images.unsplash.com/photo-1577412647305-991150c7d163?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'rooftop-rest',
    name: '루프탑 휴게공간 (옥상)',
    description: '도심 속에서 자연을 느끼며 치유와 휴식을 취할 수 있는 열린 옥상 정원입니다.',
    capacity: 20,
    facilities: ['야외 벤치', '파라솔', '포토존', '야간 조명'],
    category: 'rest',
    icon: Sun,
    imageUrl: 'https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'saesoon-lounge',
    name: '새순라운지 (1층)',
    description: '카페 형식의 소통 공간으로 주민 누구나 자유롭게 대화하고 협력할 수 있습니다.',
    capacity: 25,
    facilities: ['에스프레소 머신', '바 테이블', '무선 충전기', '정수기'],
    category: 'cafe',
    icon: Coffee,
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800'
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

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// --- Simulated Cloud Service ---
const CloudService = {
  delay: () => new Promise(resolve => setTimeout(resolve, 600)),

  getReservations: async (): Promise<Reservation[]> => {
    await CloudService.delay();
    const data = localStorage.getItem('ieumnuri_reservations');
    const reservations: Reservation[] = data ? JSON.parse(data) : [];
    return reservations.sort((a, b) => b.createdAt - a.createdAt);
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
    const updated = all.map(r => r.id === id ? { ...r, status } : r);
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

// --- Upgraded Reservation Modal ---

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

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const START_HOUR = 9;
  const END_HOUR = 21;

  useEffect(() => {
    const fetchConflicts = async () => {
      const all = await CloudService.getReservations();
      // 유저의 중복 예약 여부 체크 (당일 기준)
      const userRes = all.filter(r => 
        r.userName.trim() !== '' && 
        r.userName === formData.userName && 
        r.date === formData.date && 
        r.status !== 'cancelled'
      );
      setIsRepeatUser(userRes.length > 0);
      
      const confirmed = all.filter(r => r.spaceId === space.id && r.date === formData.date && r.status === 'confirmed');
      setExistingReservations(confirmed);
    };
    fetchConflicts();
  }, [formData.date, formData.userName, space.id]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const getSlotStatus = (time: string) => {
    const tMin = timeToMinutes(time);
    const isBooked = existingReservations.some(res => {
      const resStart = timeToMinutes(res.startTime);
      const resEnd = timeToMinutes(res.endTime);
      return tMin >= resStart && tMin < resEnd;
    });
    if (isBooked) return 'booked';

    const selectedStart = timeToMinutes(formData.startTime);
    const selectedEnd = timeToMinutes(formData.endTime);
    if (tMin >= selectedStart && tMin < selectedEnd) return 'selected';

    return 'available';
  };

  const handleDayClick = (day: number) => {
    const selectedDate = new Date(currentYear, currentMonth, day);
    if (selectedDate < new Date(new Date().setHours(0,0,0,0))) return;
    setFormData({ ...formData, date: formatDate(selectedDate) });
  };

  const handleSlotClick = (time: string) => {
    const tMin = timeToMinutes(time);
    if (getSlotStatus(time) === 'booked') return;

    // 최소 예약 시간: 1시간, 첫 방문 예약 시 최대 2시간 권장
    const duration = isRepeatUser ? 60 : 120;
    let endMin = tMin + duration;

    // 예약 가능 범위 체크 (중복 예약 방지)
    const nextBooking = existingReservations
      .map(r => timeToMinutes(r.startTime))
      .filter(start => start > tMin)
      .sort((a, b) => a - b)[0];

    if (nextBooking && endMin > nextBooking) {
      endMin = nextBooking;
    }

    // 마감 시간 체크
    endMin = Math.min(endMin, END_HOUR * 60);

    // 최소 1시간 예약 룰 체크 (버튼 클릭 시 자동으로 조절)
    if (endMin - tMin < 60) {
      setError("이후 예약으로 인해 최소 예약 시간(1시간) 확보가 불가능한 슬롯입니다.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setFormData({ ...formData, startTime: time, endTime: minutesToTime(endMin) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName.trim()) { setError('성함 또는 단체명을 입력하세요.'); return; }
    if (!formData.purpose.trim()) { setError('사용 목적을 입력하세요.'); return; }
    
    setIsSubmitting(true);
    try {
      await CloudService.saveReservation({
        id: Math.random().toString(36).substr(2, 9),
        spaceId: space.id,
        userName: formData.userName,
        purpose: formData.purpose,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: 'pending',
        createdAt: Date.now()
      });
      onReserved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const durationText = useMemo(() => {
    const start = timeToMinutes(formData.startTime);
    const end = timeToMinutes(formData.endTime);
    const diff = end - start;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h > 0 ? h + '시간 ' : ''}${m > 0 ? m + '분' : ''}`;
  }, [formData.startTime, formData.endTime]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-[3.5rem] w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col md:flex-row h-full max-h-[92vh]">
        
        {/* Left: Interactive Calendar */}
        <div className="w-full md:w-[40%] bg-campus-green p-8 text-white flex flex-col">
          <div className="mb-8 flex items-center justify-between">
             <div className="flex items-center space-x-3">
               <div className="p-2.5 bg-white/10 rounded-2xl"><CalendarIcon size={20} /></div>
               <h2 className="text-xl font-black">날짜 선택</h2>
             </div>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold tracking-tight">{currentYear}년 {monthNames[currentMonth]}</h3>
              <div className="flex space-x-1">
                <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={18} /></button>
                <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); }} className="p-1.5 hover:bg-white/10 rounded-full transition-colors"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2 opacity-40 text-[9px] font-black uppercase tracking-widest">
              {['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(new Date(currentYear, currentMonth, day));
                const isSelected = formData.date === dateStr;
                const isPast = new Date(currentYear, currentMonth, day) < new Date(new Date().setHours(0,0,0,0));
                
                return (
                  <button key={day} disabled={isPast} onClick={() => handleDayClick(day)}
                    className={`h-9 w-9 md:h-11 md:w-11 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                      isSelected ? 'bg-white text-campus-green shadow-xl scale-110' : 
                      isPast ? 'opacity-10 cursor-not-allowed' : 'hover:bg-white/10'
                    }`}>{day}</button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 p-5 bg-white/10 rounded-3xl border border-white/10 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl"><space.icon size={18} /></div>
              <p className="font-bold">{space.name}</p>
            </div>
            <p className="text-[11px] opacity-60 font-medium leading-relaxed">{space.description}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              {space.facilities.map(f => <span key={f} className="text-[9px] font-black bg-white/5 px-2 py-0.5 rounded-md border border-white/10">{f}</span>)}
            </div>
          </div>
        </div>

        {/* Right: Smart Time Slots & Form */}
        <div className="flex-1 bg-white p-8 flex flex-col overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
               <div className="p-3 bg-gray-50 text-campus-green rounded-2xl"><Clock size={24} /></div>
               <div>
                  <h3 className="text-xl font-black text-gray-800 tracking-tight">시간 및 정보 입력</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{formData.date} - 동네배움터 스마트 예약</p>
               </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-400"><X size={24} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 flex-1">
            {/* Time Slot Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black text-campus-green uppercase tracking-widest">Time Slots</span>
                  <div className="flex items-center space-x-2 text-[9px] font-bold text-gray-400 ml-4">
                    <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-sm bg-gray-100 border border-gray-200"></div><span>가능</span></div>
                    <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-sm bg-campus-green"></div><span>선택됨</span></div>
                    <div className="flex items-center space-x-1"><div className="w-2 h-2 rounded-sm bg-gray-200"></div><span>예약됨</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 p-1 bg-gray-50/50 rounded-2xl border border-gray-100">
                {timeSlots.map(time => {
                  const status = getSlotStatus(time);
                  return (
                    <button key={time} type="button" disabled={status === 'booked'} onClick={() => handleSlotClick(time)}
                      className={`relative py-3 rounded-xl text-[10px] font-black transition-all border-2 flex flex-col items-center justify-center overflow-hidden ${
                        status === 'selected' ? 'bg-campus-green text-white border-campus-green shadow-md scale-[0.98]' :
                        status === 'booked' ? 'bg-gray-200/50 text-gray-400 border-transparent cursor-not-allowed opacity-40' :
                        'bg-white text-gray-600 border-white hover:border-campus-green hover:text-campus-green'
                      }`}>
                      {status === 'booked' && <div className="absolute inset-0 flex items-center justify-center rotate-12 opacity-10 font-black text-xs">BOOKED</div>}
                      {time}
                    </button>
                  );
                })}
              </div>

              <div className="bg-campus-green/[0.03] p-5 rounded-3xl flex items-center justify-between border border-campus-green/10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none"><History size={64} className="text-campus-green" /></div>
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-campus-green"><Timer size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black text-campus-green uppercase tracking-widest mb-0.5">Selected Duration</p>
                    <h4 className="text-lg font-black text-gray-800">{formData.startTime} ~ {formData.endTime} <span className="text-campus-green font-bold ml-1">({durationText})</span></h4>
                  </div>
                </div>
                {isRepeatUser ? (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black mb-1 uppercase tracking-tight">Repeat User</span>
                    <span className="text-[8px] text-gray-400 font-bold">1시간 단위 예약</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black mb-1 uppercase tracking-tight">New User</span>
                    <span className="text-[8px] text-gray-400 font-bold">기본 2시간 예약</span>
                  </div>
                )}
              </div>
            </div>

            {/* Information Inputs */}
            <div className="space-y-5">
              <div className="relative group">
                <div className="absolute top-1/2 -translate-y-1/2 left-5 text-gray-300 group-focus-within:text-campus-green transition-colors"><User size={18} /></div>
                <input required className="w-full pl-12 pr-5 py-4.5 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none rounded-2xl font-bold transition-all shadow-sm text-sm" placeholder="성함 또는 단체명" value={formData.userName} onChange={e => setFormData({...formData, userName: e.target.value})} />
              </div>
              <div className="relative group">
                <div className="absolute top-6 left-5 text-gray-300 group-focus-within:text-campus-green transition-colors"><FileText size={18} /></div>
                <textarea required className="w-full pl-12 pr-5 py-5 bg-gray-50 border-2 border-transparent focus:border-campus-green focus:bg-white outline-none h-28 resize-none rounded-2xl font-bold transition-all shadow-sm text-sm leading-relaxed" placeholder="사용 목적 (예: 디지털 행정 강좌 스터디 모임)" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-black flex items-center space-x-2 animate-in slide-in-from-top-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-campus-green text-white py-5 rounded-3xl font-black text-lg shadow-2xl shadow-green-900/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center space-x-4">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><span>예약 신청서 제출</span><Send size={18} /></>}
            </button>
            <p className="text-center text-[10px] text-gray-300 font-medium">관리자 확인 후 승인 완료 알림이 발송됩니다.</p>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- Dashboard & Other Views remain mostly the same ---

const DashboardView = ({ reservations, spaces, onReserveClick }: { reservations: Reservation[], spaces: Space[], onReserveClick: () => void }) => {
  const pendingCount = reservations.filter(r => r.status === 'pending').length;
  const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;

  return (
    <div className="animate-in fade-in duration-500 space-y-10">
      <header className="space-y-3">
        <h2 className="text-4xl font-black text-gray-800 tracking-tight leading-tight">주민과 함께 숨쉬는<br/><span className="text-campus-green">이음누리 동네배움터</span>입니다.</h2>
        <p className="text-gray-400 font-bold max-w-2xl leading-relaxed">새순은 지자체와 협력하여 주민들의 소통과 학습, 그리고 치유의 필요를 돌보는 디지털 스마트 복지 마당을 실천합니다.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><Clock size={24} /></div>
          <div><p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">진행 중인 신청</p><h3 className="text-3xl font-black text-gray-800">{pendingCount}건</h3></div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between group hover:shadow-md transition-all">
          <div className="w-12 h-12 bg-green-50 text-campus-green rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><CheckCircle2 size={24} /></div>
          <div><p className="text-gray-400 font-bold text-[10px] uppercase mb-1 tracking-widest">승인된 예약</p><h3 className="text-3xl font-black text-gray-800">{confirmedCount}건</h3></div>
        </div>
        <button onClick={onReserveClick} className="bg-campus-green p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col justify-between group hover:scale-[1.02] transition-all overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-125 transition-transform"><CalendarIcon size={120} /></div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors relative z-10"><PlusCircle size={24} /></div>
          <div className="text-left relative z-10"><p className="text-green-100/70 font-bold text-[10px] uppercase mb-1 tracking-widest">Quick Access</p><h3 className="text-2xl font-black">공간 예약하기</h3></div>
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-800 flex items-center space-x-2"><Sparkles size={20} className="text-campus-green" /><span>배움과 치유의 공간</span></h3>
          <button onClick={onReserveClick} className="text-sm font-black text-campus-green flex items-center space-x-1 hover:underline"><span>모든 공간 보기</span><ChevronRight size={14} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {spaces.slice(0, 3).map(space => (
            <div key={space.id} className="relative h-72 rounded-[2.5rem] overflow-hidden group cursor-pointer shadow-lg border border-gray-100" onClick={onReserveClick}>
              <img src={space.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={space.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent p-6 flex flex-col justify-end">
                <div className="mb-2 flex items-center space-x-2">
                   <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-white uppercase">{space.category}</span>
                   <space.icon size={14} className="text-white/60" />
                </div>
                <h4 className="text-white font-black text-xl mb-1 tracking-tight">{space.name}</h4>
                <p className="text-white/60 text-[11px] font-medium line-clamp-2 leading-relaxed">{space.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Admin View ---

const AdminView = ({ reservations, onUpdateStatus }: { reservations: Reservation[], onUpdateStatus: (id: string, status: Reservation['status']) => void }) => {
  const [filter, setFilter] = useState<Reservation['status'] | 'all'>('all');
  const filtered = reservations.filter(r => filter === 'all' ? true : r.status === filter);

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h2 className="text-3xl font-black text-gray-800 tracking-tight">관리자 관제 센터</h2><p className="text-gray-400 font-bold">주민들의 예약 신청을 검토하고 스마트하게 관리합니다.</p></div>
        <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${filter === f ? 'bg-campus-green text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}>{f === 'all' ? '전체' : f === 'pending' ? '대기' : f === 'confirmed' ? '승인' : '반려'}</button>
          ))}
        </div>
      </header>
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-8 py-5 text-[10px] font-black text-campus-green uppercase tracking-widest">신청자/기관</th>
                <th className="px-8 py-5 text-[10px] font-black text-campus-green uppercase tracking-widest">공간</th>
                <th className="px-8 py-5 text-[10px] font-black text-campus-green uppercase tracking-widest">일시</th>
                <th className="px-8 py-5 text-[10px] font-black text-campus-green uppercase tracking-widest text-right">상태 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(res => (
                <tr key={res.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-gray-800">{res.userName}</p>
                    <p className="text-xs text-gray-400 font-medium truncate max-w-[200px]">{res.purpose}</p>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-gray-600">{SPACES.find(s => s.id === res.spaceId)?.name}</td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-bold text-gray-800">{res.date}</p>
                    <p className="text-xs text-gray-400 font-medium">{res.startTime} - {res.endTime}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end items-center space-x-2">
                       {res.status === 'pending' ? (
                         <>
                           <button onClick={() => onUpdateStatus(res.id, 'confirmed')} className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"><Check size={18} /></button>
                           <button onClick={() => onUpdateStatus(res.id, 'cancelled')} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"><Ban size={18} /></button>
                         </>
                       ) : (
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{res.status}</span>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-20 text-center text-gray-300 font-black">관리할 내역이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
};

// --- AI Chat View ---

const AIChatView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: '안녕하세요! 새순이음누리 캠퍼스 스마트 매니저입니다. 동네배움터 강좌 안내나 공간 예약에 대해 궁금한 점을 말씀해주세요.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const userMsg = input; setInput(''); setMessages(m => [...m, { role: 'user', text: userMsg }]); setIsTyping(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const res = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: userMsg, 
        config: { 
          systemInstruction: "당신은 새순이음누리 캠퍼스의 AI 매니저입니다. 이곳은 구청과 협력하여 주민들에게 정보화, 건강, 인문학 강좌를 제공하는 '동네배움터'입니다. 공간(키즈누리, 비전누리, 강의실, 소그룹실, 루프탑, 새순라운지)에 대해 친절하게 안내하세요." 
        } 
      });
      setMessages(m => [...m, { role: 'model', text: res.text || "죄송합니다. 오류가 발생했습니다." }]);
    } catch { setMessages(m => [...m, { role: 'model', text: "네트워크 연결이 불안정합니다." }]); } finally { setIsTyping(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-8 border-b border-gray-50 flex items-center space-x-4 bg-green-50/20">
        <div className="w-12 h-12 bg-campus-green text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-200/50"><MessageSquare size={24} /></div>
        <div>
          <h3 className="font-black text-gray-800 text-lg">AI 스마트 상담사</h3>
          <p className="text-[10px] text-campus-green font-black flex items-center space-x-1.5 uppercase tracking-widest"><span className="w-2 h-2 bg-campus-green rounded-full animate-ping"></span><span>Assistant Ready</span></p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {messages.map((m, i) => <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] px-6 py-4 rounded-[2rem] text-sm font-bold shadow-sm ${m.role === 'user' ? 'bg-campus-green text-white rounded-tr-none' : 'bg-gray-50 text-gray-700 rounded-tl-none border border-gray-100'}`}>{m.text}</div></div>)}
        {isTyping && <div className="text-xs font-black text-gray-300 animate-pulse tracking-widest uppercase">AI Agent Thinking...</div>}
      </div>
      <form onSubmit={handleSend} className="p-6 bg-white border-t border-gray-50 flex items-center space-x-4">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="강좌 일정이나 시설 정보를 물어보세요" className="flex-1 px-6 py-5 bg-gray-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-campus-green transition-all shadow-inner" />
        <button type="submit" className="p-5 bg-campus-green text-white rounded-2xl shadow-xl hover:bg-green-800 transition-all"><Send size={24} /></button>
      </form>
    </div>
  );
};

// --- Welcome & Intro Views ---

// Fix: Added missing SplashView component to show brand loading screen
const SplashView = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-campus-green flex flex-col items-center justify-center text-white z-[100] animate-in fade-in duration-1000">
      <div className="p-8 bg-white/10 backdrop-blur-xl rounded-[3rem] border border-white/20 shadow-2xl mb-10 animate-bounce">
        <Church size={80} strokeWidth={1.5} />
      </div>
      <h1 className="text-5xl font-black italic tracking-tighter mb-4 scale-in-95 duration-700">이음누리</h1>
      <div className="flex flex-col items-center space-y-2">
        <p className="text-xs text-green-200 uppercase tracking-[0.4em] font-black animate-pulse">Saesoon Campus</p>
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4">
           <div className="h-full bg-white animate-progress"></div>
        </div>
      </div>
    </div>
  );
};

// Fix: Added missing IntroView component to provide context to users
const IntroView = ({ onEnter }: { onEnter: () => void }) => {
  return (
    <div className="fixed inset-0 bg-[#FDFBF7] flex items-center justify-center p-8 z-[90] animate-in slide-in-from-right-full duration-700">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-16 items-center">
        <div className="space-y-10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-campus-green text-white rounded-2xl shadow-xl"><Church size={36} /></div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-campus-green">이음누리</h1>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Connect & Care Campus</p>
            </div>
          </div>
          <div className="space-y-6">
            <h2 className="text-6xl font-black text-gray-800 leading-[1.05] tracking-tight">당신의 일상을<br/><span className="text-campus-green underline decoration-green-100 underline-offset-8">이음</span>으로 채우는<br/>스마트 배움터.</h2>
            <p className="text-gray-400 font-bold leading-relaxed max-w-lg text-xl">
              디지털 정보화부터 웰니스 건강까지, <br/>
              주민 누구나 함께 배우고 소통하는 <br/>
              지속 가능한 스마트 복지 마당입니다.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={onEnter} className="flex items-center justify-center space-x-4 bg-campus-green text-white px-12 py-6 rounded-3xl font-black text-2xl shadow-2xl shadow-green-900/20 hover:scale-105 active:scale-95 transition-all group">
              <span>캠퍼스 입장하기</span>
              <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" />
            </button>
          </div>
        </div>
        <div className="hidden lg:block relative">
           <div className="aspect-[4/5] rounded-[5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rotate-2 border-[12px] border-white relative z-10">
             <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover" alt="Community Space" />
           </div>
           <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-[2.5rem] shadow-2xl flex items-center space-x-6 -rotate-3 border border-gray-100 z-20">
             <div className="p-4 bg-orange-50 text-orange-500 rounded-3xl shadow-inner"><Sparkles size={32} /></div>
             <div>
               <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Empowering</p>
               <p className="text-xl font-black text-gray-800 tracking-tight">새로운 배움의 시작</p>
             </div>
           </div>
           <div className="absolute top-10 -right-10 w-48 h-48 bg-campus-green/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  const [viewStatus, setViewStatus] = useState<'splash' | 'intro' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    const data = await CloudService.getReservations();
    setReservations(data);
    setIsLoading(false);
  };

  useEffect(() => { if (viewStatus === 'main') loadData(); }, [viewStatus, activeTab]);

  const handleUpdateStatus = async (id: string, status: Reservation['status']) => {
    await CloudService.updateStatus(id, status);
    loadData();
  };

  // Fix: Conditional rendering for Splash and Intro views
  if (viewStatus === 'splash') return <SplashView onComplete={() => setViewStatus('intro')} />;
  if (viewStatus === 'intro') return <IntroView onEnter={() => setViewStatus('main')} />;

  const items = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'spaces', label: '공간 둘러보기', icon: MapPin },
    { id: 'reservations', label: '나의 예약', icon: CalendarIcon },
    { id: 'ai-chat', label: 'AI 상담', icon: MessageSquare },
    { id: 'admin', label: '관리자 센터', icon: ShieldCheck, badge: reservations.filter(r => r.status === 'pending').length },
  ];

  return (
    <div className="min-h-screen flex bg-[#FDFBF7] animate-in fade-in duration-700">
      <aside className="w-64 bg-campus-green text-white h-screen fixed left-0 top-0 p-6 hidden md:block shadow-2xl z-40">
        <div className="mb-10 flex items-center space-x-3"><div className="p-1.5 bg-white rounded-xl text-campus-green shadow-lg shadow-black/10"><Church size={28} /></div><div><h1 className="text-xl font-black italic tracking-tighter">이음누리</h1><p className="text-[8px] text-green-300 uppercase tracking-widest font-black">Saesoon Campus</p></div></div>
        <nav className="space-y-2">
          {items.map(i => (
            <button key={i.id} onClick={() => setActiveTab(i.id)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${activeTab === i.id ? 'bg-white/20 shadow-lg scale-[1.02]' : 'hover:bg-white/10 opacity-70 hover:opacity-100'}`}>
              <div className="flex items-center space-x-3"><i.icon size={18} /><span className="font-bold text-sm">{i.label}</span></div>
              {i.badge && i.badge > 0 ? <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md">{i.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="absolute bottom-10 left-6 right-6 p-6 bg-white/5 rounded-[2rem] border border-white/10 flex flex-col items-center">
           <Heart size={24} className="text-white/20 mb-3" fill="currentColor" />
           <p className="text-[10px] font-black text-center text-white/40 leading-relaxed uppercase tracking-tighter">Community Healing<br/>& Learning Project</p>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 p-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          {isLoading ? <div className="flex flex-col items-center justify-center py-24"><Loader2 className="animate-spin text-campus-green mb-4" size={56} /><p className="font-black text-gray-400 tracking-widest uppercase">Synchronizing Network...</p></div> : (
            <>
              {activeTab === 'dashboard' && <DashboardView reservations={reservations} spaces={SPACES} onReserveClick={() => setActiveTab('spaces')} />}
              {activeTab === 'spaces' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
                  {SPACES.map(s => (
                    <div key={s.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 group hover:shadow-xl transition-all flex flex-col h-full">
                      <div className="h-56 overflow-hidden relative">
                         <img src={s.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={s.name} />
                         <div className="absolute top-4 left-4"><span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-campus-green uppercase">{s.category}</span></div>
                      </div>
                      <div className="p-8 flex-1 flex flex-col justify-between">
                        <div>
                           <div className="flex items-center space-x-3 mb-3">
                              <div className="p-2 bg-gray-50 text-campus-green rounded-lg shadow-sm"><s.icon size={20} /></div>
                              <h3 className="text-2xl font-black text-gray-800 tracking-tight">{s.name}</h3>
                           </div>
                           <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">{s.description}</p>
                        </div>
                        <button onClick={() => setSelectedSpace(s)} className="w-full py-5 bg-gray-50 text-campus-green font-black rounded-2xl hover:bg-campus-green hover:text-white hover:shadow-lg transition-all active:scale-95">공간 예약 신청</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'reservations' && (
                <div className="space-y-6 animate-in fade-in">
                  <header><h2 className="text-3xl font-black text-gray-800">나의 예약 리스트</h2><p className="text-gray-400 font-bold mt-1">이음누리 캠퍼스와 함께하는 당신의 소중한 일정입니다.</p></header>
                  <div className="grid grid-cols-1 gap-4">
                    {reservations.length > 0 ? reservations.map(r => {
                      const sp = SPACES.find(s => s.id === r.spaceId);
                      return (
                        <div key={r.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center space-x-6">
                            <div className={`p-4 rounded-2xl ${r.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                               {sp ? <sp.icon size={28} /> : <CalendarIcon size={28} />}
                            </div>
                            <div>
                              <h4 className="font-black text-xl text-gray-800">{sp?.name || '미지정 공간'}</h4>
                              <p className="text-sm text-gray-400 font-bold">{r.date} | {r.startTime} - {r.endTime}</p>
                            </div>
                          </div>
                          <span className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-sm ${r.status === 'confirmed' ? 'bg-green-600' : r.status === 'cancelled' ? 'bg-red-600' : 'bg-yellow-500'}`}>
                            {r.status === 'confirmed' ? 'Approved' : r.status === 'cancelled' ? 'Declined' : 'Pending'}
                          </span>
                        </div>
                      );
                    }) : <div className="py-24 text-center font-black text-gray-200 text-2xl tracking-tighter">예약된 내역이 발견되지 않았습니다.</div>}
                  </div>
                </div>
              )}
              {activeTab === 'ai-chat' && <AIChatView />}
              {activeTab === 'admin' && <AdminView reservations={reservations} onUpdateStatus={handleUpdateStatus} />}
            </>
          )}
        </div>
      </main>
      {selectedSpace && <ReservationModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onReserved={() => { loadData(); setSelectedSpace(null); setActiveTab('reservations'); }} />}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
