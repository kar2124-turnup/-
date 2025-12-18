
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { api } from '../../services/api';
import type { Locker, User } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { AnimatePresence, motion } from 'framer-motion';
import { User as UserIcon, Calendar, Check, X, ArrowLeft, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useConfirmation } from '../../contexts/ConfirmationContext';

const Lockers: React.FC = () => {
    const { users } = useAuth();
    const { showToast } = useToast();
    const confirm = useConfirmation();
    const [lockers, setLockers] = useState<Locker[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Add Locker Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newLockerNumber, setNewLockerNumber] = useState<number | ''>('');
    const [newLockerSection, setNewLockerSection] = useState('A');

    // Detail/Assign Modal State
    const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
    
    // Assignment Form State
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    
    // View State: 'initial' (Form or Info) | 'confirm' (Review Action)
    const [viewStep, setViewStep] = useState<'initial' | 'confirm'>('initial');

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

    const handleLockerClick = (locker: Locker) => {
        setSelectedLocker(locker);
        // Reset form state
        setSelectedMemberId('');
        const today = new Date().toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(''); // 초기화
        
        setViewStep('initial');
    };

    const handleAddDuration = (monthsToAdd: number) => {
        let baseDate = new Date(startDate);
        
        // 이미 종료일이 설정되어 있다면 그 날짜를 기준으로 추가 (누적)
        if (endDate) {
            const currentEnd = new Date(endDate);
            // 종료일이 유효하고 시작일보다 같거나 클 때만 기준으로 삼음
            if (!isNaN(currentEnd.getTime()) && currentEnd >= baseDate) {
                baseDate = currentEnd;
            }
        }

        // 월 추가
        baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
        setEndDate(baseDate.toISOString().split('T')[0]);
    };

    // --- Assign Logic ---
    const handlePreAssign = () => {
        if (!selectedLocker || !selectedMemberId) {
            showToast('오류', '회원을 선택해주세요.', 'error');
            return;
        }
        if (!startDate || !endDate) {
            showToast('오류', '시작일과 종료일을 모두 입력해주세요.', 'error');
            return;
        }
        if (new Date(endDate) < new Date(startDate)) {
            showToast('오류', '종료일은 시작일보다 이후여야 합니다.', 'error');
            return;
        }
        setViewStep('confirm');
    };

    const handleConfirmAssign = async () => {
        if (!selectedLocker || !selectedMemberId) return;
        
        setIsLoading(true);
        try {
            const updatedLockers = await api.assignLocker(selectedLocker.id, selectedMemberId, startDate, endDate);
            setLockers(updatedLockers);
            showToast('성공', '락커가 배정되었습니다.', 'success');
            setSelectedLocker(null);
            setSelectedMemberId('');
            setViewStep('initial');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Release Logic ---
    const handlePreRelease = () => {
        setViewStep('confirm');
    };

    const handleConfirmRelease = async () => {
        if (!selectedLocker) return;

        setIsLoading(true);
        try {
            const updatedLockers = await api.releaseLocker(selectedLocker.id);
            setLockers(updatedLockers);
            showToast('성공', '락커 배정이 해제되었습니다.', 'success');
            setSelectedLocker(null);
            setViewStep('initial');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Add Locker Logic ---
    const handleAddLocker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLockerNumber || !newLockerSection) {
            showToast('오류', '번호와 구역을 모두 입력해주세요.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const updatedLockers = await api.createLocker({ number: Number(newLockerNumber), section: newLockerSection });
            setLockers(updatedLockers);
            showToast('성공', '새 락커가 추가되었습니다.', 'success');
            setIsAddModalOpen(false);
            setNewLockerNumber('');
            setNewLockerSection('A');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Delete Locker Logic ---
    const handleDeleteLocker = async () => {
        if (!selectedLocker) return;
        if (selectedLocker.status === 'occupied') {
            showToast('오류', '사용 중인 락커는 삭제할 수 없습니다.', 'error');
            return;
        }

        const isConfirmed = await confirm(`${selectedLocker.number}번 락커를 영구 삭제하시겠습니까?`);
        if (isConfirmed) {
            setIsLoading(true);
            try {
                const updatedLockers = await api.deleteLocker(selectedLocker.id);
                setLockers(updatedLockers);
                showToast('성공', '락커가 삭제되었습니다.', 'success');
                setSelectedLocker(null);
            } catch (error) {
                showToast('오류', (error as Error).message, 'error');
            } finally {
                setIsLoading(false);
            }
        }
    };

    const members = users.filter(u => u.role === 'member');
    const sections = Array.from(new Set(lockers.map(l => l.section))).sort();
    
    // Preview Data for Assignment
    const selectedMember = members.find(m => m.id === selectedMemberId);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">락커 관리</h2>
                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex gap-4 text-sm mr-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-700 rounded-sm"></div> 사용가능</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-600 rounded-sm"></div> 사용중</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> 만료/임박</div>
                    </div>
                    <Button onClick={() => setIsAddModalOpen(true)} size="sm">
                        <Plus size={16} className="mr-1" /> 락커 추가
                    </Button>
                </div>
            </div>

            {sections.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                    등록된 락커가 없습니다. 락커를 추가해주세요.
                </div>
            )}

            {sections.map(section => (
                <div key={section} className="mb-8">
                    <h3 className="text-lg font-semibold text-slate-300 mb-4">{section} 구역</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
                        {lockers.filter(l => l.section === section).sort((a,b) => a.number - b.number).map(locker => {
                            const isOccupied = locker.status === 'occupied';
                            const isExpired = locker.endDate && new Date(locker.endDate) < new Date();
                            
                            let bgClass = 'bg-slate-700 hover:bg-slate-600';
                            if (isOccupied) bgClass = 'bg-blue-600 hover:bg-blue-500';
                            if (isExpired) bgClass = 'bg-red-600 hover:bg-red-500';

                            return (
                                <motion.div
                                    key={locker.id}
                                    whileHover={{ scale: 1.05 }}
                                    onClick={() => handleLockerClick(locker)}
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
                {/* Add Locker Modal */}
                {isAddModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9999] p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="bg-slate-800 p-6 rounded-xl w-full max-w-sm border border-slate-700 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">락커 추가</h3>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white"><X /></button>
                            </div>
                            <form onSubmit={handleAddLocker} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">락커 번호</label>
                                    <Input 
                                        type="number" 
                                        value={newLockerNumber} 
                                        onChange={e => setNewLockerNumber(Number(e.target.value))} 
                                        placeholder="예: 101"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">구역 (Section)</label>
                                    <Input 
                                        type="text" 
                                        value={newLockerSection} 
                                        onChange={e => setNewLockerSection(e.target.value.toUpperCase())} 
                                        placeholder="예: A"
                                        required 
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-6">
                                    <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>취소</Button>
                                    <Button type="submit" isLoading={isLoading}>추가</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}

                {/* Detail / Action Modal */}
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
                                <div className="flex items-center gap-3">
                                    {selectedLocker.status !== 'occupied' && (
                                        <button 
                                            onClick={handleDeleteLocker} 
                                            className="text-red-500 hover:text-red-400 p-1 rounded-full hover:bg-slate-700 transition-colors"
                                            title="락커 삭제"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                    <button onClick={() => setSelectedLocker(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
                                </div>
                            </div>

                            {selectedLocker.status === 'occupied' ? (
                                <AnimatePresence mode="wait">
                                    {viewStep === 'initial' ? (
                                        <motion.div
                                            key="info"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <div className="bg-slate-900/50 p-4 rounded-lg space-y-2">
                                                <div className="flex items-center gap-3 text-slate-300">
                                                    <UserIcon size={18} />
                                                    <span>사용자: <strong className="text-white">{selectedLocker.userName}</strong></span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-300">
                                                    <Calendar size={18} />
                                                    <span>이용기간: <strong className="text-white">{new Date(selectedLocker.startDate!).toLocaleDateString()} ~ </strong></span>
                                                </div>
                                                <div className="flex items-center gap-3 text-slate-300 pl-7">
                                                    <span>만료일: <strong className="text-yellow-400">{new Date(selectedLocker.endDate!).toLocaleDateString()}</strong></span>
                                                </div>
                                            </div>
                                            <Button onClick={handlePreRelease} variant="destructive" className="w-full">
                                                배정 해제 (반납)
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="release-confirm"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-4"
                                        >
                                            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-lg space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle className="text-red-500 shrink-0" />
                                                    <div>
                                                        <h4 className="font-bold text-white mb-1">정말 해제하시겠습니까?</h4>
                                                        <p className="text-sm text-slate-300">
                                                            해제하면 해당 락커는 즉시 <strong>'사용 가능'</strong> 상태로 변경됩니다. 
                                                            회원의 짐을 모두 비웠는지 확인해주세요.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="pt-2 border-t border-red-500/20 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-400">현재 사용자</span>
                                                        <span className="text-white font-bold">{selectedLocker.userName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => setViewStep('initial')} variant="secondary" className="flex-1">
                                                    <ArrowLeft size={18} className="mr-2" /> 취소
                                                </Button>
                                                <Button onClick={handleConfirmRelease} variant="destructive" className="flex-[2]" isLoading={isLoading}>
                                                    <Check size={18} className="mr-2" /> 확정 및 해제
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {viewStep === 'initial' ? (
                                        <motion.div 
                                            key="form"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <div>
                                                <label className="block text-sm font-medium text-slate-300 mb-1">회원 선택</label>
                                                <Select value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                                                    <option value="">회원을 선택하세요</option>
                                                    {members.map(m => (
                                                        <option key={m.id} value={m.id}>{m.name} ({m.phone.slice(-4)})</option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">시작일</label>
                                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-300 mb-1">종료일</label>
                                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-2">기간 추가 (누적)</label>
                                                <div className="flex gap-2">
                                                    {[1, 3, 6, 12].map(m => (
                                                        <button
                                                            key={m}
                                                            onClick={() => handleAddDuration(m)}
                                                            className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white active:bg-yellow-600 active:text-slate-900"
                                                        >
                                                            +{m}개월
                                                        </button>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-slate-500 mt-1 text-right">* 버튼을 누를 때마다 종료일이 누적되어 연장됩니다.</p>
                                            </div>
                                            <Button onClick={handlePreAssign} disabled={!selectedMemberId} className="w-full mt-4">
                                                다음 단계
                                            </Button>
                                        </motion.div>
                                    ) : (
                                        <motion.div 
                                            key="assign-confirm"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            className="space-y-4"
                                        >
                                            <div className="bg-slate-900/50 p-4 rounded-lg space-y-3 border border-slate-700">
                                                <h4 className="text-lg font-bold text-white mb-2">배정 정보를 확인해주세요</h4>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">회원명</span>
                                                    <span className="text-white font-bold">{selectedMember?.name}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-400">시작일</span>
                                                    <span className="text-white font-bold">{new Date(startDate).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                                                    <span className="text-slate-400">만료 예정일</span>
                                                    <span className="text-yellow-400 font-bold">{new Date(endDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button onClick={() => setViewStep('initial')} variant="secondary" className="flex-1">
                                                    <ArrowLeft size={18} className="mr-2" /> 뒤로
                                                </Button>
                                                <Button onClick={handleConfirmAssign} className="flex-[2]" isLoading={isLoading}>
                                                    <Check size={18} className="mr-2" /> 확정 및 배정
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};

export default Lockers;
