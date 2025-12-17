
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import type { Locker, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { Select } from '../ui/Select';
import { AnimatePresence, motion } from 'framer-motion';
import { User as UserIcon, Calendar, Check, X } from 'lucide-react';

const Lockers: React.FC = () => {
    const { users } = useAuth();
    const { showToast } = useToast();
    const confirm = useConfirmation();
    const [lockers, setLockers] = useState<Locker[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [durationMonths, setDurationMonths] = useState(3);

    useEffect(() => {
        fetchLockers();
    }, []);

    const fetchLockers = async () => {
        setIsLoading(true);
        try {
            const data = await api.getLockers();
            setLockers(data);
        } catch (error) {
            showToast('오류', '락커 정보를 불러오는데 실패했습니다.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAssign = async () => {
        if (!selectedLocker || !selectedMemberId) return;
        
        const isConfirmed = await confirm(`${durationMonths}개월 동안 락커를 배정하시겠습니까?`);
        if (!isConfirmed) return;

        try {
            const updatedLockers = await api.assignLocker(selectedLocker.id, selectedMemberId, durationMonths);
            setLockers(updatedLockers);
            showToast('성공', '락커가 배정되었습니다.', 'success');
            setSelectedLocker(null);
            setSelectedMemberId('');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        }
    };

    const handleRelease = async (locker: Locker) => {
        const isConfirmed = await confirm(`정말로 ${locker.number}번 락커(${locker.userName}) 배정을 해제하시겠습니까?`);
        if (!isConfirmed) return;

        try {
            const updatedLockers = await api.releaseLocker(locker.id);
            setLockers(updatedLockers);
            showToast('성공', '락커 배정이 해제되었습니다.', 'success');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        }
    };

    const members = users.filter(u => u.role === 'member');
    const sections = Array.from(new Set(lockers.map(l => l.section))).sort();

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">락커 관리</h2>
                <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-700 rounded-sm"></div> 사용가능</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div> 사용중</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> 만료/임박</div>
                </div>
            </div>

            {sections.map(section => (
                <div key={section} className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">{section} 구역</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {lockers.filter(l => l.section === section).map(locker => {
                            const isOccupied = locker.status === 'occupied';
                            const isExpired = locker.endDate && new Date(locker.endDate) < new Date();
                            
                            let bgClass = 'bg-slate-700 hover:bg-slate-600';
                            if (isOccupied) bgClass = 'bg-blue-600 hover:bg-blue-500';
                            if (isExpired) bgClass = 'bg-red-600 hover:bg-red-500';

                            return (
                                <motion.div
                                    key={locker.id}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => setSelectedLocker(locker)}
                                    className={`relative p-3 rounded-lg cursor-pointer transition-colors h-24 flex flex-col justify-between ${bgClass}`}
                                >
                                    <div className="font-bold text-white text-lg">{locker.number}</div>
                                    {isOccupied ? (
                                        <div className="text-xs text-white/90">
                                            <p className="font-semibold truncate">{locker.userName}</p>
                                            <p className="opacity-75 text-[10px]">~{new Date(locker.endDate!).toLocaleDateString()}</p>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-400">사용가능</div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <AnimatePresence>
                {selectedLocker && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
                        onClick={() => setSelectedLocker(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-white">{selectedLocker.number}번 락커</h3>
                                    <p className="text-slate-400">{selectedLocker.section} 구역</p>
                                </div>
                                <button onClick={() => setSelectedLocker(null)} className="text-slate-400 hover:text-white"><X /></button>
                            </div>

                            {selectedLocker.status === 'occupied' ? (
                                <div className="space-y-4">
                                    <div className="bg-slate-900/50 p-4 rounded-lg space-y-2">
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <UserIcon size={18} />
                                            <span>사용자: <strong className="text-white">{selectedLocker.userName}</strong></span>
                                        </div>
                                        <div className="flex items-center gap-3 text-slate-300">
                                            <Calendar size={18} />
                                            <span>만료일: <strong className="text-yellow-400">{new Date(selectedLocker.endDate!).toLocaleDateString()}</strong></span>
                                        </div>
                                    </div>
                                    <Button onClick={() => handleRelease(selectedLocker)} variant="destructive" className="w-full">
                                        배정 해제 (반납)
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">회원 선택</label>
                                        <Select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                                            <option value="">회원을 선택하세요</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.phone.slice(-4)})</option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">이용 기간</label>
                                        <div className="flex gap-2">
                                            {[1, 3, 6, 12].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setDurationMonths(m)}
                                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${durationMonths === m ? 'bg-yellow-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                                                >
                                                    {m}개월
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handleAssign} disabled={!selectedMemberId} className="w-full">
                                        <Check className="mr-2" size={18} /> 배정하기
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};

export default Lockers;
