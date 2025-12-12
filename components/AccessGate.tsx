import React from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useAuth } from '../hooks/useAuth';

const AccessGate: React.FC = () => {
  const { logout } = useAuth();

  return (
    <Card className="text-center">
      <div className="text-2xl font-bold text-red-500">이용기간 만료</div>
      <p className="text-slate-300 mt-2">
        멤버십 이용기간이 만료되었습니다.
        <br />
        관리자에게 문의하여 이용기간을 연장해 주세요.
      </p>
      <div className="mt-6 w-full">
        <Button onClick={logout} className="w-full">
          로그인 화면으로 이동
        </Button>
      </div>
    </Card>
  );
};

export default AccessGate;