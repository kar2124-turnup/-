import React from 'react';
// Fix: Import MotionProps for correct framer-motion prop typing.
import { motion, type MotionProps } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  initial?: MotionProps['initial'];
  animate?: MotionProps['animate'];
  exit?: MotionProps['exit'];
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '',
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  exit = { opacity: 0, y: -20 },
}) => {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={{ duration: 0.3 }}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 sm:p-8 shadow-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
};