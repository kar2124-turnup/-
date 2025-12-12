
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { User, LessonEntry, NotificationItem, TurnUpTab, Reservation } from '../../types';
import { useToast } from '../../contexts/ToastContext';

import Header from '../Header';
import Lessons from '../content/Lessons';
import Reservations from '../content/Reservations';
import NotificationsPage from '../content/NotificationsPage';

interface MentalCoachDashboardProps {
  currentUser: User;
}

const MentalCoachDashboard: React.FC<MentalCoachDashboardProps> = ({ currentUser }) => {
  const { users, setUsers, updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TurnUpTab>('reservations');
  const [journalMemberId, setJournalMemberId] = useState<string | null>(null);

  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [lessonsData, notificationsData, reservationsData, usersData] = await Promise.all([
          api.getLessons(),
          api.getNotifications(),
          api.getReservations(),
          api.getUsers(),
        ]);
        setLessons(lessonsData);
        setNotifications(notificationsData);
        setReservations(reservationsData);
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    
    const interval = setInterval(async () => {
      try {
        const [notificationsData, reservationsData] = await Promise.all([
          api.getNotifications(),
          api.getReservations(),
        ]);
        setNotifications(notificationsData);
        setReservations(reservationsData);
      } catch (error) {
        console.error("Failed to poll for updates:", (error as Error).message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [setUsers, currentUser.id]);

  const coachNotifications = useMemo(() => {
    return notifications.filter(n => n.userId === currentUser.id);
  }, [notifications, currentUser.id]);

  const unreadReservationsCount = useMemo(() => {
      if (!currentUser || !notifications) return 0;
      return notifications.filter(n => !currentUser.notificationsRead?.[n.id] && n.userId === currentUser.id && n.type === 'reservation').length;
  }, [notifications, currentUser]);


  const handleTabClick = (tab: TurnUpTab) => {
    setActiveTab(tab);
  };

  const handleWriteJournal = (memberId: string) => {
    setJournalMemberId(memberId);
    setActiveTab('lessons');
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = coachNotifications.filter(n => !currentUser.notificationsRead?.[n.id]);
      if (unreadNotifications.length === 0) return;

      let latestUser = currentUser;
      for (const notification of unreadNotifications) {
        const updatedUser = await api.markNotificationAsRead(currentUser.id, notification.id);
        if (updatedUser) {
            latestUser = updatedUser;
        }
      }

      const allUsers = await api.getUsers();
      setUsers(allUsers);
      updateCurrentUser(latestUser);
      
      const newNotifications = await api.getNotifications();
      setNotifications(newNotifications);

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

  const unreadCount = useMemo(() => {
    return coachNotifications.filter(n => !currentUser.notificationsRead?.[n.id]).length;
  }, [coachNotifications, currentUser]);

  const sortedNotifications = useMemo(() => 
    [...coachNotifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  , [coachNotifications]);

  const TABS: { id: TurnUpTab; label: string }[] = [
    { id: 'reservations', label: '코칭 스케줄' },
    { id: 'lessons', label: '코칭일지' },
    { id: 'notifications', label: '알림함' },
  ];

  const TAB_TITLE_MAP: Record<TurnUpTab, string> = {
    lessons: '코칭일지 관리',
    reservations: '나의 코칭 스케줄',
    notifications: '알림함',
    dashboard: '', home: '', notices: '', price: '', profile: '', instructors: '', users: '',
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center p-8">데이터를 불러오는 중...</div>;
    }
    switch (activeTab) {
      case 'lessons':
        return <Lessons lessons={lessons} setLessons={setLessons} setNotifications={setNotifications} memberIdForNewJournal={journalMemberId} onJournalCreated={() => setJournalMemberId(null)} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
       case 'reservations':
        // Reuse Reservations component but filter logic inside ensures correct display
        return <Reservations reservations={reservations} setReservations={setReservations} setUsers={setUsers} instructors={[]} setNotifications={setNotifications} updateCurrentUser={updateCurrentUser} lessons={lessons} onWriteJournal={handleWriteJournal} notifications={notifications} currentUser={currentUser} />;
      case 'notifications':
        return <NotificationsPage notifications={sortedNotifications} updateCurrentUser={updateCurrentUser} onMarkAllAsRead={markAllAsRead} onNotificationClick={handleNotificationClick} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 pb-16">
        <Header 
          unreadCount={unreadCount} 
          notifications={sortedNotifications}
          onMarkAllAsRead={markAllAsRead}
          pageTitle={TAB_TITLE_MAP[activeTab]}
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
                                ? 'border-pink-400 text-pink-400'
                                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
                            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xl transition-colors flex items-center`}
                        >
                            {tab.label}
                            {tab.id === 'reservations' && unreadReservationsCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadReservationsCount}</span>
                            )}
                            {tab.id === 'notifications' && unreadCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default MentalCoachDashboard;
