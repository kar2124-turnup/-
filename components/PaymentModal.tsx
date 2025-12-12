import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { PriceItem, User, Payment } from '../types';
import { calcFinalPrice, generateUUID } from '../utils/helpers';
import { api } from '../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from './ui/Button';
import { useToast } from '../contexts/ToastContext';
import { X } from 'lucide-react';
import { KAKAO_JAVASCRIPT_KEY } from '../../kakaoConfig';

// Define Kakao on the window object to avoid TypeScript errors.
declare global {
  interface Window {
    Kakao: any;
  }
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceItem: PriceItem;
  onPaymentSuccess: (updatedUsers: User[], newPayment: Payment) => void;
}

const KakaoPayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-2">
      <path d="M12 5.25C8.27208 5.25 5.25 7.8133 5.25 10.9395C5.25 12.8359 6.2625 14.5026 7.82812 15.5469L7.00313 18.4219L10.2328 16.3242C10.7953 16.4273 11.3813 16.4795 12 16.4795C15.7279 16.4795 18.75 13.9162 18.75 10.7895C18.75 7.8133 15.7279 5.25 12 5.25Z" fill="#3A1D1D"></path>
    </svg>
);


const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, priceItem, onPaymentSuccess }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('결제 진행 중...');
  
  const finalPrice = calcFinalPrice(priceItem.listPrice, priceItem.discountPercent);

  useEffect(() => {
    // This check ensures the Kakao SDK script is loaded before we try to use it.
    if (window.Kakao && !window.Kakao.isInitialized()) {
      // IMPORTANT: You must replace the placeholder key in `kakaoConfig.ts` with your actual Kakao JavaScript key.
      try {
        if (KAKAO_JAVASCRIPT_KEY !== 'YOUR_KAKAO_JAVASCRIPT_KEY_HERE') {
          window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
          console.log('Kakao SDK Initialized');
        } else {
          console.warn('Kakao JavaScript Key is a placeholder. Payment will be simulated.');
        }
      } catch (e) {
        console.error('Failed to initialize Kakao SDK', e);
        showToast('오류', '카카오페이 연동 중 오류가 발생했습니다. 키를 확인해주세요.', 'error');
      }
    }
  }, [showToast]);

  const handleKakaoPay = async () => {
    if (!currentUser) {
        showToast('오류', '로그인이 필요합니다.', 'error');
        return;
    }

    if (!window.Kakao?.isInitialized()) {
        const isPlaceholder = KAKAO_JAVASCRIPT_KEY === 'YOUR_KAKAO_JAVASCRIPT_KEY_HERE';
        if (isPlaceholder) {
            console.log('Kakao SDK not initialized due to placeholder key. Proceeding with simulation.');
        } else {
            showToast('오류', '카카오페이 서비스가 준비되지 않았습니다. 잠시 후 다시 시도해주세요.', 'error');
            return;
        }
    }

    setIsLoading(true);
    try {
        // STEP 1: Simulate calling your backend to get payment ready info from Kakao.
        // In a real app, this would be an API call like:
        // const response = await fetch('/api/payment/kakao/ready', { method: 'POST', ... });
        // const { tid, redirectUrl } = await response.json();
        setLoadingMessage('결제 정보 생성 중...');
        await new Promise(resolve => setTimeout(resolve, 1500));

        // STEP 2: Simulate opening the KakaoPay popup/redirecting.
        // In a real app, you would use the redirectUrl from your backend:
        // window.open(redirectUrl, 'kakaopay-popup', 'width=450,height=600');
        setLoadingMessage('카카오페이 결제창을 확인해주세요.');
        await new Promise(resolve => setTimeout(resolve, 3000)); // User interacts with popup

        // STEP 3: Simulate successful payment and final approval on your backend.
        // After payment, Kakao redirects to your success URL with a `pg_token`.
        // Your backend would then call Kakao's `/approve` endpoint.
        // This final step is simulated by calling `processPaymentAndExtendMembership`.
        setLoadingMessage('결제 승인 및 멤버십 적용 중...');
        const transactionId = `TX_KAKAO_${generateUUID()}`;
        const result = await api.processPaymentAndExtendMembership(currentUser.id, priceItem, finalPrice, transactionId, 'kakaopay');
        
        onPaymentSuccess(result.updatedUsers, result.newPayment);

    } catch (error) {
        console.error("Payment processing failed:", (error as Error).message);
        showToast('오류', '결제 처리 중 오류가 발생했습니다.', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[9998] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">결제하기</h2>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" disabled={isLoading}><X size={20}/></button>
                </div>

                <div className="bg-slate-900/50 p-4 rounded-lg mb-6">
                    <p className="text-slate-300">선택한 상품</p>
                    <p className="text-lg font-bold text-white">{priceItem.name}</p>
                    <div className="text-right mt-2">
                        <p className="text-slate-400">최종 결제 금액</p>
                        <p className="text-2xl font-extrabold text-yellow-400">{finalPrice.toLocaleString()}원</p>
                    </div>
                </div>

                <div className="mt-8">
                     <Button 
                        onClick={handleKakaoPay} 
                        className="w-full bg-[#FEE500] text-[#3A1D1D] hover:bg-yellow-400" 
                        size="lg" 
                        isLoading={isLoading}
                     >
                        {isLoading ? loadingMessage : <><KakaoPayIcon />카카오페이로 결제</>}
                    </Button>
                </div>
                 <p className="text-xs text-slate-500 text-center mt-4">
                    위 버튼을 누르면 카카오페이 화면으로 이동합니다. <br/> (이 앱은 시뮬레이션으로, 실제 결제가 이루어지지 않습니다.)
                </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;