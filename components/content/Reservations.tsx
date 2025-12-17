
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Reservation, User, NotificationItem, LessonEntry } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronLeft, ChevronRight, X, Brain, DoorOpen } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '../ui/Input';

// Custom Icons for Reservation Cards
const GolfClubIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 mb-6 text-yellow-400">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
    <path d="m9 16 2 2 4-4"></path>
  </svg>
);

const GolfBallIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-20 h-20 mb-6 text-purple-400">
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

interface ReservationsProps {
  reservations: Reservation[];
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  setUsers?: React.Dispatch<React.SetStateAction<User[]>>;
  updateCurrentUser?: (user: User) => void;
  instructors: User[]; // Kept for interface compatibility but we'll use useAuth().users to filter inside
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  lessons?: LessonEntry[];
  onWriteJournal?: (memberId: string) => void;
  unreadLessonReservationsCount?: number;
  unreadTrainingRoomReservationsCount?: number;
  unreadMentalReservationsCount?: number;
  notifications: NotificationItem[];
  currentUser: User;
}

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

const Reservations: React.FC<ReservationsProps> = ({ reservations, setReservations, setUsers, updateCurrentUser, instructors: passedInstructors, setNotifications, lessons, onWriteJournal, unreadLessonReservationsCount, unreadTrainingRoomReservationsCount, unreadMentalReservationsCount, notifications, currentUser: passedCurrentUser }) => {
  const { currentUser: authCurrentUser, users } = useAuth();
  const currentUser = passedCurrentUser || authCurrentUser;
  const { showToast } = useToast();
  const confirm = useConfirmation();
  const isAdmin = currentUser?.role === 'admin';
  const isInstructor = currentUser?.role === 'instructor';
  const isMentalCoach = currentUser?.role === 'mental_coach';

  // Determine lists of professionals from all users
  const golfInstructors = useMemo(() => users.filter(u => u.role === 'instructor'), [users]);
  const mentalCoaches = useMemo(() => users.filter(u => u.role === 'mental_coach'), [users]);

  // Combine both for general lookup, or use specific lists based on context
  const allPros = useMemo(() => [...golfInstructors, ...mentalCoaches], [golfInstructors, mentalCoaches]);

  const [reservationMode, setReservationMode] = useState<'lesson' | 'training_room' | 'mental' | 'lesson_room_rental' | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<30 | 50 | 60 | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  
  // State for instructor calendar view
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'lesson' | 'training_room' | 'mental' | 'lesson_room_rental'>('all');

  // New state for cancellation confirmation
  const [cancellationToConfirm, setCancellationToConfirm] = useState<Reservation | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 60000); 
    return () => clearInterval(intervalId);
  }, []);

  const isReservationNew = useCallback((r: Reservation) => {
      const timeDiff = new Date().getTime() - new Date(r.createdAt).getTime();
      return timeDiff < 5 * 60 * 1000; // 5 minutes
  }, []);

  const isReservationUnread = useCallback((r: Reservation) => {
    if ((!isInstructor && !isMentalCoach) || r.instructorId !== currentUser.id) return false;
    const notification = notifications.find(n => n.refId === r.id && n.type === 'reservation' && n.userId === currentUser.id);
    if (notification) {
        return !currentUser.notificationsRead?.[notification.id];
    }
    return (new Date().getTime() - new Date(r.createdAt).getTime()) < 5 * 60 * 1000;
  }, [notifications, currentUser, isInstructor, isMentalCoach]);

  const resetToSelection = () => {
    setReservationMode(null);
    setSelectedDuration(null);
    setSelectedInstructorId(null);
    setSelectedDate(new Date());
  };

  const formatReservationDateTime = (isoString: string) => {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}.${month}.${day}(${dayOfWeek}) ${hours}:${minutes}`;
  };

  const member = users.find(u => u.id === currentUser?.id);
  const has30minSessions = (member?.membership.sessions['30'] ?? 0) > 0;
  const has50minSessions = (member?.membership.sessions['50'] ?? 0) > 0;
  const hasMentalSessions = (member?.membership.sessions['mental'] ?? 0) > 0;
  const hasRentalSessions = (member?.membership.sessions['rentals'] ?? 0) > 0;

  const handleInstructorSelection = (instructorId: string) => {
      setSelectedInstructorId(instructorId);
  };
  
  const handleFilterChange = async (type: 'all' | 'lesson' | 'training_room' | 'mental' | 'lesson_room_rental') => {
      setFilterType(type);

      if ((type === 'lesson' || type === 'training_room' || type === 'mental' || type === 'lesson_room_rental') && updateCurrentUser) {
          const hasUnread = type === 'lesson' 
              ? (unreadLessonReservationsCount ?? 0) > 0 
              : type === 'training_room' 
                ? (unreadTrainingRoomReservationsCount ?? 0) > 0
                : type === 'mental' 
                    ? (unreadMentalReservationsCount ?? 0) > 0
                    : false; // Assuming rental doesn't have a separate count passed in props for now
          
          if (hasUnread) {
              try {
                  const updatedUser = await api.markNotificationsAsReadByReservationType(currentUser.id, type);
                  if (updatedUser) {
                      updateCurrentUser(updatedUser);
                      const newNotifications = await api.getNotifications();
                      setNotifications(newNotifications);
                  }
              } catch (error) {
                  console.error(`Failed to mark ${type} reservation notifications as read:`, (error as Error).message);
                  showToast('오류', '알림 상태 업데이트 중 오류가 발생했습니다.', 'error');
              }
          }
      }
  };

  useEffect(() => {
    if (isAdmin || isInstructor || isMentalCoach) {
      // No default selection for admin/instructor/coach
    } else {
        if (reservationMode === 'lesson' && golfInstructors.length === 1) {
            handleInstructorSelection(golfInstructors[0].id);
        } else if (reservationMode === 'mental' && mentalCoaches.length === 1) {
            handleInstructorSelection(mentalCoaches[0].id);
        }
        // Lesson room rental no longer auto-selects instructor as it's unified to GC Quad
    }
  }, [isAdmin, isInstructor, isMentalCoach, golfInstructors, mentalCoaches, reservationMode]);
  
  const userReservations = useMemo(() => {
    if(isAdmin) return reservations;
    if(isInstructor || isMentalCoach) return reservations.filter(r => r.instructorId === currentUser?.id);
    return reservations.filter(r => r.memberId === currentUser?.id);
  }, [reservations, currentUser, isAdmin, isInstructor, isMentalCoach]);

  const filteredUserReservations = useMemo(() => {
      if (isAdmin && filterType !== 'all') {
          return userReservations.filter(r => r.type === filterType);
      }
      return userReservations;
  }, [userReservations, isAdmin, filterType]);

  const { upcomingReservations, pastReservations } = useMemo(() => {
    const now = new Date();
    
    const upcoming = filteredUserReservations.filter(r => {
      if (r.status !== 'scheduled' || (r.isHidden && !isInstructor && !isMentalCoach)) return false;
      const resDate = new Date(r.dateTime);
      return resDate >= now || resDate.toDateString() === now.toDateString();
    });

    const past = filteredUserReservations.filter(r => {
      if (r.isHidden && !isInstructor && !isMentalCoach) return false;
      
      const resDate = new Date(r.dateTime);
      return r.status !== 'scheduled' || (resDate < now && resDate.toDateString() !== now.toDateString());
    });
    
    upcoming.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    past.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    return { upcomingReservations: upcoming, pastReservations: past };
  }, [filteredUserReservations, isInstructor, isMentalCoach]);

  const instructorMonthlyStats = useMemo(() => {
    if (!isAdmin) return [];

    const stats = allPros.map(pro => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const monthlyAttendedReservations = reservations.filter(r => {
            const resDate = new Date(r.dateTime);
            return r.instructorId === pro.id &&
                   r.status === 'attended' &&
                   resDate.getFullYear() === currentYear &&
                   resDate.getMonth() === currentMonth;
        });
        
        const count30 = monthlyAttendedReservations.filter(r => r.type === 'lesson' && r.duration === 30).length;
        const count50 = monthlyAttendedReservations.filter(r => r.type === 'lesson' && r.duration === 50).length;
        const countMental = monthlyAttendedReservations.filter(r => r.type === 'mental').length;
        const totalCount = count30 + count50 + countMental;

        return {
            ...pro,
            count30,
            count50,
            countMental,
            totalCount
        };
    });
    return stats;
  }, [isAdmin, allPros, reservations]);

  const timelineHours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23
  const availableHours = timelineHours.filter(h => h >= 10 && h <= 21); // 10:00 ~ 21:30

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + days);
      return newDate;
    });
  };

  const handleLessonReservation = async (dateTime: Date) => {
    if (!currentUser || !selectedDuration || !selectedInstructorId) return;
    
    const isToday = new Date().toDateString() === dateTime.toDateString();
    let confirmationMessage: string | React.ReactNode = `${dateTime.toLocaleString('ko-KR')}에 ${selectedDuration}분 레슨을 예약하시겠습니까?`;

    if (currentUser.role === 'member' && isToday) {
      confirmationMessage = (
        <>
          {`${dateTime.toLocaleString('ko-KR')}에 ${selectedDuration}분 레슨을 예약하시겠습니까?`}
          <br />
          <br />
          <span className="font-bold text-yellow-400">[안내] 당일 예약은 취소가 불가능합니다.</span>
          <br />
          <span>계속하시겠습니까?</span>
        </>
      );
    }

    const isConfirmed = await confirm(confirmationMessage);

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const result = await api.createReservation({ type: 'lesson', memberId: currentUser.id, dateTime: dateTime.toISOString(), duration: selectedDuration, instructorId: selectedInstructorId });
        setReservations(result.reservations);
        if(setUsers) setUsers(result.users);
        const updatedUser = result.users.find(u => u.id === currentUser.id);
        if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
        
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        
        showToast('성공', '레슨 예약이 완료되었습니다.', 'success');
      } catch (error) {
        showToast('오류', (error as Error).message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMentalReservation = async (dateTime: Date) => {
    if (!currentUser || !selectedInstructorId) return;
    const DURATION = 50;
    
    const isToday = new Date().toDateString() === dateTime.toDateString();
    let confirmationMessage: string | React.ReactNode = `${dateTime.toLocaleString('ko-KR')}에 멘탈코칭(50분)을 예약하시겠습니까?`;

    if (currentUser.role === 'member' && isToday) {
      confirmationMessage = (
        <>
          {`${dateTime.toLocaleString('ko-KR')}에 멘탈코칭(50분)을 예약하시겠습니까?`}
          <br />
          <br />
          <span className="font-bold text-yellow-400">[안내] 당일 예약은 취소가 불가능합니다.</span>
          <br />
          <span>계속하시겠습니까?</span>
        </>
      );
    }

    const isConfirmed = await confirm(confirmationMessage);

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const result = await api.createReservation({ type: 'mental', memberId: currentUser.id, dateTime: dateTime.toISOString(), duration: DURATION, instructorId: selectedInstructorId });
        setReservations(result.reservations);
        if(setUsers) setUsers(result.users);
        const updatedUser = result.users.find(u => u.id === currentUser.id);
        if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
        
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        
        showToast('성공', '멘탈코칭 예약이 완료되었습니다.', 'success');
      } catch (error) {
        showToast('오류', (error as Error).message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLessonRoomRentalReservation = async (dateTime: Date) => {
    if (!currentUser) return;
    const DURATION = 60; // 60 minutes
    
    // Check rental ticket balance
    const memberData = users.find(u => u.id === currentUser.id);
    const rentals = memberData?.membership.sessions['rentals'] || 0;

    if (rentals <= 0) {
        showToast('오류', '대관권이 없습니다. 상품을 구매해주세요.', 'error');
        return;
    }

    const isToday = new Date().toDateString() === dateTime.toDateString();
    let confirmationMessage: string | React.ReactNode = `${dateTime.toLocaleString('ko-KR')}에 GC쿼드(60분)를 예약하시겠습니까?`;

    if (currentUser.role === 'member') {
        const warning = isToday ? <><br/><span className="font-bold text-yellow-400">[안내] 당일 예약은 취소가 불가능합니다.</span></> : null;
        confirmationMessage = (
            <>
                {`${dateTime.toLocaleString('ko-KR')}에 GC쿼드(60분)를 예약하시겠습니까?`}
                <br />
                <span className="text-orange-400 font-bold">보유 대관권 1회가 차감됩니다. (잔여: {rentals}회)</span>
                {warning}
                <br />
                <span>계속하시겠습니까?</span>
            </>
        );
    }

    const isConfirmed = await confirm(confirmationMessage);

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const result = await api.createReservation({ 
            type: 'lesson_room_rental', 
            memberId: currentUser.id, 
            dateTime: dateTime.toISOString(), 
            duration: DURATION,
            // Removed instructorId for rental
        });
        setReservations(result.reservations);
        if(setUsers) setUsers(result.users);
        const updatedUser = result.users.find(u => u.id === currentUser.id);
        if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
        
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        
        showToast('성공', 'GC쿼드 예약이 완료되었습니다. 대관권 1회가 차감되었습니다.', 'success');
      } catch (error) {
        showToast('오류', (error as Error).message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTrainingRoomReservation = async (dateTime: Date) => {
    if (!currentUser) return;
    const DURATION = 60; // 60 minutes
    
    const confirmationMessage = `${dateTime.toLocaleString('ko-KR')}에 수련의 방을 예약하시겠습니까? (1시간)`;
    const isConfirmed = await confirm(confirmationMessage);

    if (isConfirmed) {
      setIsLoading(true);
      try {
        const result = await api.createReservation({ 
            type: 'training_room', 
            memberId: currentUser.id, 
            dateTime: dateTime.toISOString(), 
            duration: DURATION 
        });
        setReservations(result.reservations);
        if(setUsers) setUsers(result.users);
        const updatedUser = result.users.find(u => u.id === currentUser.id);
        if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
        
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        
        showToast('성공', '수련의 방 예약이 완료되었습니다.', 'success');
      } catch (error) {
        showToast('오류', (error as Error).message, 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleStatusUpdate = async (reservation: Reservation, status: 'attended' | 'absent') => {
    if (!currentUser) return;
    const statusText = status === 'attended' ? '출석' : '결석';
    const isConfirmed = await confirm(`${reservation.memberName}님의 예약을 ${statusText}으로 처리하시겠습니까?`);
    if (isConfirmed) {
        setIsLoading(true);
        try {
            const updatedReservations = await api.updateReservationStatus(reservation.id, status, currentUser.id);
            setReservations(updatedReservations);
            const newNotifications = await api.getNotifications();
            setNotifications(newNotifications);
            showToast('성공', `예약이 ${statusText} 처리되었습니다.`, 'success');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleDelete = async (reservation: Reservation) => {
    if (!currentUser) return;

    if (currentUser.role !== 'admin' && reservation.status !== 'scheduled') {
        showToast('안내', '출석 또는 결석 처리된 예약은 취소할 수 없습니다.', 'info');
        return;
    }
    
    if (currentUser.role === 'member' && (reservation.type === 'lesson' || reservation.type === 'mental' || reservation.type === 'lesson_room_rental')) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const reservationDay = new Date(reservation.dateTime);
      reservationDay.setHours(0,0,0,0);

      if (reservationDay <= today) {
        showToast('안내', '당일 또는 지난 예약은 취소할 수 없습니다.', 'info');
        return;
      }
    }
    
    if (isAdmin && (reservation.type === 'lesson' || reservation.type === 'mental' || reservation.type === 'lesson_room_rental')) {
        setCancellationToConfirm(reservation);
        setAdminPassword('');
        return;
    }
    
    const isConfirmed = await confirm('정말로 이 예약을 취소하시겠습니까?');
    if(isConfirmed) {
        setIsLoading(true);
        try {
            const result = await api.deleteReservation(reservation.id, currentUser.id);
            setReservations(result.reservations);
            if(setUsers) setUsers(result.users);
            const updatedUser = result.users.find(u => u.id === currentUser.id);
            if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
            
            const newNotifications = await api.getNotifications();
            setNotifications(newNotifications);

            showToast('성공', '예약이 취소되었습니다.', 'success');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    }
  };
  
  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellationToConfirm || !adminPassword || !currentUser) return;

    setIsLoading(true);
    try {
        const result = await api.deleteReservation(cancellationToConfirm.id, currentUser.id, adminPassword);
        setReservations(result.reservations);
        if(setUsers) setUsers(result.users);
        const updatedUser = result.users.find(u => u.id === currentUser.id);
        if(updateCurrentUser && updatedUser) updateCurrentUser(updatedUser);
        
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        
        const isPastReservation = cancellationToConfirm.status !== 'scheduled';
        const successMessage = isPastReservation ? '지난 내역이 삭제 되었습니다.' : '예약이 취소되었습니다.';
        showToast('성공', successMessage, 'success');
        setCancellationToConfirm(null);
    } catch (error) {
        showToast('오류', (error as Error).message, 'error');
    } finally {
        setIsLoading(false);
    }
  };
  
  const isLessonSlotAvailable = (slotDate: Date, duration: number = 50): boolean => {
    if (!selectedInstructorId) return false;
    
    const instructor = users.find(i => i.id === selectedInstructorId);
    if (!instructor || isInstructorOff(instructor, slotDate)) return false;

    const now = new Date();
    if (slotDate < now) return false;

    for (const r of reservations) {
      // Check overlaps for the specific instructor/coach
      if (r.instructorId === selectedInstructorId && r.status === 'scheduled') {
        const resStart = new Date(r.dateTime);
        const resEnd = new Date(resStart.getTime() + r.duration * 60000);
        const slotEnd = new Date(slotDate.getTime() + duration * 60000);
        
        if (slotDate < resEnd && slotEnd > resStart) {
          return false;
        }
      }
    }
    return true;
  };
  
  const isTrainingRoomSlotAvailable = (slotDate: Date): boolean => {
    const DURATION = 60; // 60 minutes
    const now = new Date();
    if (slotDate < now) return false;

    for (const r of reservations) {
        if (r.type === 'training_room' && r.status === 'scheduled') {
            const resStart = new Date(r.dateTime);
            const resEnd = new Date(resStart.getTime() + r.duration * 60000);
            const slotEnd = new Date(slotDate.getTime() + DURATION * 60000);

            if (slotDate < resEnd && slotEnd > resStart) {
                return false;
            }
        }
    }
    return true;
  };

  const isGCQuadAvailable = (slotDate: Date): boolean => {
    const DURATION = 60; // 60 minutes
    const now = new Date();
    if (slotDate < now) return false;

    // Check conflict with other rental bookings (Single GC Quad room assumption)
    const resourceConflict = reservations.some(r => {
        if (r.type === 'lesson_room_rental' && r.status === 'scheduled') {
             const resStart = new Date(r.dateTime);
             const resEnd = new Date(resStart.getTime() + r.duration * 60000);
             const slotEnd = new Date(slotDate.getTime() + DURATION * 60000);
             return (slotDate < resEnd && slotEnd > resStart);
        }
        return false;
    });
    if (resourceConflict) return false;

    // Check conflict with User's own schedule (Double booking prevention)
    const userConflict = reservations.some(r => {
        if (r.memberId === currentUser.id && r.status === 'scheduled') {
             const resStart = new Date(r.dateTime);
             const resEnd = new Date(resStart.getTime() + r.duration * 60000);
             const slotEnd = new Date(slotDate.getTime() + DURATION * 60000);
             return (slotDate < resEnd && slotEnd > resStart);
        }
        return false;
    });
    
    return !userConflict;
  };

  const hasTrainingRoomBookingOnSelectedDate = useMemo(() => {
    if (!currentUser) return false;
    const selectedDateString = selectedDate.toDateString();
    return reservations.some(
        r => r.memberId === currentUser.id &&
             r.type === 'training_room' &&
             r.status === 'scheduled' &&
             new Date(r.dateTime).toDateString() === selectedDateString
    );
  }, [reservations, currentUser, selectedDate]);
  
  const renderMemberScheduler = () => {
    if (isAdmin) return null;
    
    if (reservationMode === null) {
        return (
            <>
                <h2 className="text-xl font-bold text-white mb-6">예약 종류 선택</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <button 
                      onClick={() => setReservationMode('lesson')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border-2 border-transparent hover:border-yellow-500 transition-all duration-300 group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: -5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                        <GolfClubIcon />
                      </motion.div>
                      <span className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">레슨 예약</span>
                      <span className="text-sm text-slate-400 mt-2">프로님과의 1:1 레슨</span>
                    </button>

                    <button 
                      onClick={() => setReservationMode('mental')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border-2 border-transparent hover:border-pink-500 transition-all duration-300 group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                         <Brain className="w-20 h-20 mb-6 text-pink-400" />
                      </motion.div>
                      <span className="text-xl font-bold text-white group-hover:text-pink-400 transition-colors">멘탈코칭 예약</span>
                      <span className="text-sm text-slate-400 mt-2">심리적 안정을 위한 코칭</span>
                    </button>

                    <button 
                      onClick={() => setReservationMode('lesson_room_rental')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border-2 border-transparent hover:border-orange-500 transition-all duration-300 group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                      >
                         <DoorOpen className="w-20 h-20 mb-6 text-orange-400" />
                      </motion.div>
                      <span className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">GC쿼드 대관</span>
                      <span className="text-sm text-slate-400 mt-2">60분 / GC쿼드 이용</span>
                    </button>

                    <button 
                      onClick={() => setReservationMode('training_room')}
                      className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-2xl border-2 border-transparent hover:border-purple-500 transition-all duration-300 group"
                    >
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 360 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                      >
                         <GolfBallIcon />
                      </motion.div>
                      <span className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">수련의 방 예약</span>
                      <span className="text-sm text-slate-400 mt-2">개인 연습 공간 예약</span>
                    </button>
                </div>
            </>
        )
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 6);
    
    const isDateRangeValid = selectedDate >= today && selectedDate <= maxDate;

    // Common Instructor Selection UI (Only for Lesson and Mental)
    if ((reservationMode === 'lesson' || reservationMode === 'mental') && !selectedInstructorId) {
        const modeTitle = reservationMode === 'lesson' ? '레슨' : '멘탈코칭';
        const targetList = reservationMode === 'lesson' ? golfInstructors : mentalCoaches;

        if (targetList.length === 0) {
            return (
              <div className="text-center p-8">
                <p className="text-slate-400 p-4">등록된 {modeTitle} 전문가가 없어 예약할 수 없습니다.</p>
                <div className="flex justify-center items-center gap-2 mt-4">
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
              </div>
            );
        }
        return (
            <div className="text-center p-8">
                <h3 className="text-lg font-semibold text-white">{modeTitle} 전문가 선택</h3>
                <p className="text-slate-400 mb-4">{`${modeTitle}을 진행할 전문가를 선택해주세요.`}</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {targetList.map(inst => (
                        <button
                            key={inst.id}
                            onClick={() => handleInstructorSelection(inst.id)}
                            className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex flex-col items-center"
                        >
                            <span 
                                className="w-8 h-8 rounded-full mb-2"
                                style={{ backgroundColor: inst.color || '#6b7280' }}
                            ></span>
                            <span className="text-xl font-bold text-white">{inst.name}</span>
                        </button>
                    ))}
                </div>
                <div className="flex justify-center items-center gap-2 mt-8">
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
            </div>
        );
    }

    if (reservationMode === 'lesson') {
        const selectedInstructor = golfInstructors.find(i => i.id === selectedInstructorId);

        if (!selectedDuration) {
          return (
            <div className="text-center p-8">
                <div className="flex justify-center items-center gap-4 mb-4">
                    {golfInstructors.length >= 2 && (
                        <Button
                            onClick={() => {
                                setSelectedInstructorId(null);
                                setSelectedDuration(null);
                            }}
                            variant="secondary"
                            size="sm"
                        >
                            프로 선택
                        </Button>
                    )}
                    <h3 className="text-lg font-semibold text-white">{selectedInstructor?.name} 프로</h3>
                </div>
                <p className="text-slate-400 mb-4">보유한 레슨권에 따라 시간표가 표시됩니다.</p>
                <div className="flex justify-center gap-4">
                  {has30minSessions && <Button onClick={() => setSelectedDuration(30)}>30분 레슨 예약</Button>}
                  {has50minSessions && <Button onClick={() => setSelectedDuration(50)}>50분 레슨 예약</Button>}
                </div>
                {!has30minSessions && !has50minSessions && <p className="text-yellow-400 mt-4">남은 레슨이 없습니다. '레슨상품'에서 상품을 구매해주세요.</p>}
                 <div className="flex justify-center items-center gap-2 mt-8">
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
            </div>
          );
        }

        return (
            <>
                <div className="flex items-center justify-center gap-4 mb-4 p-2 bg-slate-800 border border-yellow-500/30 rounded-lg">
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(-1)}><ChevronLeft size={16}/></Button>
                    <h3 className="text-lg font-bold text-yellow-400 text-center w-48">
                        {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </h3>
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(1)}><ChevronRight size={16}/></Button>
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                    {golfInstructors.length >= 2 && (
                        <Button
                          onClick={() => {
                              setSelectedInstructorId(null);
                              setSelectedDuration(null);
                          }}
                          variant="secondary"
                          size="sm"
                        >
                          프로 선택
                        </Button>
                    )}
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
                
                {!isDateRangeValid ? <p className="text-center text-slate-400 p-4">예약은 오늘부터 7일까지만 가능합니다.</p> : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {availableHours.flatMap(hour => {
                        const minutes = (hour === 21) ? [0, 30] : (selectedDuration === 50 && hour >= 10) ? [0] : [0, 30];
                        return minutes.map(minute => {
                          if (selectedDuration === 50 && minute !== 0) return null;
                          
                          const slotDate = new Date(selectedDate);
                          slotDate.setHours(hour, minute, 0, 0);

                          if (isLessonSlotAvailable(slotDate, selectedDuration)) {
                            return (
                              <Button key={`${hour}:${minute}`} variant="secondary" onClick={() => handleLessonReservation(slotDate)} isLoading={isLoading}>
                                {`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
                              </Button>
                            );
                          }
                          return (
                            <Button key={`${hour}:${minute}`} disabled>
                              {`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}
                            </Button>
                          );
                        });
                      })}
                    </div>
                )}
            </>
        );
    }

    if (reservationMode === 'mental') {
        const selectedCoach = mentalCoaches.find(c => c.id === selectedInstructorId);

        if (!hasMentalSessions) {
             return (
                <div className="text-center p-8">
                    <p className="text-pink-400 mb-4 text-lg">보유한 멘탈코칭 세션이 없습니다.</p>
                    <p className="text-slate-400 mb-6">'레슨상품'에서 멘탈코칭 상품을 구매해주세요.</p>
                    <Button onClick={resetToSelection} variant="secondary" size="sm">뒤로 가기</Button>
                </div>
             );
        }

        return (
            <>
                <div className="flex items-center justify-center gap-4 mb-4 p-2 bg-slate-800 border border-pink-500/30 rounded-lg">
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(-1)}><ChevronLeft size={16}/></Button>
                    <h3 className="text-lg font-bold text-pink-400 text-center w-48">
                        {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </h3>
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(1)}><ChevronRight size={16}/></Button>
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                    {mentalCoaches.length >= 2 && (
                        <Button
                            onClick={() => setSelectedInstructorId(null)}
                            variant="secondary"
                            size="sm"
                        >
                            코치 선택
                        </Button>
                    )}
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
                {selectedCoach && <p className="text-center text-slate-300 mb-4">{selectedCoach.name} 코치 예약</p>}
                
                {!isDateRangeValid ? <p className="text-center text-slate-400 p-4">예약은 오늘부터 7일까지만 가능합니다.</p> : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {availableHours.map(hour => {
                          // Mental coaching assumed to be 50 mins, starting on the hour
                          const slotDate = new Date(selectedDate);
                          slotDate.setHours(hour, 0, 0, 0);

                          if (isLessonSlotAvailable(slotDate, 50)) {
                            return (
                              <Button key={`${hour}:00`} variant="secondary" onClick={() => handleMentalReservation(slotDate)} isLoading={isLoading}>
                                {`${String(hour).padStart(2, '0')}:00`}
                              </Button>
                            );
                          }
                          return (
                            <Button key={`${hour}:00`} disabled>
                              {`${String(hour).padStart(2, '0')}:00`}
                            </Button>
                          );
                      })}
                    </div>
                )}
            </>
        );
    }

    if (reservationMode === 'lesson_room_rental') {
        if (!hasRentalSessions) {
             return (
                <div className="text-center p-8">
                    <p className="text-orange-400 mb-4 text-lg">보유한 대관권이 없습니다.</p>
                    <p className="text-slate-400 mb-6">'레슨상품'에서 대관권을 구매해주세요.</p>
                    <Button onClick={resetToSelection} variant="secondary" size="sm">뒤로 가기</Button>
                </div>
             );
        }

        // No instructor selection needed for unified GC Quad rental
        return (
            <>
                <div className="flex items-center justify-center gap-4 mb-4 p-2 bg-slate-800 border border-orange-500/30 rounded-lg">
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(-1)}><ChevronLeft size={16}/></Button>
                    <h3 className="text-lg font-bold text-orange-400 text-center w-48">
                        {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </h3>
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(1)}><ChevronRight size={16}/></Button>
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
                <div className="text-center mb-4">
                    <p className="text-slate-300 font-bold">GC쿼드(GC Quad) 대관 예약</p>
                    <p className="text-slate-400 text-sm">60분 단위 예약 / 단독 이용 (잔여 대관권: <span className="text-orange-400 font-bold">{member?.membership.sessions['rentals'] || 0}</span>회)</p>
                </div>
                
                {!isDateRangeValid ? <p className="text-center text-slate-400 p-4">예약은 오늘부터 7일까지만 가능합니다.</p> : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {availableHours.map(hour => {
                          const slotDate = new Date(selectedDate);
                          slotDate.setHours(hour, 0, 0, 0);

                          if (isGCQuadAvailable(slotDate)) {
                            return (
                              <Button key={`${hour}:00`} variant="secondary" onClick={() => handleLessonRoomRentalReservation(slotDate)} isLoading={isLoading}>
                                {`${String(hour).padStart(2, '0')}:00`}
                              </Button>
                            );
                          }
                          return (
                            <Button key={`${hour}:00`} disabled>
                              {`${String(hour).padStart(2, '0')}:00`}
                            </Button>
                          );
                      })}
                    </div>
                )}
            </>
        );
    }
    
    if (reservationMode === 'training_room') {
        return (
            <>
                <h2 className="text-xl font-bold text-white mb-4">수련의 방 예약하기</h2>
                <div className="flex items-center justify-center gap-4 mb-4 p-2 bg-slate-800 border border-purple-500/30 rounded-lg">
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(-1)}><ChevronLeft size={16}/></Button>
                    <h3 className="text-lg font-bold text-purple-400 text-center w-48">
                        {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
                    </h3>
                    <Button size="sm" variant="secondary" onClick={() => handleDateChange(1)}><ChevronRight size={16}/></Button>
                </div>
                <div className="flex justify-center items-center gap-2 mb-4">
                    <Button onClick={resetToSelection} variant="secondary" size="sm">예약 종류 다시 선택</Button>
                </div>
                
                {!isDateRangeValid ? (
                    <p className="text-center text-slate-400 p-4">예약은 오늘부터 7일까지만 가능합니다.</p>
                ) : hasTrainingRoomBookingOnSelectedDate ? (
                    <p className="text-center text-yellow-400 p-4">이미 이 날짜에 수련의 방을 예약하셨습니다.</p>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {availableHours.map(hour => {
                            const slotDate = new Date(selectedDate);
                            slotDate.setHours(hour, 0, 0, 0);

                            if (isTrainingRoomSlotAvailable(slotDate)) {
                                return (
                                    <Button key={`${hour}:00`} variant="secondary" onClick={() => handleTrainingRoomReservation(slotDate)} isLoading={isLoading}>
                                        {`${String(hour).padStart(2, '0')}:00`}
                                    </Button>
                                );
                            }
                            return (
                                <Button key={`${hour}:00`} disabled>
                                    {`${String(hour).padStart(2, '0')}:00`}
                                </Button>
                            );
                        })}
                    </div>
                )}
            </>
        );
    }
    return null;
  };
  
  const filterTabs: { id: 'all' | 'lesson' | 'training_room' | 'mental' | 'lesson_room_rental'; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'lesson', label: '레슨' },
    { id: 'mental', label: '멘탈' },
    { id: 'lesson_room_rental', label: 'GC쿼드' },
    { id: 'training_room', label: '수련의 방' },
  ];

  return (
    <div className="space-y-6">
      {!isAdmin && !isInstructor && !isMentalCoach && (
        <Card>
          {renderMemberScheduler()}
        </Card>
      )}

      {isAdmin && (
        <Card>
            <h2 className="text-xl font-bold text-white mb-4">프로/코치별 월간 누적 레슨 (출석 기준)</h2>
            {instructorMonthlyStats.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {instructorMonthlyStats.map(stat => (
                  <div key={stat.id} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                        <span 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stat.color || '#6b7280' }}
                        ></span>
                        <p className="font-semibold text-white">{stat.name} {stat.role === 'mental_coach' ? '코치' : '프로'}</p>
                    </div>
                     <div className="text-right">
                        {stat.role === 'instructor' && (
                            <>
                                <p className="font-semibold text-lg text-yellow-400">50분: <span className="font-bold">{stat.count50}회</span></p>
                                <p className="font-semibold text-sm text-slate-300">30분: <span className="font-bold">{stat.count30}회</span></p>
                            </>
                        )}
                        {stat.role === 'mental_coach' && (
                            <p className="font-semibold text-lg text-pink-400">멘탈: <span className="font-bold">{stat.countMental}회</span></p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-4">이번 달 레슨 데이터가 없습니다.</p>
            )}
        </Card>
      )}
      
      <Card>
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-2">
            <h2 className="text-xl font-bold text-white">
                {isAdmin ? '예약 현황' : (isInstructor ? '나의 레슨 스케줄' : isMentalCoach ? '나의 코칭 스케줄' : '나의 예약')}
            </h2>
        </div>

        {isAdmin && (
            <div className="mb-6 flex justify-center">
                <div className="p-1 bg-slate-900 rounded-full flex items-center justify-around w-full max-w-lg overflow-x-auto">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleFilterChange(tab.id)}
                      className={`relative py-1.5 px-3 sm:px-4 text-sm font-bold rounded-full transition-colors focus:outline-none flex-1 whitespace-nowrap ${
                        filterType === tab.id
                          ? 'text-slate-900'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {filterType === tab.id && (
                        <motion.div
                          layoutId="active-reservation-filter-pill"
                          className="absolute inset-0 bg-yellow-500 rounded-full"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {tab.label}
                        {(unreadLessonReservationsCount ?? 0) > 0 && tab.id === 'lesson' && (
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                        {(unreadMentalReservationsCount ?? 0) > 0 && tab.id === 'mental' && (
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                        {(unreadTrainingRoomReservationsCount ?? 0) > 0 && tab.id === 'training_room' && (
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-semibold text-yellow-400 mb-2">다가오는 예약</h3>
                <div className="h-[400px] overflow-y-auto pr-2">
                    {upcomingReservations.length > 0 ? (
                        <ul className="space-y-2">
                            {upcomingReservations.map(r => {
                                const isLesson = r.type === 'lesson';
                                const isMental = r.type === 'mental';
                                const isRental = r.type === 'lesson_room_rental';
                                
                                let borderColorClass = 'border-l-4 border-purple-500';
                                if (isLesson) {
                                    borderColorClass = r.duration === 30 ? 'border-l-4 border-green-500' : 'border-l-4 border-blue-500';
                                } else if (isMental) {
                                    borderColorClass = 'border-l-4 border-pink-500';
                                } else if (isRental) {
                                    borderColorClass = 'border-l-4 border-orange-500';
                                }
                                
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const resDate = new Date(r.dateTime);
                                resDate.setHours(0,0,0,0);
                                const isPastOrToday = resDate <= today;
                                const isFuture = resDate > today;
                                const instructor = users.find(u => u.id === r.instructorId);

                                let isCancellableByMember = true;
                                if (currentUser?.role === 'member') {
                                    if ((isLesson || isMental || isRental) && isPastOrToday) {
                                        isCancellableByMember = false;
                                    }
                                }

                                const timeDiff = new Date().getTime() - new Date(r.createdAt).getTime();
                                const isNew = timeDiff < 3 * 60 * 1000; // 5 minutes

                                return (
                                    <li key={r.id} className={`flex flex-col sm:flex-row justify-between sm:items-center p-2 pl-4 bg-slate-800 rounded gap-2 ${borderColorClass}`}>
                                        <div>
                                            <div className="font-semibold text-white">
                                                {isAdmin ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="flex items-center gap-2">
                                                            {r.memberName}
                                                            {isNew && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">NEW</span>}
                                                        </span>
                                                        -
                                                        <span className="flex items-center gap-1.5">
                                                            <span 
                                                                className="w-2 h-2 rounded-full"
                                                                style={{ backgroundColor: (isLesson || isMental) ? instructor?.color : isRental ? '#f97316' : '#a855f7' || '#6b7280' }}
                                                            ></span>
                                                            <span>
                                                                {isLesson ? `${r.instructorName} 프로` : isMental ? `${r.instructorName} 멘탈` : isRental ? 'GC쿼드 대관' : '수련의 방'}
                                                            </span>
                                                        </span>
                                                    </div>
                                                ) : (isInstructor || isMentalCoach) ? (
                                                     <span className="flex items-center gap-2">
                                                        {r.memberName}
                                                        {isNew && <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white animate-pulse">NEW</span>}
                                                        {isRental && <span className="text-orange-400 text-xs ml-1">(GC쿼드)</span>}
                                                     </span>
                                                ) : (
                                                    isLesson ? `${r.instructorName} 프로` : isMental ? `${r.instructorName} 멘탈` : isRental ? 'GC쿼드 대관' : '수련의 방'
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-300">{formatReservationDateTime(r.dateTime)} ({r.duration}분)</p>
                                        </div>
                                        <div className="flex items-center gap-2 self-end sm:self-center">
                                            {isFuture && (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">예정</span>
                                            )}
                                            {(isAdmin || isInstructor || isMentalCoach) && isPastOrToday && (
                                                <>
                                                    <Button size="sm" variant="success" onClick={() => handleStatusUpdate(r, 'attended')} disabled={isLoading}>출석</Button>
                                                    <Button size="sm" variant="info" onClick={() => handleStatusUpdate(r, 'absent')} disabled={isLoading}>결석</Button>
                                                </>
                                            )}
                                            {r.status === 'scheduled' &&
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(r)} disabled={isLoading || (currentUser?.role === 'member' && !isCancellableByMember)}>
                                                    {currentUser?.role === 'member' && !isCancellableByMember ? '취소불가' : '취소'}
                                                </Button>
                                            }
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-slate-400">예정된 예약이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
            <div>
                <h3 className="font-semibold text-slate-500 mb-2">지난 예약</h3>
                <div className="h-[400px] overflow-y-auto pr-2">
                    {pastReservations.length > 0 ? (
                        <ul className="space-y-2">
                            {pastReservations.map(r => {
                               const isLesson = r.type === 'lesson';
                               const isMental = r.type === 'mental';
                               const isRental = r.type === 'lesson_room_rental';
                               let borderColorClass = 'border-l-4 border-purple-500';
                               if (isLesson) {
                                   borderColorClass = r.duration === 30 ? 'border-l-4 border-green-500' : 'border-l-4 border-blue-500';
                               } else if (isMental) {
                                   borderColorClass = 'border-l-4 border-pink-500';
                               } else if (isRental) {
                                   borderColorClass = 'border-l-4 border-orange-500';
                               }

                               const today = new Date();
                               today.setHours(0,0,0,0);
                               const resDate = new Date(r.dateTime);
                               resDate.setHours(0,0,0,0);
                               const isPastOrToday = resDate <= today;
                               const instructor = users.find(u => u.id === r.instructorId);

                               return (
                                   <motion.li key={r.id} className="bg-slate-800/50 rounded-lg overflow-hidden">
                                        <div className={`flex flex-col sm:flex-row justify-between sm:items-center p-2 pl-4 gap-2 ${borderColorClass}`}>
                                            <div>
                                                <div className="font-semibold text-slate-300">
                                                    {isAdmin ? (
                                                        <div className="flex items-center gap-2">
                                                            <span>{r.memberName}</span>
                                                            -
                                                            <span className="flex items-center gap-1.5">
                                                                <span 
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: (isLesson || isMental) ? instructor?.color : isRental ? '#f97316' : '#a855f7' || '#6b7280' }}
                                                                ></span>
                                                                <span>{isLesson ? `${r.instructorName} 프로` : isMental ? `${r.instructorName} 멘탈` : isRental ? 'GC쿼드 대관' : '수련의 방'}</span>
                                                            </span>
                                                        </div>
                                                    ) : (isInstructor || isMentalCoach) ? (
                                                        r.memberName
                                                    ) : (
                                                        isLesson ? `${r.instructorName} 프로` : isMental ? `${r.instructorName} 멘탈` : isRental ? 'GC쿼드 대관' : '수련의 방'
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500">{formatReservationDateTime(r.dateTime)} ({r.duration}분)</p>
                                            </div>
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                { (isAdmin || isInstructor || isMentalCoach) && r.status === 'scheduled' && isPastOrToday && (
                                                    <>
                                                        <Button size="sm" variant="success" onClick={() => handleStatusUpdate(r, 'attended')} disabled={isLoading}>출석</Button>
                                                        <Button size="sm" variant="info" onClick={() => handleStatusUpdate(r, 'absent')} disabled={isLoading}>결석</Button>
                                                    </>
                                                )}
                                                { r.status === 'attended' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-400">출석 완료</span> }
                                                { r.status === 'absent' && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">결석 처리</span> }
                                                { isAdmin && r.status !== 'scheduled' && <Button size="sm" variant="destructive" onClick={() => handleDelete(r)} disabled={isLoading}>삭제</Button> }
                                            </div>
                                        </div>
                                   </motion.li>
                               );
                            })}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-slate-400">지난 예약 기록이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </Card>
      
      <AnimatePresence>
        {cancellationToConfirm && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9998] p-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl w-full max-w-md"
                >
                    <form onSubmit={handleConfirmCancellation}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white">예약 취소 확인</h2>
                            <button type="button" onClick={() => setCancellationToConfirm(null)} className="text-slate-400 hover:text-white" disabled={isLoading}><X size={20}/></button>
                        </div>
                        <p className="text-slate-300 mb-4 whitespace-pre-wrap">
                           {`정말로 ${cancellationToConfirm.memberName}님의 예약을 취소하시겠습니까? 작업을 계속하려면 관리자 비밀번호를 입력하세요.`}
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-1">관리자 비밀번호</label>
                            <Input
                                type="password"
                                value={adminPassword}
                                onChange={e => setAdminPassword(e.target.value)}
                                placeholder="비밀번호를 입력하세요"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" onClick={() => setCancellationToConfirm(null)} variant="secondary">취소</Button>
                            <Button type="submit" variant="destructive" isLoading={isLoading}>확인 및 취소</Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reservations;
