
import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

interface MentalCoachesProps {
  onImpersonate: (userId: string) => void;
}

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const MentalCoaches: React.FC<MentalCoachesProps> = ({ onImpersonate }) => {
  const { currentUser, users, setUsers } = useAuth();
  const { showToast } = useToast();
  
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{type: 'save' | 'delete', userToDelete?: User} | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [oneTimeOffDate, setOneTimeOffDate] = useState('');


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mentalCoaches = users.filter(u => u.role === 'mental_coach');

  const handleEdit = (user: User) => {
    setEditingUser({ 
      ...user, 
      daysOff: user.daysOff || [], 
      oneTimeOff: user.oneTimeOff || [] 
    });
    setPassword('');
    setShowForm(true);
  };

  const handleAddNew = () => {
    const newUserTemplate: User = {
      id: '',
      name: '',
      username: '',
      phone: '',
      role: 'mental_coach',
      membership: {
        start: new Date().toISOString(),
        end: new Date(new Date().setFullYear(new Date().getFullYear() + 10)).toISOString(),
        sessions: { '30': 0, '50': 0 },
      },
      notificationsRead: {},
      notificationsDeleted: {},
      createdAt: '',
      color: '#ec4899', // Pinkish for mental coaches
      daysOff: [],
      oneTimeOff: [],
      memo: '',
    };
    setEditingUser(newUserTemplate);
    setPassword('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setEditingUser(null);
    setPassword('');
    setShowForm(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editingUser.id && !password) {
        showToast('오류', '신규 멘탈코치의 비밀번호를 입력해주세요.', 'error');
        return;
    }
    setActionToConfirm({ type: 'save' });
    setAdminPassword('');
  };

  const handleFieldChange = (field: keyof User, value: string) => {
    if (!editingUser) return;
    setEditingUser({ ...editingUser, [field]: value });
  };
  
  const handleWeeklyDayOffChange = (dayIndex: number) => {
    if (!editingUser) return;
    const currentDaysOff = editingUser.daysOff || [];
    const newDaysOff = currentDaysOff.includes(dayIndex)
      ? currentDaysOff.filter(d => d !== dayIndex)
      : [...currentDaysOff, dayIndex];
    setEditingUser({ ...editingUser, daysOff: newDaysOff });
  };

  const handleAddOneTimeOff = () => {
    if (!editingUser || !oneTimeOffDate) return;
    const currentOneTimeOff = editingUser.oneTimeOff || [];
    if (!currentOneTimeOff.includes(oneTimeOffDate)) {
      setEditingUser({ ...editingUser, oneTimeOff: [...currentOneTimeOff, oneTimeOffDate].sort() });
    }
    setOneTimeOffDate('');
  };

  const handleRemoveOneTimeOff = (dateToRemove: string) => {
    if (!editingUser) return;
    const newOneTimeOff = (editingUser.oneTimeOff || []).filter(d => d !== dateToRemove);
    setEditingUser({ ...editingUser, oneTimeOff: newOneTimeOff });
  };

  const handleDeleteClick = (user: User) => {
    setActionToConfirm({ type: 'delete', userToDelete: user });
    setAdminPassword('');
  };
  
  const handleCancelAction = () => {
    setActionToConfirm(null);
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionToConfirm || !currentUser || !adminPassword) {
      showToast('오류', '비밀번호를 입력해주세요.', 'error');
      return;
    }
    setIsLoading(true);
    try {
        if (actionToConfirm.type === 'save' && editingUser) {
            if (editingUser.id) { // UPDATE
                const originalUser = users.find(u => u.id === editingUser.id);
                const userToSave: User = { ...editingUser, password: originalUser?.password };
                const updatedUsers = await api.updateUser(userToSave, currentUser.id, adminPassword);
                setUsers(updatedUsers);
                showToast('성공', '멘탈코치 정보가 수정되었습니다.', 'success');
            } else { // CREATE
                const { id, createdAt, notificationsRead, notificationsDeleted, ...userData } = editingUser;
                const userToCreate = { ...userData, password, role: 'mental_coach' as const };
                const updatedUsers = await api.createUser(userToCreate, currentUser.id, adminPassword);
                setUsers(updatedUsers);
                showToast('성공', '신규 멘탈코치가 등록되었습니다.', 'success');
            }
            handleCloseForm();
        } else if (actionToConfirm.type === 'delete' && actionToConfirm.userToDelete) {
            const userToDelete = actionToConfirm.userToDelete;
            const updatedUsers = await api.deleteUser(userToDelete.id, currentUser.id, adminPassword);
            setUsers(updatedUsers);
            showToast('성공', `${userToDelete.name} 멘탈코치 정보가 삭제되었습니다.`, 'success');
        }
        handleCancelAction();
    } catch (error) {
      showToast('오류', (error as Error).message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getModalContent = () => {
    if (!actionToConfirm) return { title: '', description: '' };
    if (actionToConfirm.type === 'save') {
        return {
            title: '관리자 확인',
            description: '변경사항을 저장하려면 관리자 비밀번호를 입력하세요.'
        };
    }
    if (actionToConfirm.type === 'delete' && actionToConfirm.userToDelete) {
        const user = actionToConfirm.userToDelete;
        return {
            title: '코치 삭제 확인',
            description: `정말로 ${user.name} (${user.username}) 코치를 삭제하시겠습니까?`
        };
    }
    return { title: '', description: '' };
  };

  return (
    <>
      <AnimatePresence>
        {showForm && editingUser && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="mb-6">
              {/* Form Content */}
              <h3 className="text-lg font-bold text-white mb-4">
                {editingUser.id ? `멘탈코치 정보 수정: ${editingUser.name}` : '신규 멘탈코치 등록'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                {/* Form Inputs - Same */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">이름</label>
                    <Input value={editingUser.name} onChange={e => handleFieldChange('name', e.target.value)} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">아이디</label>
                    <Input value={editingUser.username} onChange={e => handleFieldChange('username', e.target.value)} required />
                  </div>
                  {!editingUser.id && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">비밀번호</label>
                      <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                  )}
                   <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">연락처</label>
                    <Input value={editingUser.phone} onChange={e => handleFieldChange('phone', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label htmlFor="instructorColor" className="block text-sm font-medium text-slate-300 mb-2">대표 색상</label>
                  <div className="flex items-center gap-3">
                      <Input
                          id="instructorColor"
                          type="color"
                          value={editingUser.color || '#ec4899'}
                          onChange={e => handleFieldChange('color', e.target.value)}
                          className="p-1 h-10 w-12 block bg-slate-900"
                      />
                      <Input
                          type="text"
                          value={editingUser.color || '#ec4899'}
                          onChange={e => handleFieldChange('color', e.target.value)}
                          className="font-mono"
                          placeholder="#ec4899"
                      />
                  </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">메모/기타사항</label>
                    <Textarea 
                        value={editingUser.memo || ''} 
                        onChange={e => handleFieldChange('memo', e.target.value)} 
                        placeholder="특이사항을 입력하세요."
                        rows={3}
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">정기 휴무 요일</label>
                      <div className="flex flex-wrap gap-2">
                          {WEEK_DAYS.map((day, index) => (
                              <button
                                  type="button"
                                  key={day}
                                  onClick={() => handleWeeklyDayOffChange(index)}
                                  className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                                      editingUser.daysOff?.includes(index)
                                          ? 'bg-pink-500 text-white font-bold'
                                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                  }`}
                              >
                                  {day}
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">특정일 휴무 추가</label>
                      <div className="flex items-center gap-2">
                          <Input type="date" value={oneTimeOffDate} onChange={e => setOneTimeOffDate(e.target.value)} />
                          <Button type="button" onClick={handleAddOneTimeOff}>추가</Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                          {(editingUser.oneTimeOff || []).map(date => (
                              <div key={date} className="bg-slate-700 text-slate-200 text-sm px-3 py-1 rounded-full flex items-center gap-2">
                                  {date}
                                  <button type="button" onClick={() => handleRemoveOneTimeOff(date)} className="text-red-400 hover:text-red-300">
                                      <X size={14}/>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="secondary" onClick={handleCloseForm}>취소</Button>
                  <Button type="submit">저장</Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">멘탈코치 목록</h2>
            <Button onClick={handleAddNew}>신규 멘탈코치 등록</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">이름</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">아이디</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">연락처</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">메모</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">등록일</th>
                <th scope="col" className="px-6 py-3 text-right whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody>
              {mentalCoaches.map(user => (
                  <tr key={user.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-2 whitespace-nowrap">
                      <span 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: user.color || '#ec4899' }}
                      ></span>
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate" title={user.memo}>{user.memo || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right relative whitespace-nowrap">
                       <Button
                        size="sm"
                        onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                        disabled={user.id === currentUser?.id}
                      >
                        관리
                      </Button>
                      <AnimatePresence>
                        {openDropdownId === user.id && (
                          <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 mt-2 w-32 bg-slate-700 border border-slate-600 rounded-md shadow-lg z-10"
                          >
                            <ul className="text-sm text-slate-200">
                              <li>
                                <button onClick={() => { onImpersonate(user.id); setOpenDropdownId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors rounded-t-md">
                                  코치 보기
                                </button>
                              </li>
                              <li>
                                <button onClick={() => { handleEdit(user); setOpenDropdownId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors">
                                  정보 수정
                                </button>
                              </li>
                              <li>
                                <button onClick={() => { handleDeleteClick(user); setOpenDropdownId(null); }} className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-600 transition-colors rounded-b-md">
                                  코치 삭제
                                </button>
                              </li>
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
          {mentalCoaches.length === 0 && (
              <p className="text-center py-8 text-slate-400">등록된 멘탈코치가 없습니다.</p>
          )}
        </div>
      </Card>
      
      <AnimatePresence>
        {/* Confirmation Modal - Same */}
        {actionToConfirm && (
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
                    <form onSubmit={handleConfirmAction}>
                        <h2 className="text-lg font-bold text-white mb-2">{getModalContent().title}</h2>
                        <p className="text-slate-300 mb-4 whitespace-pre-wrap">
                           {getModalContent().description}
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-1">관리자 비밀번호 확인</label>
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
                            <Button type="button" onClick={handleCancelAction} variant="secondary">취소</Button>
                            <Button type="submit" variant="destructive" isLoading={isLoading}>확인</Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default MentalCoaches;
