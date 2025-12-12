import React, { useState, useMemo } from 'react';
import type { NotificationItem, User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2, MailOpen, Search, Archive } from 'lucide-react';

interface NotificationsPageProps {
  notifications: NotificationItem[];
  updateCurrentUser: (user: User) => void;
  onMarkAllAsRead: () => void;
  onDeleteSelected?: (selectedIds: Set<string>) => void;
  onDeleteAll?: (allVisibleIds: string[]) => void;
  onNotificationClick: (notificationId: string) => void;
}

type NotificationFilterType = 'all' | 'payment' | 'lesson' | 'reservation';

const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  updateCurrentUser,
  onMarkAllAsRead,
  onDeleteSelected,
  onDeleteAll,
  onNotificationClick,
}) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirmation();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'archived'>('all');
  const [activeFilter, setActiveFilter] = useState<NotificationFilterType>('all');

  const visibleNotifications = useMemo(() => {
    if (!currentUser) return [];

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let filtered = notifications.filter(n => {
      const isDeleted = currentUser.notificationsDeleted?.[n.id];
      if (isDeleted) return false;

      if (currentUser.role === 'admin') {
        const isArchived = currentUser.archivedNotificationIds?.[n.id];
        
        if (viewMode === 'archived') {
            return isArchived;
        }

        const notificationDate = new Date(n.createdAt);
        return isArchived || notificationDate >= oneYearAgo;
      }
      
      return true;
    });
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(n => n.type === activeFilter);
    }

    if (currentUser.role === 'admin' && searchTerm.trim()) {
      const lowercasedTerm = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(n =>
        n.body?.toLowerCase().includes(lowercasedTerm) ||
        n.title?.toLowerCase().includes(lowercasedTerm)
      );
    }

    return filtered;
  }, [notifications, currentUser, searchTerm, viewMode, activeFilter]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === visibleNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleNotifications.map(n => n.id)));
    }
  };

  const handleDeleteSelectedClick = () => {
    if (onDeleteSelected) {
      onDeleteSelected(selectedIds);
      setSelectedIds(new Set());
    }
  };
  
  const handleDeleteAllClick = () => {
    if (onDeleteAll) {
      onDeleteAll(visibleNotifications.map(n => n.id));
      setSelectedIds(new Set());
    }
  };

  const handleArchiveSelectedClick = async () => {
    if (selectedIds.size === 0) return;
    const isConfirmed = await confirm(`${selectedIds.size}개의 알림을 영구 보관하시겠습니까? 보관된 알림은 1년이 지나도 삭제되지 않습니다.`);
    if (isConfirmed && currentUser) {
        try {
            const updatedUser = await api.archiveNotifications(currentUser.id, Array.from(selectedIds));
            if (updatedUser) {
                updateCurrentUser(updatedUser);
            }
            showToast('성공', `${selectedIds.size}개의 알림이 영구 보관 처리되었습니다.`, 'success');
            setSelectedIds(new Set());
        } catch (error) {
            showToast('오류', '알림 보관 중 오류가 발생했습니다.', 'error');
        }
    }
  };
  
  const getEmptyMessage = () => {
    if (viewMode === 'archived') {
      return '보관된 알림이 없습니다.';
    }
    if (searchTerm) {
      return '검색 결과가 없습니다.';
    }
    return '알림이 없습니다.';
  };

  const unreadCount = visibleNotifications.filter(n => !currentUser?.notificationsRead?.[n.id]).length;

  const filterTabs: { id: NotificationFilterType; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'payment', label: '결제' },
    { id: 'lesson', label: '레슨' },
    { id: 'reservation', label: '예약' },
  ];

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-white">
          {viewMode === 'all' ? '알림함' : '영구 보관함'}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser?.role === 'admin' && (
            <div className="relative">
              <Input 
                placeholder="회원명 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 sm:w-48"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            </div>
          )}
          {unreadCount > 0 && viewMode === 'all' && <Button onClick={onMarkAllAsRead} size="sm" variant="secondary"><MailOpen size={16} className="mr-2"/>모두 읽음</Button>}
          {currentUser?.role === 'admin' && (
            <Button onClick={handleArchiveSelectedClick} size="sm" variant="secondary" disabled={selectedIds.size === 0}><Archive size={16} className="mr-2"/>영구 보관</Button>
          )}
          {currentUser?.role === 'admin' && (
            <Button onClick={() => setViewMode(p => p === 'all' ? 'archived' : 'all')} size="sm" variant="secondary">
                {viewMode === 'all' ? '보관함 보기' : '전체 알림'}
            </Button>
          )}
          {onDeleteSelected && <Button onClick={handleDeleteSelectedClick} size="sm" variant="destructive" disabled={selectedIds.size === 0}><Trash2 size={16} className="mr-2"/>선택 삭제</Button>}
          {onDeleteAll && <Button onClick={handleDeleteAllClick} size="sm" variant="destructive" disabled={visibleNotifications.length === 0}>전체 삭제</Button>}
        </div>
      </div>

      {currentUser?.role === 'admin' && (
        <div className="mb-6 flex justify-center">
            <div className="p-1 bg-slate-900 rounded-full flex items-center justify-around w-full max-w-lg">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`relative py-1.5 px-4 text-sm font-bold rounded-full transition-colors focus:outline-none flex-1 ${
                    activeFilter === tab.id
                      ? 'text-slate-900'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {activeFilter === tab.id && (
                    <motion.div
                      layoutId="notification-filter-pill"
                      className="absolute inset-0 bg-yellow-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>
        </div>
      )}

      {visibleNotifications.length === 0 ? (
        <p className="text-slate-400 text-center py-8">{getEmptyMessage()}</p>
      ) : (
        <div className="max-h-[65vh] overflow-y-auto pr-2 -mr-2">
            <ul className="space-y-3">
            <li className="flex items-center px-4 py-2">
                <input
                type="checkbox"
                checked={selectedIds.size === visibleNotifications.length && visibleNotifications.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                />
                <label className="ml-3 text-sm font-medium text-slate-300 cursor-pointer" onClick={handleSelectAll}>
                전체 선택
                </label>
            </li>
            <AnimatePresence>
                {visibleNotifications.map(n => {
                const isRead = currentUser?.notificationsRead?.[n.id];
                const isSelected = selectedIds.has(n.id);
                const isArchived = currentUser?.role === 'admin' && currentUser.archivedNotificationIds?.[n.id];

                return (
                    <motion.li
                    key={n.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -50 }}
                    className={`flex items-start p-4 rounded-lg border transition-colors duration-300 cursor-pointer ${
                        isSelected ? 'bg-slate-700/80 border-yellow-500/50' : isRead ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-700/50 border-slate-600'
                    }`}
                    onClick={() => onNotificationClick(n.id)}
                    >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelect(n.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                    />
                    <div className="ml-4 flex-grow">
                        <div className="flex items-center gap-2">
                            <p className={`font-semibold text-sm ${isRead ? 'text-slate-300' : 'text-white'}`}>{n.title}</p>
                            {isArchived && <Archive size={12} className="text-yellow-400 flex-shrink-0" />}
                        </div>

                        {n.body && <p className={`text-sm mt-1 ${isRead ? 'text-slate-400' : 'text-slate-200'}`}>{n.body}</p>}
                        <p className="text-xs text-slate-500 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    {!isRead && <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0 animate-pulse"></div>}
                    </motion.li>
                );
                })}
            </AnimatePresence>
            </ul>
        </div>
      )}
    </Card>
  );
};

export default NotificationsPage;