


import React, { useMemo, useState, useEffect } from 'react';
import type { User, Notice, LessonEntry, Reservation, Payment, PriceItem, NotificationItem } from '../../types';
import { daysUntil } from '../../utils/helpers';
import { Card } from '../ui/Card';
import { User as UserIcon, AlertTriangle, BookOpen, DollarSign, TrendingUp, UserX, ChevronLeft, ChevronRight, X, Brain } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';


interface DashboardProps {
  users: User[];
  notices: Notice[];
  lessons: LessonEntry[];
  reservations: Reservation[];
  payments: Payment[];
  prices: PriceItem[];
  unreadPaymentsCount: number;
  onViewTodayRevenue: () => void;
  notifications: NotificationItem[];
  currentUser: User;
  updateCurrentUser: (user: User) => void;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
}

const GolfBallIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="10" r="8" />
    <path d="M12 18v4" />
    <path d="M8 22h8" />
    <path d="M12 6v.01" />
    <path d="M15 8v.01" />
    <path d="M9 8v.01" />
    <path d="M16 11v.01" />
    <path d="M8 11v.01" />
    <path d="M10 14v.01" />
    <path d="M14 14v.01" />
  </svg>
);

const isInstructorOff = (instructor: User, date: Date): boolean => {
    if (!instructor) return true;
    
    // Check for weekly days off
    const dayOfWeek = date.getDay(); // 0 for Sunday, 1 for Monday, etc.
    if (instructor.daysOff?.includes(dayOfWeek)) {
        return true;
    }

    // Check for one-time off days
    const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    if (instructor.oneTimeOff?.includes(dateString)) {
        return true;
    }

    return false;
};

const Dashboard: React.FC<DashboardProps> = ({ users, notices, lessons, reservations, payments, prices, unreadPaymentsCount, onViewTodayRevenue, notifications, currentUser, updateCurrentUser, setNotifications }) => {
  const { showToast } = useToast();
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [activePanel, setActivePanel] = useState<'active' | 'expiring' | 'expired' | 'lessons_history' | 'mental_history' | 'today' | 'month' | 'training_room_history' | null>(null);
  const [dailyFilterType, setDailyFilterType] = useState<'all' | 'lesson' | 'training_room' | 'mental'>('all');
  const [lessonHistoryMode, setLessonHistoryMode] = useState<'all' | 'instructor'>('all');
  const [historyFilter, setHistoryFilter] = useState({ year: '', month: '' });
  const [, setNow] = useState(new Date());

  useEffect(() => {
    // Re-render component every minute to update time-sensitive UI like 'NEW' badges.
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 60000); // 1 minute
  
    return () => clearInterval(intervalId);
  }, []);
  
  const statusMap: { [key in Reservation['status']]: { text: string; className: string } } = {
    scheduled: { text: '예정', className: 'bg-yellow-500/20 text-yellow-300' },
    attended: { text: '출석', className: 'bg-green-500/20 text-green-400' },
    absent: { text: '결석', className: 'bg-red-500/20 text-red-400' },
  };


  const members = users.filter(u => u.role === 'member');
  const activeMembers = members.filter(m => daysUntil(m.membership.end) >= 0);
  const expiringSoonMembers = activeMembers.filter(m => daysUntil(m.membership.end) <= 7);
  const expiredMembers = members.filter(m => daysUntil(m.membership.end) < 0);
  
  const instructors = useMemo(() => users.filter(u => u.role === 'instructor'), [users]);
  const mentalCoaches = useMemo(() => users.filter(u => u.role === 'mental_coach'), [users]);

  const getMemberName = (id: string) => users.find(u => u.id === id)?.name || '알 수 없음';

  const { monthlyLessonsCount, monthlyTrainingRoomCount, monthlyMentalCount } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const monthlyAttended = reservations.filter(r => {
        const resDate = new Date(r.dateTime);
        return r.status === 'attended' &&
               resDate.getFullYear() === currentYear &&
               resDate.getMonth() === currentMonth;
    });
    
    return {
        monthlyLessonsCount: monthlyAttended.filter(r => r.type === 'lesson').length,
        monthlyTrainingRoomCount: monthlyAttended.filter(r => r.type === 'training_room').length,
        monthlyMentalCount: monthlyAttended.filter(r => r.type === 'mental').length
    };
  }, [reservations]);

  // Detailed lesson history with instructor breakdown and 30/50min split
  const detailedLessonsHistory = useMemo(() => {
    const stats: Record<string, { total30: number, total50: number, byInst: Record<string, { count30: number, count50: number }> }> = {};
    const now = new Date();
    // Initialize last 24 months
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        stats[key] = { total30: 0, total50: 0, byInst: {} };
    }

    reservations.forEach(r => {
        if (r.type === 'lesson' && r.status === 'attended') {
            const d = new Date(r.dateTime);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!stats[key]) stats[key] = { total30: 0, total50: 0, byInst: {} }; // Ensure key exists if outside 24 months

            if (r.duration === 30) stats[key].total30++;
            else if (r.duration === 50) stats[key].total50++;

            if (r.instructorId) {
                if (!stats[key].byInst[r.instructorId]) {
                    stats[key].byInst[r.instructorId] = { count30: 0, count50: 0 };
                }
                if (r.duration === 30) stats[key].byInst[r.instructorId].count30++;
                else if (r.duration === 50) stats[key].byInst[r.instructorId].count50++;
            }
        }
    });

    return Object.entries(stats)
        .map(([key, data]) => {
            const [year, month] = key.split('-');
            const instructorStats = Object.entries(data.byInst).map(([instId, counts]) => {
                 const inst = instructors.find(i => i.id === instId);
                 return {
                     id: instId,
                     name: inst?.name || 'Unknown',
                     color: inst?.color || '#9ca3af',
                     count30: counts.count30,
                     count50: counts.count50,
                     total: counts.count30 + counts.count50
                 };
            }).sort((a, b) => b.total - a.total);

            return { 
                year, 
                month, 
                total30: data.total30, 
                total50: data.total50, 
                total: data.total30 + data.total50,
                instructors: instructorStats, 
                key 
            };
        })
        .sort((a, b) => b.key.localeCompare(a.key));
  }, [reservations, instructors]);

  // Mental coaching history
  const mentalHistory = useMemo(() => {
    const stats: Record<string, { total: number, byCoach: Record<string, number> }> = {};
    const now = new Date();
    // Initialize last 24 months
    for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        stats[key] = { total: 0, byCoach: {} };
    }

    reservations.forEach(r => {
        if (r.type === 'mental' && r.status === 'attended') {
            const d = new Date(r.dateTime);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (!stats[key]) stats[key] = { total: 0, byCoach: {} };

            stats[key].total++;

            if (r.instructorId) {
                stats[key].byCoach[r.instructorId] = (stats[key].byCoach[r.instructorId] || 0) + 1;
            }
        }
    });

    return Object.entries(stats)
        .map(([key, data]) => {
            const [year, month] = key.split('-');
            const coachStats = Object.entries(data.byCoach).map(([coachId, count]) => {
                 const coach = mentalCoaches.find(c => c.id === coachId);
                 return {
                     id: coachId,
                     name: coach?.name || 'Unknown',
                     color: coach?.color || '#ec4899',
                     count
                 };
            }).sort((a, b) => b.count - a.count);

            return { 
                year, 
                month, 
                total: data.total,
                coaches: coachStats, 
                key 
            };
        })
        .sort((a, b) => b.key.localeCompare(a.key));
  }, [reservations, mentalCoaches]);

  const availableYears = useMemo(() => {
      const years = new Set(detailedLessonsHistory.map(item => item.year));
      return Array.from(years).sort().reverse();
  }, [detailedLessonsHistory]);

  const filteredHistory = useMemo(() => {
      return detailedLessonsHistory.filter(item => {
          if (historyFilter.year && item.year !== historyFilter.year) return false;
          if (historyFilter.month && item.month !== historyFilter.month) return false;
          return true;
      });
  }, [detailedLessonsHistory, historyFilter]);

  const filteredMentalHistory = useMemo(() => {
      return mentalHistory.filter(item => {
          if (historyFilter.year && item.year !== historyFilter.year) return false;
          if (historyFilter.month && item.month !== historyFilter.month) return false;
          return true;
      });
  }, [mentalHistory, historyFilter]);

  // 3-month training room history by member
  const trainingRoomHistory3Months = useMemo(() => {
    const now = new Date();
    const threeMonthsAgoStart = new Date(now.getFullYear(), now.getMonth() - 2, 1); 

    const memberStats: Record<string, { name: string, count: number }> = {};

    reservations.forEach(r => {
         const resDate = new Date(r.dateTime);
         if (r.type === 'training_room' && r.status === 'attended' && resDate >= threeMonthsAgoStart) {
             if (!memberStats[r.memberId]) {
                 memberStats[r.memberId] = { name: r.memberName, count: 0 };
             }
             memberStats[r.memberId].count++;
         }
    });

    return Object.values(memberStats).sort((a, b) => b.count - a.count);
  }, [reservations]);

  const todaysPaymentsDetails = useMemo(() => {
    const today = new Date().toDateString();
    return payments
        .filter(p => new Date(p.createdAt).toDateString() === today)
        .map(p => {
            const productInfo = prices.find(price => price.id === p.productId || price.name === p.productName);
            return {
                ...p,
                memberName: getMemberName(p.userId),
                productDetails: productInfo
            };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, users, prices]);

  const totalTodayRevenue = useMemo(() => {
    return todaysPaymentsDetails.reduce((sum, payment) => sum + payment.amount, 0);
  }, [todaysPaymentsDetails]);

  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return payments
        .filter(p => {
            const paymentDate = new Date(p.createdAt);
            return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
        })
        .reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);
  
  const dailyRevenueStats = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const initialDailyData: Record<string, { total: number, details: { productName: string, count?: number, sessionMinutes?: number }[] }> = {};

    const dailyData = payments
        .filter(p => {
            const paymentDate = new Date(p.createdAt);
            return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
        })
        .reduce((acc, p) => {
            const dateKey = new Date(p.createdAt).toISOString().split('T')[0];
            if (!acc[dateKey]) {
                acc[dateKey] = { total: 0, details: [] };
            }
            acc[dateKey].total += p.amount;
            const productInfo = prices.find(price => price.id === p.productId || price.name === p.productName);
            acc[dateKey].details.push({
                productName: p.productName,
                count: productInfo?.count,
                sessionMinutes: productInfo?.sessionMinutes
            });
            return acc;
        }, initialDailyData);

    return Object.entries(dailyData)
        // Fix: Cast `data` to `any` to resolve spread operator error. `Object.entries` can return `[string, unknown]`, and `unknown` cannot be spread.
        .map(([date, data]) => ({ date, ...(data as any) }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, prices]);

  const handleDateClick = async (date: Date) => {
      const dateKey = date.toDateString();

      const reservationsForDate = reservations.filter(r => new Date(r.dateTime).toDateString() === dateKey);
      
      const notificationIdsToMark = reservationsForDate
        .map(r => notifications.find(n => n.refId === r.id && n.type === 'reservation' && n.userId === currentUser.id && !currentUser.notificationsRead?.[n.id]))
        .filter((n): n is NotificationItem => !!n)
        .map(n => n.id);

      if (notificationIdsToMark.length > 0) {
        try {
          const updatedUser = await api.markNotificationsAsReadByIds(currentUser.id, notificationIdsToMark);
          if (updatedUser) {
            updateCurrentUser(updatedUser);
            const newNotifications = await api.getNotifications();
            setNotifications(newNotifications);
          }
        } catch (error) {
          console.error("Failed to mark notifications as read:", (error as Error).message);
          showToast('오류', '알림 상태 업데이트 중 오류가 발생했습니다.', 'error');
        }
      }

      if (selectedCalendarDate && selectedCalendarDate.toDateString() === date.toDateString()) {
        setSelectedCalendarDate(null);
      } else {
        setSelectedCalendarDate(date);
        setDailyFilterType('all');
      }
  };

  const instructorColorMap = useMemo(() => 
    [...instructors, ...mentalCoaches].reduce((acc, inst) => {
        if (inst.color) acc[inst.id] = inst.color;
        return acc;
    }, {} as Record<string, string>), 
  [instructors, mentalCoaches]);

  const reservationsByDate = useMemo(() => {
    return reservations.reduce((acc, res) => {
        const dateKey = new Date(res.dateTime).toDateString();
        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(res);
        return acc;
    }, {} as Record<string, Reservation[]>);
  }, [reservations]);

  const calendarDates = useMemo(() => {
    const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const dates = [];
    let currentDateIterator = new Date(startDate);
    while (currentDateIterator <= endDate) {
        dates.push(new Date(currentDateIterator));
        currentDateIterator.setDate(currentDateIterator.getDate() + 1);
    }
    return dates;
  }, [viewDate]);

  const selectedDayReservations = useMemo(() => {
    if (!selectedCalendarDate) return [];
    const dateKey = selectedCalendarDate.toDateString();
    return (reservationsByDate[dateKey] || []).sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [selectedCalendarDate, reservationsByDate]);

  const filteredDailyReservations = useMemo(() => {
    if (!selectedDayReservations) return [];
    if (dailyFilterType === 'all') {
        return selectedDayReservations;
    }
    return selectedDayReservations.filter(r => r.type === dailyFilterType);
  }, [selectedDayReservations, dailyFilterType]);

  const offInstructorsForSelectedDay = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return instructors.filter(inst => isInstructorOff(inst, selectedCalendarDate));
  }, [selectedCalendarDate, instructors]);

  const renderActivePanel = () => {
    let title = '';
    let membersToList: User[] | null = null;
    switch (activePanel) {
        case 'active':
            title = '활성 회원 명단';
            membersToList = activeMembers;
            break;
        case 'expiring':
            title = '곧 만료 회원 명단';
            membersToList = expiringSoonMembers;
            break;
        case 'expired':
            title = '만료 회원 명단';
            membersToList = expiredMembers;
            break;
    }

    if (membersToList) {
        return (
            <>
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h2 className="text-xl font-bold text-white">{title} ({membersToList.length}명)</h2>
                    <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    <ul className="divide-y divide-slate-700">
                        {membersToList.map(member => (
                            <li key={member.id} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-white">{member.name} ({member.username})</p>
                                    <p className="text-sm text-slate-400 mt-1">{member.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-slate-300">{daysUntil(member.membership.end)}일 남음</p>
                                    <p className="text-xs text-slate-500">{new Date(member.membership.end).toLocaleDateString()} 만료</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </>
        );
    }

    switch (activePanel) {
        case 'lessons_history':
            return (
                <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h2 className="text-xl font-bold text-white">월간 누적 레슨 히스토리</h2>
                        <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                    </div>

                    <div className="mb-4 flex justify-center shrink-0">
                        <div className="p-1 bg-slate-900 rounded-full flex items-center w-full max-w-xs">
                            {(['all', 'instructor'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setLessonHistoryMode(mode)}
                                    className={`relative py-1.5 px-4 text-xs font-bold rounded-full transition-colors focus:outline-none flex-1 ${
                                        lessonHistoryMode === mode ? 'text-slate-900' : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {lessonHistoryMode === mode && (
                                        <motion.div
                                            layoutId="lesson-history-mode-pill"
                                            className="absolute inset-0 bg-yellow-500 rounded-full"
                                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{mode === 'all' ? '전체' : '담당 프로별'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 mb-4 shrink-0">
                        <Select 
                            value={historyFilter.year} 
                            onChange={e => setHistoryFilter(prev => ({...prev, year: e.target.value}))}
                            className="!py-1.5 !text-sm"
                        >
                            <option value="">모든 연도</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                        </Select>
                        <Select 
                            value={historyFilter.month} 
                            onChange={e => setHistoryFilter(prev => ({...prev, month: e.target.value}))}
                            className="!py-1.5 !text-sm"
                        >
                            <option value="">모든 월</option>
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                                const monthStr = String(m).padStart(2, '0');
                                return <option key={monthStr} value={monthStr}>{m}월</option>;
                            })}
                        </Select>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                         {filteredHistory.length > 0 ? (
                             <ul className="space-y-2">
                                {filteredHistory.map(stat => (
                                    <li key={stat.key} className="bg-slate-900/50 p-3 rounded-lg flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                             <p className="font-semibold text-slate-300">{stat.year}년 {parseInt(stat.month)}월</p>
                                             <div className="text-right">
                                                 <p className="font-bold text-white text-lg">{stat.total}회</p>
                                                 <p className="text-xs text-slate-400">(50분 {stat.total50}회 / 30분 {stat.total30}회)</p>
                                             </div>
                                        </div>
                                        {lessonHistoryMode === 'instructor' && stat.instructors.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                                                {stat.instructors.map(inst => (
                                                    <div key={inst.id} className="flex items-center justify-between text-xs">
                                                         <div className="flex items-center gap-1.5">
                                                             <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: inst.color }}></span>
                                                             <span className="text-slate-400 truncate">{inst.name}</span>
                                                         </div>
                                                         <div className="text-right">
                                                            <span className="text-slate-300 font-medium mr-2">{inst.total}회</span>
                                                            <span className="text-slate-500">(50분 {inst.count50} / 30분 {inst.count30})</span>
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                             </ul>
                         ) : (
                             <div className="h-full flex items-center justify-center">
                                <p className="text-center text-slate-400">해당 기간의 데이터가 없습니다.</p>
                             </div>
                         )}
                    </div>
                </>
            );
        case 'mental_history':
            return (
                <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h2 className="text-xl font-bold text-white">월간 누적 멘탈코칭 히스토리</h2>
                        <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                    </div>
                    <div className="flex gap-2 mb-4 shrink-0">
                        <Select 
                            value={historyFilter.year} 
                            onChange={e => setHistoryFilter(prev => ({...prev, year: e.target.value}))}
                            className="!py-1.5 !text-sm"
                        >
                            <option value="">모든 연도</option>
                            {availableYears.map(y => <option key={y} value={y}>{y}년</option>)}
                        </Select>
                        <Select 
                            value={historyFilter.month} 
                            onChange={e => setHistoryFilter(prev => ({...prev, month: e.target.value}))}
                            className="!py-1.5 !text-sm"
                        >
                            <option value="">모든 월</option>
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                                const monthStr = String(m).padStart(2, '0');
                                return <option key={monthStr} value={monthStr}>{m}월</option>;
                            })}
                        </Select>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                         {filteredMentalHistory.length > 0 ? (
                             <ul className="space-y-2">
                                {filteredMentalHistory.map(stat => (
                                    <li key={stat.key} className="bg-slate-900/50 p-3 rounded-lg flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                             <p className="font-semibold text-slate-300">{stat.year}년 {parseInt(stat.month)}월</p>
                                             <div className="text-right">
                                                 <p className="font-bold text-pink-400 text-lg">{stat.total}회</p>
                                             </div>
                                        </div>
                                        {stat.coaches.length > 0 && (
                                            <div className="grid grid-cols-1 gap-2 mt-2 pt-2 border-t border-slate-700/50">
                                                {stat.coaches.map(coach => (
                                                    <div key={coach.id} className="flex items-center justify-between text-xs">
                                                         <div className="flex items-center gap-1.5">
                                                             <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: coach.color }}></span>
                                                             <span className="text-slate-400 truncate">{coach.name}</span>
                                                         </div>
                                                         <div className="text-right">
                                                            <span className="text-slate-300 font-medium">{coach.count}회</span>
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </li>
                                ))}
                             </ul>
                         ) : (
                             <div className="h-full flex items-center justify-center">
                                <p className="text-center text-slate-400">해당 기간의 데이터가 없습니다.</p>
                             </div>
                         )}
                    </div>
                </>
            );
        case 'training_room_history':
            return (
                <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h2 className="text-xl font-bold text-white">수련의 방 이용 현황 (최근 3개월)</h2>
                        <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                         {trainingRoomHistory3Months.length > 0 ? (
                            <ul className="space-y-2">
                                {trainingRoomHistory3Months.map((stat, index) => (
                                    <li key={index} className="bg-slate-900/50 p-3 rounded-lg flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index < 3 ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-400'}`}>
                                                {index + 1}
                                            </span>
                                            <p className="font-semibold text-white">{stat.name} 회원님</p>
                                        </div>
                                        <p className="font-bold text-purple-400">{stat.count}회</p>
                                    </li>
                                ))}
                            </ul>
                         ) : (
                             <p className="text-center text-slate-400 py-8">최근 3개월간 이용 내역이 없습니다.</p>
                         )}
                    </div>
                </>
            );
        case 'today':
            return (
                <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h2 className="text-xl font-bold text-white">오늘의 결제 내역 상세</h2>
                        <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {todaysPaymentsDetails.length > 0 ? (
                            <ul className="space-y-3">
                                {todaysPaymentsDetails.map(payment => {
                                    const timeDiff = new Date().getTime() - new Date(payment.createdAt).getTime();
                                    const isNew = timeDiff < 5 * 60 * 1000; // 5 minutes

                                    return (
                                        <li key={payment.id} className="bg-slate-900/50 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                            <div className="flex-grow">
                                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                    <p className="font-semibold text-white flex items-center gap-2">
                                                        {payment.memberName}
                                                        {isNew && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">NEW</span>}
                                                    </p>
                                                    <p className="text-sm text-yellow-400">{payment.productName}</p>
                                                    {payment.productDetails && (
                                                        <p className="text-xs text-slate-400">
                                                            ({payment.productDetails.sessionMinutes}분 / {payment.productDetails.count}회)
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-bold text-lg text-green-400">{payment.amount.toLocaleString()}원</p>
                                                <p className="text-sm text-slate-500 mt-1">{new Date(payment.createdAt).toLocaleTimeString('ko-KR')}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 py-8">오늘 결제 내역이 없습니다.</p>
                        )}
                    </div>
                </>
            );
        case 'month':
            return (
                <>
                    <div className="flex justify-between items-center mb-4 shrink-0">
                        <h2 className="text-xl font-bold text-white">월별 매출 현황 (일별)</h2>
                        <Button onClick={() => setActivePanel(null)} variant="secondary" size="sm"><X size={16}/></Button>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-2">
                        {dailyRevenueStats.length > 0 ? (
                            <ul className="space-y-3">
                                {dailyRevenueStats.map(stat => {
                                    const productCounts = stat.details.reduce((acc: Record<string, number>, detail) => {
                                        const key = `${detail.productName} (${detail.sessionMinutes}분/${detail.count}회)`;
                                        acc[key] = (acc[key] || 0) + 1;
                                        return acc;
                                    }, {});

                                    const productsSummary = Object.entries(productCounts)
                                        // Fix: Cast `count` to `number` to resolve comparison error. `Object.entries` can return `[string, unknown]`, and `unknown` cannot be compared.
                                        .map(([name, count]) => (count as number) > 1 ? `${name}(${count}건)` : name)
                                        .join(', ');

                                    return (
                                        <li key={stat.date} className="bg-slate-900/50 p-4 rounded-lg">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-white">{new Date(stat.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}</p>
                                                <p className="font-bold text-lg text-green-400">{stat.total.toLocaleString()}원</p>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-2 border-t border-slate-700/50 pt-2">
                                                {productsSummary}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p className="text-center text-slate-400 py-8">이번 달 매출 데이터가 없습니다.</p>
                        )}
                    </div>
                </>
            );
        default:
            return null;
    }
  };

  const dailyFilterTabs: { id: 'all' | 'lesson' | 'training_room' | 'mental'; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'lesson', label: '레슨' },
    { id: 'mental', label: '멘탈' },
    { id: 'training_room', label: '수련의 방' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <button onClick={() => setActivePanel(p => p === 'active' ? null : 'active')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-yellow-500/20 text-yellow-400">
                    <UserIcon size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">활성 회원</p>
                    <p className="text-2xl font-bold text-white">{activeMembers.length}명</p>
                </div>
            </Card>
        </button>
        <button onClick={() => setActivePanel(p => p === 'expiring' ? null : 'expiring')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-orange-500/20 text-orange-400">
                    <AlertTriangle size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">곧 만료 (7일 이내)</p>
                    <p className="text-2xl font-bold text-white">{expiringSoonMembers.length}명</p>
                </div>
            </Card>
        </button>
        <button onClick={() => setActivePanel(p => p === 'expired' ? null : 'expired')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-red-500/20 text-red-400">
                    <UserX size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">만료 회원</p>
                    <p className="text-2xl font-bold text-white">{expiredMembers.length}명</p>
                </div>
            </Card>
        </button>
        <button onClick={() => setActivePanel(p => p === 'lessons_history' ? null : 'lessons_history')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                    <BookOpen size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">월간 누적 레슨 (출석)</p>
                    <p className="text-2xl font-bold text-white">{monthlyLessonsCount}회</p>
                </div>
            </Card>
        </button>
        <button onClick={() => setActivePanel(p => p === 'mental_history' ? null : 'mental_history')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-pink-500/20 text-pink-400">
                    <Brain size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">월간 멘탈코칭 (출석)</p>
                    <p className="text-2xl font-bold text-white">{monthlyMentalCount}회</p>
                </div>
            </Card>
        </button>
        <button onClick={() => setActivePanel(p => p === 'training_room_history' ? null : 'training_room_history')} className="w-full text-left">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                    <GolfBallIcon />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">월간 수련의 방 이용</p>
                    <p className="text-2xl font-bold text-white">{monthlyTrainingRoomCount}회</p>
                </div>
            </Card>
        </button>
        <div className="relative sm:col-span-1 lg:col-span-1">
            <button 
                onClick={() => { 
                    onViewTodayRevenue();
                    setActivePanel(p => p === 'today' ? null : 'today');
                }} 
                className="w-full text-left"
            >
                <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="p-3 rounded-full bg-green-500/20 text-green-400">
                        <DollarSign size={24} />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-slate-400">오늘 매출</p>
                        <p className="text-2xl font-bold text-white">{totalTodayRevenue.toLocaleString()}원</p>
                    </div>
                </Card>
            </button>
            {unreadPaymentsCount > 0 && (
                <span className="absolute top-0 right-0 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-lg transform translate-x-1/3 -translate-y-1/3">
                    {unreadPaymentsCount}
                </span>
            )}
        </div>
        <button onClick={() => setActivePanel(p => p === 'month' ? null : 'month')} className="w-full text-left sm:col-span-1 lg:col-span-1">
            <Card className="flex items-center p-4 hover:bg-slate-700/50 transition-colors">
                <div className="p-3 rounded-full bg-indigo-500/20 text-indigo-400">
                    <TrendingUp size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm text-slate-400">월간 누적 매출</p>
                    <p className="text-2xl font-bold text-white">{monthlyRevenue.toLocaleString()}원</p>
                </div>
            </Card>
        </button>
      </div>

      <AnimatePresence>
        {activePanel && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '1.5rem' }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="overflow-hidden"
          >
            <Card className="max-h-[60vh] flex flex-col">
              {renderActivePanel()}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
              <h2 className="text-xl font-bold text-white">월별 예약 스케줄</h2>
              <div className="flex items-center gap-2">
                <Button onClick={() => setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; })} size="sm" variant="secondary"><ChevronLeft size={16}/></Button>
                <h3 className="text-lg font-bold text-yellow-400 text-center w-36 sm:w-48">
                  {viewDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </h3>
                <Button onClick={() => setViewDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; })} size="sm" variant="secondary"><ChevronRight size={16}/></Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="text-center font-semibold text-slate-400 text-sm py-2">{day}</div>)}
              {calendarDates.map(date => {
                const dateKey = date.toDateString();
                const dailyReservations = reservationsByDate[dateKey] || [];
                const dailyLessons = dailyReservations.filter(r => r.type === 'lesson');
                const dailyMental = dailyReservations.filter(r => r.type === 'mental');
                
                const dailyLessonCount = dailyLessons.length;
                const attendedLessonCount = dailyLessons.filter(r => r.status === 'attended').length;
                const absentLessonCount = dailyLessons.filter(r => r.status === 'absent').length;
                
                const dailyMentalCount = dailyMental.length;
                const dailyTrainingRoomCount = dailyReservations.filter(r => r.type === 'training_room').length;
                
                const proCounts = dailyLessons.reduce((acc, r) => {
                    if (r.instructorId) {
                        acc[r.instructorId] = (acc[r.instructorId] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);
                const offInstructors = instructors.filter(inst => isInstructorOff(inst, date));

                const isToday = date.toDateString() === new Date().toDateString();
                const isCurrentMonth = date.getMonth() === viewDate.getMonth();
                const isSelected = selectedCalendarDate?.toDateString() === dateKey;
                
                return (
                  <button 
                    key={date.toISOString()} 
                    onClick={() => handleDateClick(date)}
                    className={`p-1.5 rounded-lg min-h-[90px] text-left align-top transition-colors flex flex-col ${isCurrentMonth ? 'bg-slate-800/50 hover:bg-slate-700/70' : 'bg-slate-900/30'} ${isSelected ? 'border-2 border-yellow-500 bg-slate-700/80' : 'border border-transparent'}`}>
                    <div>
                      <p className={`font-bold text-sm ${isCurrentMonth ? 'text-white' : 'text-slate-600'} ${isToday && !isSelected ? 'text-yellow-400' : ''}`}>
                        {date.getDate()}
                      </p>
                    </div>
                    <div className="flex-grow space-y-1 overflow-hidden mt-1 text-xs">
                      {dailyLessonCount > 0 && isCurrentMonth && (
                          <div>
                              <div className="font-bold text-yellow-400">레슨 {dailyLessonCount}</div>
                                {(attendedLessonCount > 0 || absentLessonCount > 0) && (
                                    <div className="text-[10px] leading-tight">
                                        <span className="text-slate-300">진행:{attendedLessonCount}</span>
                                        {absentLessonCount > 0 && <span className="text-red-400 ml-1">결석:{absentLessonCount}</span>}
                                    </div>
                                )}
                              {Object.entries(proCounts).map(([instId, count]) => (
                                  <div key={instId} className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: instructorColorMap[instId] || '#6b7280' }}></span>
                                      <span className="text-slate-300 truncate">{count}</span>
                                  </div>
                              ))}
                          </div>
                      )}
                      {dailyMentalCount > 0 && isCurrentMonth && (
                        <div className="font-bold text-pink-400">멘탈 {dailyMentalCount}</div>
                      )}
                      {dailyTrainingRoomCount > 0 && isCurrentMonth && (
                        <div className="font-bold text-purple-400">수련 {dailyTrainingRoomCount}</div>
                      )}
                      {offInstructors.length > 0 && isCurrentMonth && (
                        <div>
                            <div className="font-bold text-red-400">휴무</div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                                {offInstructors.map(inst => (
                                    <span key={inst.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: inst.color || '#6b7280' }} title={inst.name}></span>
                                ))}
                            </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
             <AnimatePresence>
                {selectedCalendarDate && (
                    <motion.div
                        layout
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: '16px' }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="bg-slate-800 rounded-lg p-4"
                    >
                        <h3 className="font-bold text-white mb-3">{selectedCalendarDate.toLocaleDateString('ko-KR', { dateStyle: 'long' })} 예약 내역</h3>
                        
                        <div className="my-3 flex justify-center">
                            <div className="p-1 bg-slate-900 rounded-full flex items-center justify-around w-full max-w-lg">
                              {dailyFilterTabs.map((tab) => (
                                <button
                                  key={tab.id}
                                  onClick={() => setDailyFilterType(tab.id)}
                                  className={`relative py-1.5 px-4 text-sm font-bold rounded-full transition-colors focus:outline-none flex-1 ${
                                    dailyFilterType === tab.id
                                      ? 'text-slate-900'
                                      : 'text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {dailyFilterType === tab.id && (
                                    <motion.div
                                      layoutId="daily-reservation-filter-pill"
                                      className="absolute inset-0 bg-yellow-500 rounded-full"
                                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    />
                                  )}
                                  <span className="relative z-10">{tab.label}</span>
                                </button>
                              ))}
                            </div>
                        </div>

                        <div className="min-h-[240px]">
                            {filteredDailyReservations.length > 0 ? (
                                <ul className="space-y-2 max-h-[40rem] overflow-y-auto pr-2">
                                    {filteredDailyReservations.map(r => {
                                        const isLesson = r.type === 'lesson';
                                        const isMental = r.type === 'mental';
                                        
                                        let borderColorClass = 'border-l-4 border-purple-500';
                                        if (isLesson) {
                                            borderColorClass = r.duration === 30 ? 'border-l-4 border-green-500' : 'border-l-4 border-blue-500';
                                        } else if (isMental) {
                                            borderColorClass = 'border-l-4 border-pink-500';
                                        }

                                        const statusInfo = statusMap[r.status];
                                        return (
                                            <li key={r.id} className={`text-sm bg-slate-900/70 p-3 rounded-md shadow-sm ${borderColorClass}`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-slate-200 truncate">{r.memberName}</p>
                                                        <p className="text-slate-400 text-xs">{new Date(r.dateTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} ({r.duration}분)</p>
                                                    </div>
                                                    {statusInfo && (
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.className}`}>
                                                            {statusInfo.text}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right text-slate-400 text-xs mt-1">
                                                    <p className="flex items-center justify-end gap-1.5">
                                                        {isLesson ? `${r.instructorName} 프로` : isMental ? `${r.instructorName} 코치` : '수련의 방'}
                                                        {(isLesson || isMental) && r.instructorId && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: instructorColorMap[r.instructorId] || '#6b7280' }}></span>}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="text-slate-400 text-center py-4 pt-16">
                                    {dailyFilterType === 'all' ? '해당 날짜에 예약이 없습니다.' : '해당 종류의 예약이 없습니다.'}
                                </p>
                            )}
                        </div>
                        
                        {filteredDailyReservations.length > 0 && offInstructorsForSelectedDay.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-700/50" />
                        )}

                        {offInstructorsForSelectedDay.length > 0 && (
                            <div className="mt-3">
                                <h4 className="font-semibold text-red-400 mb-2">휴무 프로</h4>
                                <ul className="space-y-1">
                                    {offInstructorsForSelectedDay.map(inst => (
                                        <li key={inst.id} className="text-sm text-slate-300 flex items-center gap-2">
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: inst.color || '#6b7280' }}
                                            ></span>
                                            {inst.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;