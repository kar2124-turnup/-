
import React, { useState } from 'react';
import type { Payment, PriceItem } from '../../types';
import Profile from './Profile';
import Instructors from './Instructors';
import MentalCoaches from './MentalCoaches';

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
            <div className="p-1 bg-slate-800 rounded-full flex items-center w-full max-w-lg border border-slate-700">
              {(['member', 'instructor', 'mental_coach'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`relative py-2 px-4 text-sm font-bold rounded-full transition-colors focus:outline-none flex-1 whitespace-nowrap ${
                    activeFilter === filter
                      ? 'bg-yellow-500 text-slate-900 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {filter === 'member' ? '회원 관리' : filter === 'instructor' ? '프로 관리' : '멘탈코치 관리'}
                </button>
              ))}
            </div>
        </div>

        <div className="mt-4">
            {activeFilter === 'member' && (
                <Profile onImpersonate={onImpersonate} payments={payments} prices={prices} />
            )}
            {activeFilter === 'instructor' && (
                <Instructors onImpersonate={onImpersonate} />
            )}
            {activeFilter === 'mental_coach' && (
                <MentalCoaches onImpersonate={onImpersonate} />
            )}
        </div>
    </div>
  );
};

export default UserManagement;
