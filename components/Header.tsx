import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import BellIcon from './icons/BellIcon';
import type { NotificationItem } from '../types';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';

interface HeaderProps {
  unreadCount: number;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  pageTitle: string;
  onPasswordChangeClick?: () => void;
  onNotificationClick: (notificationId: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  unreadCount,
  notifications,
  onMarkAllAsRead,
  pageTitle,
  onPasswordChangeClick,
  onNotificationClick,
}) => {
  const { currentUser, logout } = useAuth();
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full flex justify-between items-center py-4">
        <div>
            <p className="text-base text-slate-500">TURN UP GOLF STUDIO</p>
            <h1 className="text-4xl font-bold text-white">{pageTitle}</h1>
        </div>
      <div className="flex items-center gap-4">
        {currentUser && (
          <>
            {(currentUser.role === 'admin' || currentUser.role === 'member') && onPasswordChangeClick ? (
              <button onClick={onPasswordChangeClick} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
                <Lock size={14} />
                <span>{currentUser.name}님</span>
              </button>
            ) : (
              <span className="text-sm text-slate-300">{currentUser.name}님</span>
            )}
            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setIsBellOpen(prev => !prev)}
                className="relative p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
                aria-label="알림"
              >
                <BellIcon size={22} className="text-slate-300" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </button>
              <AnimatePresence>
              {isBellOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-3 w-80 max-h-96 overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-3 z-20">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-bold text-white">알림</h3>
                    {unreadCount > 0 && <button className="text-xs text-slate-400 hover:underline" onClick={onMarkAllAsRead}>모두 읽음</button>}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="text-sm text-slate-400 p-4 text-center">알림이 없습니다.</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {notifications.map((n) => (
                        <li 
                          key={n.id} 
                          className={`border border-slate-700 rounded-lg p-2.5 transition-colors cursor-pointer hover:bg-slate-700/50 ${!currentUser?.notificationsRead?.[n.id] ? 'bg-slate-700/50' : ''}`}
                          onClick={() => onNotificationClick(n.id)}
                        >
                          <p className="font-semibold text-sm text-white">{n.title}</p>
                          {n.body && <p className="text-sm text-slate-300 mt-0.5">{n.body}</p>}
                          <p className="text-xs text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </>
        )}
        {currentUser ? (
          <button onClick={logout} className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-slate-900 shadow font-bold transition-transform hover:scale-105">
            로그아웃
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default Header;