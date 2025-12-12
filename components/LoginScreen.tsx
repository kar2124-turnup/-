import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocalState } from '../hooks/useLocalState';
import { STORAGE_KEYS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import type { PriceItem } from '../types';
import { calcFinalPrice } from '../utils/helpers';

const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [rememberId, setRememberId] = useLocalState<string>(STORAGE_KEYS.rememberId, '');
  
  const [username, setUsername] = useState(rememberId);
  const [password, setPassword] = useState('');
  const [isAutoLogin, setIsAutoLogin] = useState(!!rememberId);
  const [isLoading, setIsLoading] = useState(false);
  const [eventData, setEventData] = useState<PriceItem | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const prices = await api.getPrices();
        const event = prices.find(p => p.isEvent);
        setEventData(event || null);
      } catch (error) {
        console.error("Failed to fetch event data:", (error as Error).message);
      }
    };
    fetchEvent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const user = await login(username, password);

    if (user) {
      showToast('로그인 성공', `${user.name}님, 환영합니다.`, 'success');
      if (isAutoLogin) {
        setRememberId(username);
      } else {
        setRememberId('');
      }
    } else {
      showToast('로그인 실패', '아이디 또는 비밀번호가 일치하지 않습니다.', 'error');
    }
    setIsLoading(false);
  };

  const finalPrice = eventData ? calcFinalPrice(eventData.listPrice, eventData.discountPercent) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 gap-8">
      {eventData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="text-center border-yellow-500/50">
            <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <span className="text-xs bg-yellow-500 text-slate-900 font-bold px-2 py-0.5 rounded-full animate-pulse">
                EVENT
              </span>
              {eventData.name}
            </h2>
            <p className="mt-2 text-slate-300">{eventData.desc}</p>
            <div className="mt-4">
              <p className="text-slate-400 line-through text-lg">{eventData.listPrice.toLocaleString()}원</p>
              <p className="text-3xl font-extrabold text-yellow-400">{finalPrice.toLocaleString()}원</p>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              로그인 후 '레슨상품' 탭에서 확인하실 수 있습니다.
            </p>
          </Card>
        </motion.div>
      )}
      <Card className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-white">TURN UP GOLF</h1>
            <p className="text-yellow-500 font-semibold mt-1 text-2xl">STUDIO</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoLogin}
                  onChange={(e) => setIsAutoLogin(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-yellow-500 focus:ring-yellow-500"
                />
                <span className="ml-2">자동 로그인</span>
              </label>
            </div>
            <Button type="submit" isLoading={isLoading} className="w-full" size="lg">
              로그인
            </Button>
          </form>
        </motion.div>
      </Card>
    </div>
  );
};

export default LoginScreen;