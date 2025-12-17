
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';
import type { User, Notice, LessonEntry, PriceItem, NotificationItem, TurnUpTab, Payment, Reservation } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { useLocalState } from '../../hooks/useLocalState';

import Header from '../Header';
import Notices from '../content/Notices';
import Lessons from '../content/Lessons';
import PriceList from '../content/PriceList';
import Profile from '../content/Profile';
import Reservations from '../content/Reservations';
// MentalAnalysis import removed
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import NotificationsPage from '../content/NotificationsPage';
import PasswordChangeModal from '../PasswordChangeModal';
// Brain icon removed


interface MemberDashboardProps {
  currentUser: User;
}

const MemberDashboard: React.FC<MemberDashboardProps> = ({ currentUser }) => {
  const { users, setUsers, updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirmation();
  const [activeTab, setActiveTab] = useLocalState<TurnUpTab>('turn-up-golf-member-active-tab', 'home');

  const [notices, setNotices] = useState<Notice[]>([]);
  const [lessons, setLessons] = useState<LessonEntry[]>([]);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  // Password Change Modal State
  const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);

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
  }, [setUsers, currentUser.id]);
  
  const hasEvent = useMemo(() => prices.some(p => p.isEvent), [prices]);

  const { unreadReservationsCount, unreadPaymentsCount } = useMemo(() => {
    const counts = { unreadReservationsCount: 0, unreadPaymentsCount: 0 };
    if (!currentUser || !notifications) return counts;
    
    notifications.forEach(n => {
      if (!currentUser.notificationsRead?.[n.id] && !currentUser.notificationsDeleted?.[n.id]) {
        if (n.type === 'payment' && n.userId === currentUser.id) {
          counts.unreadPaymentsCount++;
        } else if (n.type === 'reservation' && n.userId === currentUser.id) {
          counts.unreadReservationsCount++;
        }
      }
    });
    return counts;
  }, [notifications, currentUser]);

  const upcomingReservations = useMemo(() => {
    return reservations
        .filter(r => r.memberId === currentUser.id && new Date(r.dateTime) >= new Date())
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [reservations, currentUser.id]);

  // Stats for Home Screen
  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);

    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let lessonsToday = 0;
    let lessonsThisWeek = 0;
    let trainingRoomThisMonth = 0;

    reservations.forEach(r => {
        if (r.memberId === currentUser.id && r.status !== 'absent') { // Include scheduled & attended
            const rDate = new Date(r.dateTime);
            if (r.type === 'lesson') {
                if (rDate >= startOfToday && rDate < endOfToday) lessonsToday++;
                if (rDate >= startOfWeek && rDate < endOfWeek) lessonsThisWeek++;
            } else if (r.type === 'training_room') {
                if (rDate >= startOfMonth && rDate <= endOfMonth) trainingRoomThisMonth++;
            }
        }
    });

    return { lessonsToday, lessonsThisWeek, trainingRoomThisMonth };
  }, [reservations, currentUser.id]);


  const handleTabClick = (tab: TurnUpTab) => {
    setActiveTab(tab);
  };

  const markAllAsRead = async () => {
    try {
      const userNotifications = notifications.filter(n => (n.userId === currentUser.id || n.userId === null) && !currentUser.notificationsDeleted?.[n.id]);
      const unreadNotifications = userNotifications.filter(n => !currentUser.notificationsRead?.[n.id]);
      
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

  const userNotifications = useMemo(() => {
    return notifications.filter(n => n.userId === currentUser.id || n.userId === null);
  }, [notifications, currentUser]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter(n => !currentUser.notificationsRead?.[n.id] && !currentUser.notificationsDeleted?.[n.id]).length;
  }, [userNotifications, currentUser]);

  const sortedNotifications = [...userNotifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const instructors = useMemo(() => users.filter(u => u.role === 'instructor'), [users]);

  const TABS: { id: TurnUpTab; label: string }[] = [
    { id: 'home', label: '홈' },
    { id: 'reservations', label: '시설예약' },
    { id: 'lessons', label: '레슨일지' },
    { id: 'notices', label: '공지사항' },
    { id: 'price', label: '레슨상품' },
    { id: 'notifications', label: '알림함' },
    { id: 'profile', label: '내 정보' },
  ];
  
  const TAB_TITLE_MAP: Record<string, string> = {
    dashboard: '홈',
    home: '홈',
    notices: '공지사항',
    lessons: '나의 레슨일지',
    reservations: '시설 예약',
    price: '레슨상품 안내',
    profile: '내 정보',
    instructors: '프로 소개',
    notifications: '알림함',
    users: '회원 통합 관리'
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="text-center p-8">데이터를 불러오는 중...</div>;
    }
    switch (activeTab) {
      case 'home':
        return (
            <div className="space-y-6">
                {/* Status Cards Row */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="!p-4 flex flex-col items-center justify-center text-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
                        <p className="text-xs text-slate-400 mb-1">금일 레슨</p>
                        <p className="text-2xl font-bold text-white">{stats.lessonsToday}회</p>
                    </Card>
                    <Card className="!p-4 flex flex-col items-center justify-center text-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
                        <p className="text-xs text-slate-400 mb-1">이번 주 레슨</p>
                        <p className="text-2xl font-bold text-white">{stats.lessonsThisWeek}회</p>
                    </Card>
                    <Card className="!p-4 flex flex-col items-center justify-center text-center bg-slate-800/50 hover:bg-slate-800 transition-colors">
                        <p className="text-xs text-slate-400 mb-1">이번 달 수련</p>
                        <p className="text-2xl font-bold text-white">{stats.trainingRoomThisMonth}회</p>
                    </Card>
                </div>

                {/* Remaining Lessons Card */}
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700">
                    <h2 className="text-lg font-bold text-white mb-6 text-center">나의 잔여 레슨</h2>
                    <div className="flex justify-around items-center">
                        <div className="text-center flex-1">
                            <p className="text-slate-400 mb-2 font-medium">30분 레슨</p>
                            <p className="text-5xl font-extrabold text-yellow-400">{currentUser.membership.sessions['30']}<span className="text-xl font-medium text-slate-500 ml-1">회</span></p>
                        </div>
                        <div className="w-px h-20 bg-slate-700"></div>
                        <div className="text-center flex-1">
                            <p className="text-slate-400 mb-2 font-medium">50분 레슨</p>
                            <p className="text-5xl font-extrabold text-yellow-400">{currentUser.membership.sessions['50']}<span className="text-xl font-medium text-slate-500 ml-1">회</span></p>
                        </div>
                        {(currentUser.membership.sessions['mental'] || 0) > 0 && (
                            <>
                                <div className="w-px h-20 bg-slate-700"></div>
                                <div className="text-center flex-1">
                                    <p className="text-slate-400 mb-2 font-medium">멘탈코칭</p>
                                    <p className="text-5xl font-extrabold text-purple-400">{currentUser.membership.sessions['mental']}<span className="text-xl font-medium text-slate-500 ml-1">회</span></p>
                                </div>
                            </>
                        )}
                    </div>
                </Card>

                {upcomingReservations.length > 0 && (
                  <Card>
                      <h2 className="text-xl font-bold text-white mb-4">나의 다가오는 예약</h2>
                      <ul className="space-y-3">
                          {upcomingReservations.slice(0, 3).map(r => {
                              const isLesson = r.type === 'lesson';
                              const borderColorClass = isLesson 
                                ? (r.duration === 30 ? 'border-l-4 border-green-500' : 'border-l-4 border-blue-500')
                                : 'border-l-4 border-purple-500';
                              return (
                                <li key={r.id} className={`flex flex-col sm:flex-row justify-between sm:items-center bg-slate-800 p-3 pl-4 rounded-lg gap-2 ${borderColorClass}`}>
                                  <div>
                                      <p className="font-semibold text-white">{isLesson ? `${r.instructorName} 프로` : '수련의 방'}</p>
                                      <p className="text-sm text-slate-400">{new Date(r.dateTime).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })} ({r.duration}분)</p>
                                  </div>
                                  <Button size="sm" variant="secondary" onClick={() => setActiveTab('reservations')}>예약 관리</Button>
                                </li>
                              );
                          })}
                      </ul>
                  </Card>
                )}
                
                <Notices notices={notices} setNotices={setNotices} setNotifications={setNotifications} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />
            </div>
        );
      case 'notices':
        return <Notices notices={notices} setNotices={setNotices} setNotifications={setNotifications} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
      case 'lessons':
        return <Lessons lessons={lessons} setLessons={setLessons} setNotifications={setNotifications} notifications={notifications} currentUser={currentUser} updateCurrentUser={updateCurrentUser} />;
      case 'reservations':
        return <Reservations reservations={reservations} setReservations={setReservations} updateCurrentUser={updateCurrentUser} instructors={instructors} setNotifications={setNotifications} notifications={notifications} currentUser={currentUser} />;
      case 'price':
        return <PriceList prices={prices} setPrices={() => {}} />;
      case 'notifications':
        return <NotificationsPage notifications={sortedNotifications} updateCurrentUser={updateCurrentUser} onMarkAllAsRead={markAllAsRead} onDeleteSelected={handleDeleteSelected} onDeleteAll={handleDeleteAll} onNotificationClick={handleNotificationClick} />;
      case 'profile':
        return <Profile onImpersonate={() => {}} payments={payments} prices={prices} />;
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
            pageTitle={TAB_TITLE_MAP[activeTab as string] || '홈'}
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
                              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-xl transition-colors flex items-center`}
                          >
                              {tab.label}
                              {tab.id === 'notifications' && unreadCount > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                              )}
                              {tab.id === 'price' && hasEvent && (
                                <span className="ml-2 text-xs bg-yellow-500 text-slate-900 font-bold px-2 py-0.5 rounded-full animate-pulse">
                                  EVENT
                                </span>
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

export default MemberDashboard;
