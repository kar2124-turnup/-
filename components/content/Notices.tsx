import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { Notice, NotificationItem, User } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { api } from '../../services/api';

interface NoticesProps {
  notices: Notice[];
  setNotices: React.Dispatch<React.SetStateAction<Notice[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  notifications: NotificationItem[];
  currentUser: User | null;
  updateCurrentUser: (user: User) => void;
}

const Notices: React.FC<NoticesProps> = ({ notices, setNotices, setNotifications, notifications, currentUser, updateCurrentUser }) => {
  const { showToast } = useToast();
  const confirm = useConfirmation();

  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleShowForm = (notice: Notice | null = null) => {
    if (notice) {
      setEditingNotice(notice);
      setTitle(notice.title);
      setBody(notice.body || '');
    } else {
      setEditingNotice(null);
      setTitle('');
      setBody('');
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNotice(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !currentUser) return;
    setIsLoading(true);

    try {
      if (editingNotice) {
        const updatedNotice = { ...editingNotice, title, body };
        const newNotices = await api.updateNotice(updatedNotice);
        setNotices(newNotices);
        showToast('성공', '공지사항이 수정되었습니다.', 'success');
      } else {
        const newNotices = await api.createNotice({ title, body }, currentUser.id);
        setNotices(newNotices);
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        showToast('성공', '새로운 공지사항이 등록되었습니다.', 'success');
      }
      handleCloseForm();
    } catch (error) {
      showToast('오류', '작업 중 오류가 발생했습니다.', 'error');
      console.error("Notice submission failed:", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('정말로 이 공지사항을 삭제하시겠습니까?');
    if (isConfirmed) {
      setIsLoading(true);
      try {
        const newNotices = await api.deleteNotice(id);
        setNotices(newNotices);
        showToast('성공', '공지사항이 삭제되었습니다.', 'success');
      } catch (error) {
        showToast('오류', '삭제 중 오류가 발생했습니다.', 'error');
        console.error("Notice deletion failed:", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleNoticeClick = async (noticeId: string) => {
    if (!currentUser) return;

    const notification = notifications.find(n => 
        n.refId === noticeId && 
        n.type === 'notice' &&
        n.userId === null // Global notice
    );
    
    if (notification && !currentUser.notificationsRead?.[notification.id]) {
        try {
            const updatedUser = await api.markNotificationAsRead(currentUser.id, notification.id);
            if (updatedUser) {
                updateCurrentUser(updatedUser);
            }
        } catch (error) {
            console.error("Failed to mark notice notification as read:", (error as Error).message);
        }
    }
  };
  
  const sortedNotices = [...notices].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">공지사항</h2>
        {currentUser?.role === 'admin' && !showForm && (
          <Button onClick={() => handleShowForm()}>공지 작성</Button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="mb-8 p-4 bg-slate-800/50 rounded-lg"
          >
            <h3 className="text-lg font-bold mb-4 text-white">{editingNotice ? '공지 수정' : '새 공지 작성'}</h3>
            <Input
              type="text"
              placeholder="제목"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mb-2"
              required
            />
            <Textarea
              placeholder="내용 (선택)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mb-4"
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={handleCloseForm} variant="secondary">취소</Button>
              <Button type="submit" isLoading={isLoading}>{editingNotice ? '수정' : '저장'}</Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {sortedNotices.length === 0 ? (
        <p className="text-slate-400 text-center py-4">등록된 공지사항이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {sortedNotices.map(notice => {
            const isNew = notifications.some(n => 
                n.refId === notice.id &&
                n.type === 'notice' &&
                n.userId === null &&
                !currentUser?.notificationsRead?.[n.id]
            );

            return (
              <motion.li 
                key={notice.id} 
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-700/50 transition-colors"
                onClick={() => handleNoticeClick(notice.id)}
              >
                <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-white flex items-center gap-2">
                          {notice.title}
                          {isNew && <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">NEW</span>}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">{new Date(notice.createdAt).toLocaleDateString()}</p>
                    </div>
                    {currentUser?.role === 'admin' && (
                      <div className="flex gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleShowForm(notice)} className="text-yellow-400 hover:underline">수정</button>
                        <button onClick={() => handleDelete(notice.id)} className="text-red-500 hover:underline">삭제</button>
                      </div>
                    )}
                </div>
                {notice.body && <p className="mt-3 text-slate-300 whitespace-pre-wrap text-sm">{notice.body}</p>}
              </motion.li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};

export default Notices;