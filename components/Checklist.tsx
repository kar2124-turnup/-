
import React, { useState, useMemo } from 'react';
import { Question } from '../types';

interface ChecklistProps {
  title: string;
  questions: Question[];
  onComplete: (answers: { [key: number]: number }) => void;
}

const Checklist: React.FC<ChecklistProps> = ({ title, questions, onComplete }) => {
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 10;
  
  const totalPages = Math.ceil(questions.length / questionsPerPage);

  const handleAnswerChange = (index: number, value: number) => {
    setAnswers(prev => ({ ...prev, [index]: value }));
  };
  
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;
  
  const currentQuestions = useMemo(() => {
    return questions.slice(currentPage * questionsPerPage, (currentPage + 1) * questionsPerPage);
  }, [questions, currentPage]);
  
  const globalIndexOffset = currentPage * questionsPerPage;

  return (
    <div className="w-full bg-gray-800 p-6 sm:p-8 rounded-xl shadow-2xl animate-fade-in">
      <h2 className="text-3xl font-bold text-center mb-2 text-green-400">{title}</h2>
      <p className="text-center text-gray-400 mb-6">각 문항에 대해 1(전혀 그렇지 않다)부터 5(매우 그렇다)까지 평가해주세요.</p>

      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
      </div>
      
      <div className="space-y-6">
        {currentQuestions.map((q, localIndex) => {
          const globalIndex = globalIndexOffset + localIndex;
          return (
            <div key={globalIndex} className="bg-gray-700 p-4 rounded-lg">
              <p className="font-semibold mb-3 text-gray-200">{globalIndex + 1}. {q.question}</p>
              <div className="flex justify-around items-center">
                <span className="text-sm text-gray-400">전혀 아님</span>
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    onClick={() => handleAnswerChange(globalIndex, value)}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full text-sm sm:text-base font-bold transition-all duration-200 ${answers[globalIndex] === value ? 'bg-green-500 text-white scale-110 shadow-lg' : 'bg-gray-600 hover:bg-gray-500'}`}
                  >
                    {value}
                  </button>
                ))}
                <span className="text-sm text-gray-400">매우 그렇다</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center mt-8">
        <button 
          onClick={() => setCurrentPage(p => p - 1)} 
          disabled={currentPage === 0}
          className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전
        </button>
        <span className="text-gray-300">{currentPage + 1} / {totalPages}</span>
        {currentPage < totalPages - 1 ? (
           <button 
            onClick={() => setCurrentPage(p => p + 1)} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
           >
            다음
           </button>
        ) : (
            <button
                onClick={() => onComplete(answers)}
                disabled={answeredCount < questions.length}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
                완료
            </button>
        )}
      </div>
    </div>
  );
};

export default Checklist;
