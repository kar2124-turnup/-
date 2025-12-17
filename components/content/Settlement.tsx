
import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import type { User, Reservation } from '../../types';
import { Select } from '../ui/Select';
import { Settings, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';

interface SettlementProps {
    users: User[];
    reservations: Reservation[];
}

const Settlement: React.FC<SettlementProps> = ({ users, reservations }) => {
    const { currentUser, setUsers, updateCurrentUser } = useAuth();
    const { showToast } = useToast();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    
    // Rate Editing State
    const [editingInstructor, setEditingInstructor] = useState<User | null>(null);
    const [tempRates, setTempRates] = useState<{ '30': number, '50': number, 'mental': number }>({ '30': 0, '50': 0, 'mental': 0 });
    const [adminPassword, setAdminPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const instructors = users.filter(u => u.role === 'instructor' || u.role === 'mental_coach');

    const settlementData = useMemo(() => {
        return instructors.map(inst => {
            const monthlyReservations = reservations.filter(r => {
                const d = new Date(r.dateTime);
                return d.getFullYear() === selectedYear && 
                       d.getMonth() + 1 === selectedMonth && 
                       r.instructorId === inst.id &&
                       r.status === 'attended';
            });

            const count30 = monthlyReservations.filter(r => r.type === 'lesson' && r.duration === 30).length;
            const count50 = monthlyReservations.filter(r => r.type === 'lesson' && r.duration === 50).length;
            const countMental = monthlyReservations.filter(r => r.type === 'mental').length;

            const rate30 = inst.settlementRates?.['30'] || 15000;
            const rate50 = inst.settlementRates?.['50'] || 25000;
            const rateMental = inst.settlementRates?.['mental'] || 30000;

            const incentive = (count30 * rate30) + (count50 * rate50) + (countMental * rateMental);

            return {
                id: inst.id,
                name: inst.name,
                role: inst.role === 'mental_coach' ? '멘탈코치' : '프로',
                user: inst,
                count30,
                rate30,
                count50,
                rate50,
                countMental,
                rateMental,
                incentive
            };
        });
    }, [instructors, reservations, selectedYear, selectedMonth]);

    const totalIncentive = settlementData.reduce((acc, curr) => acc + curr.incentive, 0);

    const handleEditRates = (user: User) => {
        setEditingInstructor(user);
        setTempRates({
            '30': user.settlementRates?.['30'] || 15000,
            '50': user.settlementRates?.['50'] || 25000,
            'mental': user.settlementRates?.['mental'] || 30000,
        });
        setAdminPassword('');
    };

    const handleSaveRates = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !editingInstructor || !adminPassword) {
             showToast('오류', '비밀번호를 입력해주세요.', 'error');
             return;
        }

        setIsSubmitting(true);
        try {
            const originalUser = users.find(u => u.id === editingInstructor.id);
            const userToSave: User = { 
                ...editingInstructor, 
                password: originalUser?.password, // Keep original password
                settlementRates: tempRates 
            };
            
            const updatedUsers = await api.updateUser(userToSave, currentUser.id, adminPassword);
            setUsers(updatedUsers);
            if (currentUser.id === editingInstructor.id) {
                updateCurrentUser(userToSave);
            }
            showToast('성공', '정산 단가가 수정되었습니다.', 'success');
            setEditingInstructor(null);
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-white">강사별 정산 관리</h2>
                <div className="flex gap-2">
                    <Select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-32"
                    >
                        {[2023, 2024, 2025].map(y => <option key={y} value={y}>{y}년</option>)}
                    </Select>
                    <Select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="w-24"
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{m}월</option>
                        ))}
                    </Select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                        <tr>
                            <th className="px-6 py-3">강사명</th>
                            <th className="px-6 py-3 text-right">30분(횟수/단가)</th>
                            <th className="px-6 py-3 text-right">50분(횟수/단가)</th>
                            <th className="px-6 py-3 text-right">멘탈(횟수/단가)</th>
                            <th className="px-6 py-3 text-right">예상 정산금</th>
                            <th className="px-6 py-3 text-center">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {settlementData.map(data => (
                            <tr key={data.id} className="border-b border-slate-700 hover:bg-slate-800/50">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-white">{data.name}</span>
                                        <span className={`text-xs ${data.role === '멘탈코치' ? 'text-pink-400' : 'text-blue-400'}`}>
                                            {data.role}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-white font-bold">{data.count30}회</span>
                                        <span className="text-xs text-slate-500">@{data.rate30.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-white font-bold">{data.count50}회</span>
                                        <span className="text-xs text-slate-500">@{data.rate50.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <span className="text-white font-bold">{data.countMental}회</span>
                                        <span className="text-xs text-slate-500">@{data.rateMental.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-yellow-400 text-lg">
                                    {data.incentive.toLocaleString()}원
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <Button size="xs" variant="secondary" onClick={() => handleEditRates(data.user)}>
                                        <Settings size={14} className="mr-1" /> 단가 설정
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-800 font-bold">
                            <td colSpan={4} className="px-6 py-4 text-right text-white">총 합계</td>
                            <td className="px-6 py-4 text-right text-yellow-400 text-xl">{totalIncentive.toLocaleString()}원</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <AnimatePresence>
                {editingInstructor && (
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
                            className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700 shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">{editingInstructor.name}님 정산 단가 설정</h3>
                                <button onClick={() => setEditingInstructor(null)} className="text-slate-400 hover:text-white"><X /></button>
                            </div>
                            
                            <form onSubmit={handleSaveRates} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">30분 레슨 단가</label>
                                    <Input 
                                        type="number" 
                                        value={tempRates['30']} 
                                        onChange={e => setTempRates({...tempRates, '30': Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">50분 레슨 단가</label>
                                    <Input 
                                        type="number" 
                                        value={tempRates['50']} 
                                        onChange={e => setTempRates({...tempRates, '50': Number(e.target.value)})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">멘탈 코칭 단가</label>
                                    <Input 
                                        type="number" 
                                        value={tempRates['mental']} 
                                        onChange={e => setTempRates({...tempRates, 'mental': Number(e.target.value)})}
                                    />
                                </div>
                                <div className="pt-4 border-t border-slate-700">
                                    <label className="block text-sm font-medium text-slate-300 mb-1">관리자 비밀번호 확인</label>
                                    <Input 
                                        type="password" 
                                        value={adminPassword} 
                                        onChange={e => setAdminPassword(e.target.value)}
                                        placeholder="비밀번호를 입력하세요"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="secondary" onClick={() => setEditingInstructor(null)}>취소</Button>
                                    <Button type="submit" isLoading={isSubmitting}>저장</Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
};

export default Settlement;
