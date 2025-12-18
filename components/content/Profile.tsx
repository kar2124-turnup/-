
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Payment, PriceItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { daysUntil } from '../../utils/helpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { AnimatePresence, motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Textarea } from '../ui/Textarea';

interface ProfileProps {
  onImpersonate: (userId: string) => void;
  payments: Payment[];
  prices: PriceItem[];
}

const Profile: React.FC<ProfileProps> = ({ onImpersonate, payments, prices }) => {
  const { currentUser, users, setUsers, updateCurrentUser } = useAuth();
  const { showToast } = useToast();

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{type: 'save' | 'delete', userToDelete?: User} | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const isAdmin = currentUser?.role === 'admin';

  const userPayments = useMemo(() => {
    return [...payments]
      .filter(p => p.userId === currentUser?.id)
      .map(p => {
        const productDetails = prices.find(price => price.id === p.productId || price.name === p.productName);
        return { ...p, productDetails };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, currentUser, prices]);

  const handleEdit = (user: User) => {
    setEditingUser({ ...user });
    setPassword('');
    setShowForm(true);
  };

  const handleAddNew = () => {
    const newUserTemplate: User = {
      id: '', // Empty id signifies a new user
      name: '',
      username: '',
      phone: '',
      licensePlate: '', // Initial value for license plate
      role: 'member',
      membership: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        sessions: { '30': 0, '50': 0, 'mental': 0, 'rentals': 0 },
      },
      notificationsRead: {},
      notificationsDeleted: {},
      createdAt: '',
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
    
    // For CREATE, password must be entered in the form first.
    if (!editingUser.id && !password) {
        showToast('오류', '신규 회원의 비밀번호를 입력해주세요.', 'error');
        return;
    }
    
    setActionToConfirm({ type: 'save' });
    setAdminPassword(''); // Reset password for the modal
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
                  if (currentUser?.id === editingUser.id) {
                      updateCurrentUser(userToSave);
                  }
                  showToast('성공', '회원 정보가 수정되었습니다.', 'success');
              } else { // CREATE
                  const { id, createdAt, notificationsRead, notificationsDeleted, ...userData } = editingUser;
                  const userToCreate = { ...userData, password };
                  const updatedUsers = await api.createUser(userToCreate, currentUser.id, adminPassword);
                  setUsers(updatedUsers);
                  showToast('성공', '신규 회원이 등록되었습니다.', 'success');
              }
              handleCloseForm();
          } else if (actionToConfirm.type === 'delete' && actionToConfirm.userToDelete) {
              const userToDelete = actionToConfirm.userToDelete;
              const updatedUsers = await api.deleteUser(userToDelete.id, currentUser.id, adminPassword);
              setUsers(updatedUsers);
              showToast('성공', `${userToDelete.name} 회원 정보가 삭제되었습니다.`, 'success');
          }
          handleCancelAction();
      } catch (error) {
          showToast('오류', (error as Error).message, 'error');
      } finally {
          setIsLoading(false);
      }
  };

  const handleFieldChange = (field: keyof User | 'sessions30' | 'sessions50' | 'sessionsMental' | 'sessionsRentals' | 'end', value: string | number) => {
    if (!editingUser) return;

    if (field === 'end') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxEndDate = new Date(today);
        maxEndDate.setDate(maxEndDate.getDate() + 180);
        const selectedDate = new Date(value as string);

        let finalValue = value;
        if (selectedDate > maxEndDate) {
            showToast('제한', `등록 기간은 오늘로부터 180일을 초과할 수 없습니다.`, 'info');
            finalValue = maxEndDate.toISOString().split('T')[0];
        }
        
        setEditingUser({
            ...editingUser,
            membership: {
                ...editingUser.membership,
                end: new Date(finalValue as string).toISOString(),
            },
        });

    } else if (field === 'sessions30' || field === 'sessions50' || field === 'sessionsMental' || field === 'sessionsRentals') {
        let sessionKey: '30' | '50' | 'mental' | 'rentals' = '30';
        if (field === 'sessions50') sessionKey = '50';
        if (field === 'sessionsMental') sessionKey = 'mental';
        if (field === 'sessionsRentals') sessionKey = 'rentals';

        setEditingUser({
            ...editingUser,
            membership: {
                ...editingUser.membership,
                sessions: {
                    ...editingUser.membership.sessions,
                    [sessionKey]: Number(value),
                }
            },
        });
    } else {
      setEditingUser({ ...editingUser, [field]: value as string });
    }
  };
  
  const handleDurationChange = (months: number) => {
    if (!editingUser) return;

    const currentEndDate = new Date(editingUser.membership.end);
    const today = new Date();
    
    const extensionStartDate = currentEndDate < today ? today : currentEndDate;
    
    const proposedEndDate = new Date(extensionStartDate);
    proposedEndDate.setMonth(proposedEndDate.getMonth() + months);
    
    const maxEndDate = new Date();
    maxEndDate.setDate(maxEndDate.getDate() + 180);

    const newEndDate = proposedEndDate < maxEndDate ? proposedEndDate : maxEndDate;

    handleFieldChange('end', newEndDate.toISOString().split('T')[0]);
  };
  
  const handleProductAutoFill = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const productId = e.target.value;
      if (!productId || !editingUser) return;
      
      const product = prices.find(p => p.id === productId);
      if (product) {
          // Calculate new end date: Today + duration
          const today = new Date();
          const newEndDate = new Date(today);
          newEndDate.setDate(today.getDate() + product.durationDays);
          
          // Determine session key (30 or 50)
          const sessionKey = product.sessionMinutes === 30 ? '30' : '50';
          const currentCount = editingUser.membership.sessions[sessionKey] || 0;
          const currentMental = editingUser.membership.sessions['mental'] || 0;
          const currentRentals = editingUser.membership.sessions['rentals'] || 0;
          
          // Append to existing memo
          const newMemo = editingUser.memo 
            ? `${editingUser.memo}\n[추가] ${product.name}` 
            : `[등록] ${product.name}`;

          setEditingUser({
              ...editingUser,
              membership: {
                  ...editingUser.membership,
                  end: newEndDate.toISOString(),
                  sessions: {
                      ...editingUser.membership.sessions,
                      [sessionKey]: currentCount + product.count,
                      'mental': currentMental + (product.mentalCoachingCount || 0),
                      'rentals': currentRentals + (product.rentalCount || 0)
                  }
              },
              memo: newMemo
          });
          showToast('알림', `${product.name} 정보가 반영되었습니다.`, 'info');
      }
      e.target.value = "";
  };

  const handleDeleteClick = (user: User) => {
    setActionToConfirm({ type: 'delete', userToDelete: user });
    setAdminPassword(''); // Clear password field on open
  };

  const handleCancelAction = () => {
      setActionToConfirm(null);
  };

  const DURATION_MONTHS = [1, 2, 3, 6, 12];
  
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
            title: '계정 삭제 확인',
            description: `정말로 ${user.name} (${user.username}, 등급: ${user.role}) 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 모든 관련 데이터가 삭제됩니다.`
        };
    }
    return { title: '', description: '' };
  };

  const filteredUsers = useMemo(() => {
    // Include both members and admins in the management list so master admin can manage/delete temporary admins.
    const targets = users.filter(user => user.role === 'member' || user.role === 'admin');
    if (!searchTerm.trim()) {
      return targets;
    }
    const lowercasedFilter = searchTerm.trim().toLowerCase();
    return targets.filter(user => 
      user.name.toLowerCase().includes(lowercasedFilter) || 
      user.username.toLowerCase().includes(lowercasedFilter) ||
      (user.licensePlate && user.licensePlate.toLowerCase().includes(lowercasedFilter))
    );
  }, [users, searchTerm]);

  const renderAdminView = () => (
    <>
      <AnimatePresence>
        {showForm && editingUser && (
          <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4">
                {editingUser.id ? `계정 정보 수정: ${editingUser.name}` : '신규 계정 등록'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
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
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">차량번호</label>
                    <Input value={editingUser.licensePlate || ''} onChange={e => handleFieldChange('licensePlate', e.target.value)} placeholder="예: 12가 3456" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">등급</label>
                    <Select value={editingUser.role} onChange={e => handleFieldChange('role', e.target.value as any)}>
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                    </Select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">30분 세션</label>
                    <Input type="number" value={editingUser.membership.sessions['30']} onChange={e => handleFieldChange('sessions30', e.target.value)} />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">50분 세션</label>
                    <Input type="number" value={editingUser.membership.sessions['50']} onChange={e => handleFieldChange('sessions50', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">멘탈코칭</label>
                    <Input type="number" value={editingUser.membership.sessions['mental'] || 0} onChange={e => handleFieldChange('sessionsMental', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">대관 잔여</label>
                    <Input type="number" value={editingUser.membership.sessions['rentals'] || 0} onChange={e => handleFieldChange('sessionsRentals', e.target.value)} />
                  </div>
                  <div className="md:col-span-2 p-3 bg-slate-700/30 rounded-lg border border-slate-600/50">
                    <label className="block text-sm font-bold text-yellow-400 mb-2">상품 선택 (자동 입력)</label>
                    <Select onChange={handleProductAutoFill} defaultValue="">
                        <option value="" disabled>상품을 선택하면 세션과 기간이 자동 입력됩니다.</option>
                        {prices.map(price => (
                            <option key={price.id} value={price.id}>
                                {price.name} ({price.count}회 {price.mentalCoachingCount ? `+ 멘탈${price.mentalCoachingCount}회` : ''} {price.rentalCount ? `+ 대관${price.rentalCount}회` : ''} / {price.durationDays}일)
                            </option>
                        ))}
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">만료일</label>
                    <Input type="date" value={new Date(editingUser.membership.end).toISOString().split('T')[0]} onChange={e => handleFieldChange('end', e.target.value)} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DURATION_MONTHS.map(months => (
                        <Button
                          key={months}
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleDurationChange(months)}
                        >
                          +{months}개월
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-300 mb-1">관리자 메모</label>
                    <Textarea 
                        value={editingUser.memo || ''} 
                        onChange={e => handleFieldChange('memo', e.target.value)} 
                        placeholder="특이사항, 등록 상품명 등을 입력하세요."
                        rows={3}
                    />
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
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-white">전체 사용자 목록</h2>
            <div className="flex items-center gap-2">
                <div className="relative w-full md:w-auto">
                    <Input 
                        placeholder="이름, 아이디 또는 차량번호"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full md:w-64"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>
                <Button onClick={handleAddNew} className="flex-shrink-0">신규 등록</Button>
            </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">이름</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">아이디</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">등급</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">연락처</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">차량번호</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">가입일</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">메모</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">남은 세션</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">이용기간</th>
                <th scope="col" className="px-6 py-3 whitespace-nowrap">상태</th>
                <th scope="col" className="px-6 py-3 text-right whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const days = daysUntil(user.membership.end);
                  const status = days < 0 ? '만료' : '이용중';
                  return (
                    <tr key={user.id} className={`border-b border-slate-700 hover:bg-slate-800/50 ${user.role === 'admin' ? 'bg-yellow-500/5' : ''}`}>
                      <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                          {user.name}
                          {user.role === 'admin' && <span className="ml-2 text-[10px] bg-yellow-500 text-slate-900 px-1 rounded">ADMIN</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{user.licensePlate || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap max-w-xs truncate" title={user.memo}>{user.memo || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {user.role === 'member' ? (
                            <div className="flex flex-col gap-1">
                                <span className="text-slate-300">30분: <span className="text-yellow-400 font-bold">{user.membership.sessions['30']}</span>회</span>
                                <span className="text-slate-300">50분: <span className="text-yellow-400 font-bold">{user.membership.sessions['50']}</span>회</span>
                                <span className="text-slate-300">멘탈: <span className="text-pink-400 font-bold">{user.membership.sessions['mental'] || 0}</span>회</span>
                                <span className="text-slate-300">대관: <span className="text-orange-400 font-bold">{user.membership.sessions['rentals'] || 0}</span>회</span>
                            </div>
                        ) : (
                            '무제한'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{new Date(user.membership.end).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status === '만료' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{status}</span>
                      </td>
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
                                    사용자 보기
                                  </button>
                                </li>
                                <li>
                                  <button onClick={() => { handleEdit(user); setOpenDropdownId(null); }} className="w-full text-left px-3 py-2 hover:bg-slate-600 transition-colors">
                                    정보 수정
                                  </button>
                                </li>
                                <li>
                                  <button onClick={() => { handleDeleteClick(user); setOpenDropdownId(null); }} className="w-full text-left px-3 py-2 text-red-400 hover:bg-slate-600 transition-colors rounded-b-md">
                                    계정 삭제
                                  </button>
                                </li>
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    {searchTerm ? '검색된 사용자가 없습니다.' : '등록된 사용자가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
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
  
  const renderMemberView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
          <Card initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-xl font-bold text-white mb-4">내 정보</h2>
              <div className="space-y-3 text-slate-300">
                  <p><strong>이름:</strong> {currentUser?.name}</p>
                  <p><strong>아이디:</strong> {currentUser?.username}</p>
                  <p><strong>연락처:</strong> {currentUser?.phone}</p>
                  {currentUser?.licensePlate && <p><strong>차량번호:</strong> {currentUser?.licensePlate}</p>}
              </div>
          </Card>
      </div>
      <div className="lg:col-span-2">
        <Card initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold text-white mb-4">멤버십 정보</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-4 col-span-3">
                  <div className="flex gap-8 flex-wrap">
                    <div>
                        <p className="text-slate-400">30분 레슨 잔여</p>
                        <p className="text-3xl font-bold text-yellow-400">{currentUser?.membership.sessions['30']}회</p>
                    </div>
                    <div>
                        <p className="text-slate-400">50분 레슨 잔여</p>
                        <p className="text-3xl font-bold text-yellow-400">{currentUser?.membership.sessions['50']}회</p>
                    </div>
                    <div>
                        <p className="text-slate-400">멘탈코칭 잔여</p>
                        <p className="text-3xl font-bold text-purple-400">{currentUser?.membership.sessions['mental'] || 0}회</p>
                    </div>
                    <div>
                        <p className="text-slate-400">대관 잔여</p>
                        <p className="text-3xl font-bold text-orange-400">{currentUser?.membership.sessions['rentals'] || 0}회</p>
                    </div>
                  </div>
              </div>
               <div className='text-center md:text-left col-span-1'>
                  <p className="text-slate-400">이용기간 만료</p>
                  <p className="text-3xl font-bold text-yellow-400">{daysUntil(currentUser?.membership.end || '')}일 남음</p>
                  <p className="text-sm text-slate-500">{new Date(currentUser?.membership.end || '').toLocaleDateString()} 까지</p>
              </div>
          </div>
        </Card>
        <Card className="mt-6" initial={{ opacity: 0, y: 0 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold text-white mb-4">구매내역</h2>
          {userPayments.length > 0 ? (
            <ul className="divide-y divide-slate-700">
              {userPayments.map(p => (
                <li key={p.id} className="py-3">
                  <div>
                    <p className="font-medium text-white">{p.productName}</p>
                    {p.productDetails && (
                      <p className="text-sm text-slate-400">
                        {p.productDetails.sessionMinutes}분 레슨 / {p.productDetails.count}회
                        {p.productDetails.mentalCoachingCount ? ` + 멘탈코칭 ${p.productDetails.mentalCoachingCount}회` : ''}
                        {p.productDetails.rentalCount ? ` + 대관 ${p.productDetails.rentalCount}회` : ''}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">{new Date(p.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 text-center py-4">구매내역이 없습니다.</p>
          )}
        </Card>
      </div>
    </div>
  );

  return isAdmin ? renderAdminView() : renderMemberView();
};

export default Profile;
