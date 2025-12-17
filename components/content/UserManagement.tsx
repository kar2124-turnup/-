
import React, { useState } from 'react';
import type { Payment, PriceItem } from '../../types';
import Profile from './Profile';
import Instructors from './Instructors';
import MentalCoaches from './MentalCoaches';
import { motion, AnimatePresence } from 'framer-motion';

interface UserManagementProps {
  onImpersonate: (userId: string) => void;
  payments: Payment[];
  prices: PriceItem[];
}

type UserFilter = 'member' | 'instructor' | 'mental_coach';

const UserManagement: React.FC<UserManagementProps> = ({ onImpersonate, payments, prices }) => {
  const [activeFilter, setActiveFilter] = useState<UserFilter>('member');

  return (
    <div className="min-h-[500px]">
       <div className="mb-6 flex justify-center">
            <div className="p-1 bg-slate-800 rounded-full flex items-center w-full max-w-lg border border-slate-700 overflow-x-auto">
              {(['member', 'instructor', 'mental_coach'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`relative py-2 px-4 text-sm font-bold rounded-full transition-colors focus:outline-none flex-1 whitespace-nowrap ${
                    activeFilter === filter
                      ? 'text-slate-900'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {activeFilter === filter && (
                    <motion.div
                      layoutId="user-management-filter-pill"
                      className="absolute inset-0 bg-yellow-500 rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {filter === 'member' ? '회원 관리' : filter === 'instructor' ? '프로 관리' : '멘탈코치 관리'}
                  </span>
                </button>
              ))}
            </div>
        </div>

        <AnimatePresence mode="wait">
            {activeFilter === 'member' ? (
                <motion.div
                    key="member"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                >
                    <Profile onImpersonate={onImpersonate} payments={payments} prices={prices} />
                </motion.div>
            ) : activeFilter === 'instructor' ? (
                <motion.div
                    key="instructor"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                >
                    <Instructors onImpersonate={onImpersonate} />
                </motion.div>
            ) : (
                <motion.div
                    key="mental_coach"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                >
                    <MentalCoaches onImpersonate={onImpersonate} />
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default UserManagement;
