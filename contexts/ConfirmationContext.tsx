import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '../components/ui/Button';

type ConfirmationContextType = (message: string | React.ReactNode) => Promise<boolean>;

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error('useConfirmation must be used within a ConfirmationProvider');
  }
  return context;
};

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string | React.ReactNode>('');
  // Fix: Explicitly initialize useRef with null to resolve "Expected 1 arguments" error.
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  // Fix: Added a dependency array to useCallback to memoize the function.
  const confirm = useCallback((message: string | React.ReactNode): Promise<boolean> => {
    setMessage(message);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setIsOpen(false);
  };

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
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
            >
              <h2 className="text-lg font-bold text-white mb-4">확인</h2>
              <p className="text-slate-300 mb-6 whitespace-pre-wrap">{message}</p>
              <div className="flex justify-end gap-3">
                <Button onClick={handleCancel} variant="secondary">취소</Button>
                <Button onClick={handleConfirm} variant="destructive">확인</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmationContext.Provider>
  );
};