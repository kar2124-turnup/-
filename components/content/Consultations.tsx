
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { api } from '../../services/api';
import type { ConsultationLog } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { Search, User as UserIcon, Trash2, MessageSquare, Plus, UserX } from 'lucide-react';
import { useConfirmation } from '../../contexts/ConfirmationContext';

const Consultations: React.FC = () => {
    const { users, currentUser } = useAuth();
    const { showToast } = useToast();
    const confirm = useConfirmation();
    
    const [logs, setLogs] = useState<ConsultationLog[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState<string>(''); // ''=All, 'non-member'=NonMembers, else=SpecificMemberId
    
    // Form State
    const [isNonMemberMode, setIsNonMemberMode] = useState(false);
    const [newLogType, setNewLogType] = useState<'inquiry' | 'complaint' | 'sales' | 'general'>('general');
    const [newLogContent, setNewLogContent] = useState('');
    const [nonMemberName, setNonMemberName] = useState('');
    const [nonMemberPhone, setNonMemberPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await api.getConsultations();
            setLogs(data);
        } catch (error) {
            console.error('Failed to fetch consultations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const members = useMemo(() => users.filter(u => u.role === 'member'), [users]);

    const filteredMembers = useMemo(() => {
        if (!searchTerm) return members;
        return members.filter(m => 
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            m.phone.includes(searchTerm)
        );
    }, [members, searchTerm]);

    const filteredLogs = useMemo(() => {
        if (selectedMemberId === 'non-member') {
            return logs.filter(log => !log.memberId);
        }
        if (selectedMemberId) {
            return logs.filter(log => log.memberId === selectedMemberId);
        }
        return logs;
    }, [logs, selectedMemberId]);

    const handleAddLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        if (isNonMemberMode) {
            if (!nonMemberName.trim()) {
                showToast('오류', '비회원 이름을 입력해주세요.', 'error');
                return;
            }
        } else {
            if (!selectedMemberId || selectedMemberId === 'non-member') {
                showToast('오류', '회원을 선택해주세요.', 'error');
                return;
            }
        }

        if (!newLogContent.trim()) {
             showToast('오류', '상담 내용을 입력해주세요.', 'error');
             return;
        }

        setIsSubmitting(true);
        try {
            const payload = isNonMemberMode ? {
                memberName: nonMemberName,
                clientPhone: nonMemberPhone,
                adminId: currentUser.id,
                type: newLogType,
                content: newLogContent
            } : {
                memberId: selectedMemberId,
                adminId: currentUser.id,
                type: newLogType,
                content: newLogContent
            };

            const updatedLogs = await api.createConsultation(payload);
            setLogs(updatedLogs);
            
            // Reset fields
            setNewLogContent('');
            if (isNonMemberMode) {
                setNonMemberName('');
                setNonMemberPhone('');
            }
            showToast('성공', '상담 일지가 저장되었습니다.', 'success');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLog = async (id: string) => {
        const isConfirmed = await confirm('정말로 이 상담 내역을 삭제하시겠습니까?');
        if (!isConfirmed) return;

        try {
            const updatedLogs = await api.deleteConsultation(id);
            setLogs(updatedLogs);
            showToast('성공', '상담 내역이 삭제되었습니다.', 'success');
        } catch (error) {
            showToast('오류', (error as Error).message, 'error');
        }
    };

    const handleSelectMember = (id: string) => {
        setSelectedMemberId(id);
        if (id === 'non-member') {
            setIsNonMemberMode(true);
        } else if (id === '') {
            setIsNonMemberMode(false);
        } else {
            setIsNonMemberMode(false);
        }
    };

    const typeLabels: Record<string, { label: string, color: string }> = {
        inquiry: { label: '문의', color: 'bg-blue-500/20 text-blue-400' },
        complaint: { label: '컴플레인', color: 'bg-red-500/20 text-red-400' },
        sales: { label: '영업/등록', color: 'bg-green-500/20 text-green-400' },
        general: { label: '일반', color: 'bg-slate-500/20 text-slate-400' },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Left: Member List */}
            <Card className="lg:col-span-1 flex flex-col h-full">
                <h3 className="text-lg font-bold text-white mb-4">대상 선택</h3>
                <div className="relative mb-4">
                    <Input 
                        placeholder="이름 또는 전화번호 검색" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                    <button
                        onClick={() => handleSelectMember('')}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                            selectedMemberId === '' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        <div className="p-2 rounded-full bg-black/20"><MessageSquare size={16} /></div>
                        <span className="font-bold">전체 상담 내역</span>
                    </button>
                    <button
                        onClick={() => handleSelectMember('non-member')}
                        className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                            selectedMemberId === 'non-member' ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                    >
                        <div className="p-2 rounded-full bg-black/20"><UserX size={16} /></div>
                        <span className="font-bold">비회원 (Walk-in)</span>
                    </button>
                    
                    <div className="border-t border-slate-700 my-2"></div>
                    
                    {filteredMembers.map(member => (
                        <button
                            key={member.id}
                            onClick={() => handleSelectMember(member.id)}
                            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3 ${
                                selectedMemberId === member.id ? 'bg-yellow-500 text-slate-900' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                        >
                            <div className="p-2 rounded-full bg-black/20"><UserIcon size={16} /></div>
                            <div>
                                <p className="font-bold">{member.name}</p>
                                <p className="text-xs opacity-70">{member.phone}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </Card>

            {/* Right: Consultation Logs & Input */}
            <Card className="lg:col-span-2 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">
                        {selectedMemberId === 'non-member' ? '비회원 상담 내역' : 
                         selectedMemberId ? `${members.find(m => m.id === selectedMemberId)?.name}님 상담 일지` : '전체 상담 내역'}
                    </h3>
                    <span className="text-sm text-slate-400">총 {filteredLogs.length}건</span>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 mb-4">
                    {filteredLogs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-500">
                            상담 내역이 없습니다.
                        </div>
                    ) : (
                        filteredLogs.map(log => (
                            <div key={log.id} className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeLabels[log.type].color}`}>
                                                {typeLabels[log.type].label}
                                            </span>
                                            <span className="font-bold text-white">{log.memberName}</span>
                                            {!log.memberId && <span className="text-xs bg-slate-600 px-1.5 py-0.5 rounded text-slate-300">비회원</span>}
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {new Date(log.createdAt).toLocaleString()} (작성자: {users.find(u => u.id === log.adminId)?.name})
                                            {log.clientPhone && <span className="ml-2 text-slate-400">📞 {log.clientPhone}</span>}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-slate-300 text-sm whitespace-pre-wrap mt-1">{log.content}</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="pt-4 border-t border-slate-700">
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="memberType" 
                                checked={!isNonMemberMode} 
                                onChange={() => setIsNonMemberMode(false)}
                                className="form-radio text-yellow-500 focus:ring-yellow-500"
                            />
                            <span className={!isNonMemberMode ? "text-white font-bold" : "text-slate-400"}>회원 상담</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="memberType" 
                                checked={isNonMemberMode} 
                                onChange={() => setIsNonMemberMode(true)}
                                className="form-radio text-yellow-500 focus:ring-yellow-500"
                            />
                            <span className={isNonMemberMode ? "text-white font-bold" : "text-slate-400"}>비회원(Walk-in) 상담</span>
                        </label>
                    </div>

                    <form onSubmit={handleAddLog} className="space-y-3">
                        {isNonMemberMode && (
                            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-800/50 rounded-lg">
                                <Input 
                                    placeholder="비회원 이름" 
                                    value={nonMemberName} 
                                    onChange={e => setNonMemberName(e.target.value)} 
                                    required={isNonMemberMode}
                                />
                                <Input 
                                    placeholder="연락처 (선택)" 
                                    value={nonMemberPhone} 
                                    onChange={e => setNonMemberPhone(e.target.value)} 
                                />
                            </div>
                        )}
                        
                        {!isNonMemberMode && (!selectedMemberId || selectedMemberId === 'non-member') && (
                            <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm text-yellow-200 text-center">
                                상담을 기록할 회원을 왼쪽 목록에서 선택해주세요.
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Select 
                                value={newLogType} 
                                onChange={e => setNewLogType(e.target.value as any)}
                                className="w-32"
                            >
                                <option value="general">일반</option>
                                <option value="inquiry">문의</option>
                                <option value="complaint">컴플레인</option>
                                <option value="sales">영업/등록</option>
                            </Select>
                            <div className="flex-1 text-right">
                                <Button type="submit" disabled={isSubmitting || (!isNonMemberMode && !selectedMemberId)}>
                                    <Plus size={16} className="mr-2" /> 기록 저장
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            placeholder="상담 내용을 입력하세요..."
                            value={newLogContent}
                            onChange={e => setNewLogContent(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default Consultations;
