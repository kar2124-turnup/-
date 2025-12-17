
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { User, Notice, LessonEntry, PriceItem, NotificationItem, TurnUpTab, Payment, Reservation } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';

import Header from '../Header';
import Dashboard from '../content/Dashboard';
import Notices from '../content/Notices';
import Lessons from '../content/Lessons';
import PriceList from '../content/PriceList';
import Reservations from '../content/Reservations';
import UserManagement from '../content/UserManagement';
import NotificationsPage from '../content/NotificationsPage';
import Lockers from '../content/Lockers'; 
import Settlement from '../content/Settlement'; 
import Consultations from '../content/Consultations'; // New Import
import PasswordChangeModal from '../PasswordChangeModal';
import { useLocalState } from '../../hooks/useLocalState';

interface AdminDashboardProps {
  currentUser: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const { users, setUsers, updateCurrentUser, impersonateSession } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirmation();
  const [activeTab, setActiveTab] = useLocalState<TurnUpTab>('turn-up-golf-admin-active-tab', 'dashboard');

  const [notices, setNotices] = useState<Notice[]>([]);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
  const [journalMemberId, setJournalMemberId] = useState<string | null>(null);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [noticesData, lessonsData, pricesData, notificationsData, paymentsData, reservationsData, usersData] = await Promise.all([
          api.getNotices(),
          api.getLessons(),
          api.getPrices(),
          api.getNotifications(),
          api.getPayments(),
          api.getReservations(),
          api.getUsers(),
        ]);
        setNotices(noticesData);
        setLessons(lessonsData);
        setPrices(pricesData);
        setNotifications(notificationsData);
        setPayments(paymentsData);
        setReservations(reservationsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // Polling for real-time updates (reservations, notifications, payments)
    const interval = setInterval(async () => {
        try {
            const [notificationsData, reservationsData, paymentsData, lessonsData] = await Promise.all([
                api.getNotifications(),
                api.getReservations(),
                api.getPayments(),
                api.getLessons()
            ]);
            setNotifications(notificationsData);
            setReservations(reservationsData);
            setPayments(paymentsData);
            setLessons(lessonsData);
        } catch (error) {
            console.error("Failed to poll for updates:", (error as Error).message);
        }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);

  }, [setUsers, currentUser.id]);

  const { unreadPaymentsCount, unreadLessonReservationsCount, unreadTrainingRoomReservationsCount, unreadMentalReservationsCount } = useMemo(() => {
    const counts = { unreadPaymentsCount: 0, unreadLessonReservationsCount: 0, unreadTrainingRoomReservationsCount: 0, unreadMentalReservationsCount: 0 };
    if (!currentUser || !notifications) return counts;

    notifications.forEach(n => {
        if (!currentUser.notificationsRead?.[n.id] && !currentUser.notificationsDeleted?.[n.id] && n.userId === currentUser.id) {
            if (n.type === 'payment') {
                counts.unreadPaymentsCount++;
            } else if (n.type === 'reservation') {
                const res = reservations.find(r => r.id === n.refId);
                if (res?.type === 'lesson') {
                    counts.unreadLessonReservationsCount++;
                } else if (res?.type === 'training_room') {
                    counts.unreadTrainingRoomReservationsCount++;
                } else if (res?.type === 'mental') {
                    counts.unreadMentalReservationsCount++;
                }
            }
        }
    });
    return counts;
  }, [notifications, currentUser, reservations]);

  const handleTabClick = (tab: TurnUpTab) => {
    setActiveTab(tab);
  };
  
  const handleMarkNotificationsAsReadByType = async (type: 'notice' | 'lesson' | 'payment' | 'reservation') => {
      try {
        const updatedUser = await api.markNotificationsAsReadByType(currentUser.id, type);
        if (updatedUser) {
          updateCurrentUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
      } catch (error) {
        console.error(`Failed to mark ${type} notifications as read:`, (error as Error).message);
      }
  };

  const markAllAsRead = async () => {
    try {
      const userNotifications = notifications.filter(n => (n.userId === currentUser.id || n.userId === null) && !currentUser.notificationsDeleted?.[n.id]);
      const unreadNotifications = userNotifications.filter(n => !currentUser.notificationsRead?.[n.id]);
      
      if (unreadNotifications.length === 0) return;
      
      let latestUser = currentUser;
      for (const notification of unreadNotifications) {
          const updatedUser = await api.markNotificationAsRead(currentUser.id, notification.id);
          if (updatedUser) latestUser = updatedUser;
      }
      const allUsers = await api.getUsers();
      setUsers(allUsers);
      updateCurrentUser(latestUser);
    } catch (error) {
      console.error("Failed to mark notifications as read:", (error as Error).message);
      showToast('오류', '알림을 읽음 처리하는 중 오류가 발생했습니다.', 'error');
    }
  };
  
  const handleNotificationClick = async (notificationId: string) => {
    if (currentUser && !currentUser.notificationsRead?.[notificationId]) {
      try {
        const updatedUser = await api.markNotificationAsRead(currentUser.id, notificationId);
        if (updatedUser) {
          updateCurrentUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", (error as Error).message);
        showToast('오류', '알림을 읽음 처리하는 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const handleDeleteSelected = async (selectedIds: Set<string>) => {
    if (selectedIds.size === 0) return;
    const isConfirmed = await confirm(`${selectedIds.size}개의 알림을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
    if (isConfirmed) {
        try {
            const updatedUser = await api.deleteNotificationsForUser(currentUser.id, Array.from(selectedIds));
            if (updatedUser) {
                updateCurrentUser(updatedUser);
                setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            }
            showToast('성공', `${selectedIds.size}개의 알림이 삭제되었습니다.`, 'success');
        } catch (error) {
            showToast('오류', '알림 삭제 중 오류가 발생했습니다.', 'error');
        }
    }
  };

  const handleDeleteAll = async (allVisibleIds: string[]) => {
      if (allVisibleIds.length === 0) return;
      const isConfirmed = await confirm(`모든 알림(${allVisibleIds.length}개)을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`);
      if (isConfirmed) {
          try {
              const updatedUser = await api.deleteNotificationsForUser(currentUser.id, allVisibleIds);
              if (updatedUser) {
                  updateCurrentUser(updatedUser);
                  setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
              }
              showToast('성공', '모든 알림이 삭제되었습니다.', 'success');
          } catch (error) {
              showToast('오류', '알림 삭제 중 오류가 발생했습니다.', 'error');
          }
      }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      const updatedUser = await api.changePassword(currentUser.id, currentPassword, newPassword);
      updateCurrentUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      setPasswordModalOpen(false);
      showToast('성공', '비밀번호가 변경되었습니다.', 'success');
    } catch (error) {
      showToast('오류', (error as Error).message, 'error');
      throw error;
    }
  };

  const handleWriteJournal = (memberId: string) => {
    setJournalMemberId(memberId);
    setActiveTab('lessons');
  };

  const adminNotifications = useMemo(() => {
    return notifications.filter(n => n.userId === currentUser.id);
  }, [notifications, currentUser.id]);

  const unreadCount = useMemo(() => {
    return adminNotifications.filter(n => !currentUser.notificationsRead?.[n.id]).length;
  }, [adminNotifications, currentUser]);

  const sortedNotifications = [...adminNotifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const instructors = useMemo(() => users.filter(u => u.role === 'instructor'), [users]);

  // Calculate unread reservation notifications including the new type
  const totalUnreadReservations = useMemo(() => {
      if (!currentUser || !notifications) return 0;
      return notifications.filter(n => {
          return !currentUser.notificationsRead?.[n.id] && 
                 !currentUser.notificationsDeleted?.[n.id] && 
                 n.userId === currentUser.id && 
                 n.type === 'reservation';
      }).length;
  }, [notifications, currentUser]);

  const TABS: { id: TurnUpTab; label: string; unreadCount?: number }[] = [
    { id: 'dashboard', label: '대시보드', unreadCount: unreadPaymentsCount },
    { id: 'notices', label: '공지사항' },
    { id: 'reservations', label: '예약관리', unreadCount: totalUnreadReservations },
    { id: 'lessons', label: '레슨일지' },
    { id: 'crm', label: '상담일지' },
    { id: 'users', label: '통합회원관리' },
    { id: 'price', label: '상품관리' },
    { id: 'lockers', label: '락커관리' },
    { id: 'settlement', label: '강사매출' },
    { id: 'notifications', label: '알림함', unreadCount },
  ];
  
  const TAB_TITLE_MAP: Record<TurnUpTab, string> = {
    dashboard: '관리자 대시보드',
    home: '관리자 대시보드',
    notices: '공지사항 관리',
    lessons: '레슨일지 관리',
    reservations: '전체 예약 관리',
    price: '레슨상품 관리',
    profile: '회원 관리',
    instructors: '프로 관리',
    notifications: '관리자 알림함',
    users: '통합 회원 관리',
    lockers: '락커 관리',
    settlement: '강사매출 관리',
    crm: '회원 상담 관리'
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-8">데이터를 불러오는 중...</div>;
    }
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard users={users} notices={notices} lessons={lessons} reservations={reservations} payments={payments} prices={prices} unreadPaymentsCount={unreadPaymentsCount} onViewTodayRevenue={() => handleMarkNotificationsAsReadByType('payment')} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} setNotifications={setNotifications} />;
      case 'notices':
        return <Notices notices={notices} setNotices={setNotices} setNotifications={setNotifications} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
      case 'lessons':
        return <Lessons lessons={lessons} setLessons={setLessons} setNotifications={setNotifications} memberIdForNewJournal={journalMemberId} onJournalCreated={() => setJournalMemberId(null)} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
      case 'reservations':
        return <Reservations reservations={reservations} setReservations={setReservations} setUsers={setUsers} instructors={instructors} setNotifications={setNotifications} lessons={lessons} onWriteJournal={handleWriteJournal} unreadLessonReservationsCount={unreadLessonReservationsCount} unreadTrainingRoomReservationsCount={unreadTrainingRoomReservationsCount} unreadMentalReservationsCount={unreadMentalReservationsCount} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
      case 'price':
        return <PriceList prices={prices} setPrices={setPrices} />;
      case 'users':
        return <UserManagement onImpersonate={impersonateSession} payments={payments} prices={prices} />;
      case 'lockers':
        return <Lockers />;
      case 'settlement':
        return <Settlement users={users} reservations={reservations} />;
      case 'crm':
        return <Consultations />;
      case 'notifications':
        return <NotificationsPage 
            notifications={sortedNotifications} 
            updateCurrentUser={updateCurrentUser} 
            onMarkAllAsRead={markAllAsRead} 
            onNotificationClick={handleNotificationClick} 
            onDeleteSelected={handleDeleteSelected}
            onDeleteAll={handleDeleteAll}
        />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="container mx-auto px-4 pb-16">
          <Header
            unreadCount={unreadCount}
            notifications={sortedNotifications}
            onMarkAllAsRead={markAllAsRead}
            pageTitle={TAB_TITLE_MAP[activeTab]}
            onPasswordChangeClick={() => setPasswordModalOpen(true)}
            onNotificationClick={handleNotificationClick}
          />
          <main className="mt-4">
            <div className="mb-6 border-b border-slate-700">
              <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-yellow-400 text-yellow-400'
                        : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                    } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-base sm:text-lg transition-colors flex items-center`}
                  >
                    {tab.label}
                    {(tab.unreadCount ?? 0) > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{tab.unreadCount}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            {renderContent()}
          </main>
        </div>
      </div>
      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSave={handlePasswordChange}
      />
    </>
  );
};

export default AdminDashboard;
