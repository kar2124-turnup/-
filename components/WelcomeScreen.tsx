
import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="text-center bg-gray-800 p-8 rounded-xl shadow-2xl animate-fade-in">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-blue-400 to-purple-500 mb-4">
        Golf Performance Analyzer
      </h1>
      <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
        행동 신경 과학과 스포츠 심리학을 기반으로 당신의 골프 잠재력을 분석합니다. 심리적(PSMT) 및 기술적(TSMT) 강점과 약점을 파악하고 세계 최고 선수들의 훈련법을 바탕으로 맞춤형 솔루션을 받아보세요.
      </p>
      <button
        onClick={onStart}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 shadow-lg"
      >
        평가 시작하기
      </button>
    </div>
  );
};

export default WelcomeScreen;
