import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onClose, onSave }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('오류', '새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showToast('오류', '비밀번호는 4자 이상이어야 합니다.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(currentPassword, newPassword);
      handleClose();
    } catch (error) {
      // Error toast is handled in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSave}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">비밀번호 변경</h2>
                <button type="button" onClick={handleClose} className="text-slate-400 hover:text-white" disabled={isLoading}><X size={20}/></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">현재 비밀번호</label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">새 비밀번호</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">새 비밀번호 확인</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <Button type="button" onClick={handleClose} variant="secondary" disabled={isLoading}>취소</Button>
                <Button type="submit" isLoading={isLoading}>저장</Button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PasswordChangeModal;