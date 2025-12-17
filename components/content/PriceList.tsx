
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { PriceItem } from '../../types';
import { calcFinalPrice, calcPackPublicPrice, generateUUID } from '../../utils/helpers';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../services/api';

interface PriceListProps {
  prices: PriceItem[];
  setPrices: React.Dispatch<React.SetStateAction<PriceItem[]>>;
}

const DEFAULT_NEW_PRICE: Omit<PriceItem, 'id'> = {
  name: '',
  desc: '',
  count: 10,
  sessionMinutes: 50,
  durationDays: 90,
  listPrice: calcPackPublicPrice(10),
  discountPercent: 0,
  isEvent: false,
  mentalCoachingCount: 0,
  rentalCount: 0,
};

const PriceList: React.FC<PriceListProps> = ({ prices, setPrices }) => {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirmation();

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<PriceItem | null>(null);

  // Add state
  const [isAdding, setIsAdding] = useState(false);
  const [newPrice, setNewPrice] = useState<Omit<PriceItem, 'id'>>(DEFAULT_NEW_PRICE);

  // --- Edit Handlers ---
  const handleEdit = (price: PriceItem) => {
    setEditingId(price.id);
    setCurrentPrice({ ...price });
    setIsAdding(false); // Ensure add form is closed
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setCurrentPrice(null);
  };

  const handleSaveEdit = async () => {
    if (currentPrice) {
      try {
        const newPrices = prices.map(p => p.id === currentPrice.id ? currentPrice : p);
        await api.updatePrices(newPrices);
        setPrices(newPrices);
        showToast('성공', '가격 정보가 수정되었습니다.', 'success');
        handleCancelEdit();
      } catch (error) {
        showToast('오류', '저장 중 오류가 발생했습니다.', 'error');
        console.error("Price save failed:", (error as Error).message);
      }
    }
  };

  const handleEditFieldChange = (field: keyof PriceItem, value: string | number | boolean) => {
    if (currentPrice) {
      let updatedPrice = { ...currentPrice, [field]: value };
      if(field === 'count' && typeof value === 'number') {
          updatedPrice = {...updatedPrice, listPrice: calcPackPublicPrice(value)};
      }
      setCurrentPrice(updatedPrice);
    }
  };

  // --- Add Handlers ---
  const handleAddNewClick = () => {
    setNewPrice(DEFAULT_NEW_PRICE);
    setIsAdding(true);
    setEditingId(null); // Ensure edit form is closed
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
  };

  const handleSaveNew = async () => {
    if (!newPrice.name || (newPrice.count <= 0 && (newPrice.mentalCoachingCount || 0) <= 0 && (newPrice.rentalCount || 0) <= 0)) {
      showToast('오류', '상품명과 세션(레슨, 멘탈, 대관 중 하나 이상) 횟수를 입력해주세요.', 'error');
      return;
    }

    try {
      const newItem: PriceItem = { ...newPrice, id: generateUUID() };
      const newPrices = [...prices, newItem];
      await api.updatePrices(newPrices);
      setPrices(newPrices);
      showToast('성공', '새 상품이 추가되었습니다.', 'success');
      setIsAdding(false);
    } catch (error) {
      showToast('오류', '상품 추가 중 오류가 발생했습니다.', 'error');
      console.error("New price item creation failed:", (error as Error).message);
    }
  };

  const handleNewFieldChange = (field: keyof Omit<PriceItem, 'id'>, value: string | number | boolean) => {
    let updatedPrice = { ...newPrice, [field]: value };
    if (field === 'count' && typeof value === 'number') {
      updatedPrice = {...updatedPrice, listPrice: calcPackPublicPrice(value)};
    }
    setNewPrice(updatedPrice);
  };

  // --- Delete Handler ---
  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('정말로 이 상품을 삭제하시겠습니까?');
    if (isConfirmed) {
      try {
        const newPrices = prices.filter(p => p.id !== id);
        await api.updatePrices(newPrices);
        setPrices(newPrices);
        showToast('성공', '상품이 삭제되었습니다.', 'success');
      } catch (error) {
        showToast('오류', '삭제 중 오류가 발생했습니다.', 'error');
        console.error("Price deletion failed:", (error as Error).message);
      }
    }
  };
  
  const sortedPrices = [...prices].sort((a, b) => (b.isEvent ? 1 : 0) - (a.isEvent ? 1 : 0));

  const renderForm = (
    priceData: PriceItem | Omit<PriceItem, 'id'>,
    isNew: boolean,
    changeHandler: (field: any, value: any) => void,
    saveHandler: () => void,
    cancelHandler: () => void
  ) => {
    const p = priceData as PriceItem; // For simplicity
    return (
      <motion.div
        layout
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="bg-slate-800 rounded-lg p-6 flex flex-col mb-6 border border-slate-700"
      >
        <h3 className="text-xl font-bold text-white mb-4">{isNew ? '새 상품 추가' : '상품 수정'}</h3>
        <Input value={p.name} onChange={e => changeHandler('name', e.target.value)} placeholder="상품명" className="text-xl font-bold mb-2" />
        <Input value={p.desc} onChange={e => changeHandler('desc', e.target.value)} placeholder="상품 설명" className="text-sm mb-4" />
        <div className="space-y-2 text-sm text-slate-300">
          <p><strong>레슨 세션:</strong> <Input type="number" value={p.count} onChange={e => changeHandler('count', Number(e.target.value))} className="w-20 inline-block" /> 회</p>
          <p><strong>멘탈코칭:</strong> <Input type="number" value={p.mentalCoachingCount || 0} onChange={e => changeHandler('mentalCoachingCount', Number(e.target.value))} className="w-20 inline-block" /> 회</p>
          <p><strong>대관 횟수:</strong> <Input type="number" value={p.rentalCount || 0} onChange={e => changeHandler('rentalCount', Number(e.target.value))} className="w-20 inline-block" /> 회</p>
          <p><strong>레슨 시간:</strong> <Input type="number" value={p.sessionMinutes} onChange={e => changeHandler('sessionMinutes', Number(e.target.value))} className="w-20 inline-block" /> 분</p>
          <p><strong>사용기간:</strong> <Input type="number" value={p.durationDays} onChange={e => changeHandler('durationDays', Number(e.target.value))} className="w-20 inline-block" /> 일</p>
          <p><strong>정가:</strong> <Input type="number" value={p.listPrice} onChange={e => changeHandler('listPrice', Number(e.target.value))} className="w-28 inline-block" /> 원</p>
          <p><strong>할인:</strong> <Input type="number" value={p.discountPercent} onChange={e => changeHandler('discountPercent', Number(e.target.value))} className="w-20 inline-block" /> %</p>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700">
          <label className="flex items-center text-slate-300 cursor-pointer">
              <input 
                  type="checkbox"
                  checked={p.isEvent || false}
                  onChange={e => changeHandler('isEvent', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="ml-2">이벤트 상품으로 지정</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={cancelHandler} variant="secondary">취소</Button>
          <Button onClick={saveHandler}>저장</Button>
        </div>
      </motion.div>
    );
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">레슨상품 안내</h2>
        {currentUser?.role === 'admin' && !isAdding && (
          <Button onClick={handleAddNewClick}>새 상품 추가</Button>
        )}
      </div>

      <AnimatePresence>
        {isAdding && renderForm(newPrice, true, handleNewFieldChange, handleSaveNew, handleCancelAdd)}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedPrices.map(price => {
          const isEditing = editingId === price.id;
          const p = isEditing && currentPrice ? currentPrice : price;
          const finalPrice = calcFinalPrice(p.listPrice || 0, p.discountPercent || 0);
          const isEvent = p.isEvent || false;

          return (
            <motion.div layout key={p.id} className={`bg-slate-800 rounded-lg p-6 flex flex-col transition-all duration-300 border ${isEvent ? 'border-yellow-500/50' : 'border-transparent'}`}>
              {isEditing ? (
                renderForm(p, false, handleEditFieldChange, handleSaveEdit, handleCancelEdit)
              ) : (
                <>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    {p.name}
                    {isEvent && <span className="text-xs bg-yellow-500 text-slate-900 font-bold px-2 py-0.5 rounded-full">EVENT</span>}
                  </h3>
                  <p className="text-slate-300 text-sm mb-4 flex-grow">{p.desc}</p>
                  <ul className="text-sm space-y-1 text-slate-300">
                    <li><strong>레슨:</strong> {p.count}회 ({p.sessionMinutes}분)</li>
                    {p.mentalCoachingCount && p.mentalCoachingCount > 0 ? (
                        <li><strong>멘탈코칭:</strong> {p.mentalCoachingCount}회</li>
                    ) : null}
                    {p.rentalCount && p.rentalCount > 0 ? (
                        <li><strong>대관:</strong> {p.rentalCount}회</li>
                    ) : null}
                    {p.durationDays && <li><strong>사용기간:</strong> {p.durationDays}일</li>}
                  </ul>
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {p.discountPercent > 0 ? (
                      <div>
                        <p className="text-sm text-slate-400 line-through">{p.listPrice.toLocaleString()}원</p>
                        <p className="text-xl font-bold text-yellow-400">{finalPrice.toLocaleString()}원</p>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-white">{finalPrice.toLocaleString()}원</p>
                    )}
                  </div>
                  {currentUser?.role === 'admin' ? (
                    <div className="mt-4 flex justify-end gap-2">
                      <Button onClick={() => handleDelete(price.id)} variant="destructive" size="sm">삭제</Button>
                      <Button onClick={() => handleEdit(price)} size="sm">수정</Button>
                    </div>
                  ) : null}
                </>
              )}
            </motion.div>
          )
        })}
      </div>
    </Card>
  );
};

export default PriceList;
