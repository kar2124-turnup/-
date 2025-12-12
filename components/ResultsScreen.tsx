
import React from 'react';
import { AssessmentData, AssessmentResult, CategorySolution } from '../types';
import RadarProfileChart from './RadarProfileChart';

interface ResultsScreenProps {
  data: AssessmentData;
  results: AssessmentResult;
  onRestart: () => void;
}

const ResultsScreen: React.FC<ResultsScreenProps> = ({ data, results, onRestart }) => {
  
  const saveProfile = () => {
    const profileToSave = {
      date: new Date().toISOString(),
      results,
      solutions: data,
    };
    const blob = new Blob([JSON.stringify(profileToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golf_profile_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCategoryDetails = (profileType: 'psmt' | 'tsmt', categoryName: string): CategorySolution | undefined => {
    return data[profileType].categories.find(c => c.category === categoryName);
  };
  
  const psmtTotalScore = Math.round(results.totalPsmt / results.psmtProfile.length);
  const tsmtTotalScore = Math.round(results.totalTsmt / results.tsmtProfile.length);

  return (
    <div className="w-full space-y-8 animate-fade-in">
      <div className="text-center p-6 bg-gray-800 rounded-xl shadow-2xl">
        <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-300 to-blue-400 mb-2">
          평가 결과
        </h2>
        <p className="text-gray-300">당신의 골프 프로파일과 맞춤형 솔루션입니다.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* PSMT Card */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">PSMT: 심리/멘탈 프로파일</h3>
          <p className="text-center mb-4 text-gray-300">총점: <span className="font-bold text-xl text-white">{psmtTotalScore}</span> / 100</p>
          <div className="w-full h-80">
            <RadarProfileChart data={results.psmtProfile} />
          </div>
        </div>

        {/* TSMT Card */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-2xl font-bold text-blue-400 mb-4 text-center">TSMT: 기술 프로파일</h3>
           <p className="text-center mb-4 text-gray-300">총점: <span className="font-bold text-xl text-white">{tsmtTotalScore}</span> / 100</p>
          <div className="w-full h-80">
            <RadarProfileChart data={results.tsmtProfile} color="#60a5fa" />
          </div>
        </div>
      </div>
      
      {/* Solutions Section */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-3xl font-bold text-center mb-6">분야별 분석 및 솔루션</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <h4 className="text-2xl font-semibold text-green-400 mb-4">PSMT 솔루션</h4>
                  {results.psmtProfile.map(profile => {
                      const details = getCategoryDetails('psmt', profile.subject);
                      return (
                          <div key={profile.subject} className="mb-4 p-4 bg-gray-700 rounded-lg">
                              <h5 className="font-bold text-lg">{profile.subject} (점수: {profile.score})</h5>
                              <p className="text-sm text-gray-400 mt-1 mb-2"><strong>정의:</strong> {details?.definition}</p>
                              <p className="text-sm text-gray-300"><strong>솔루션:</strong> {details?.solution}</p>
                          </div>
                      );
                  })}
              </div>
              <div>
                  <h4 className="text-2xl font-semibold text-blue-400 mb-4">TSMT 솔루션</h4>
                   {results.tsmtProfile.map(profile => {
                      const details = getCategoryDetails('tsmt', profile.subject);
                      return (
                          <div key={profile.subject} className="mb-4 p-4 bg-gray-700 rounded-lg">
                              <h5 className="font-bold text-lg">{profile.subject} (점수: {profile.score})</h5>
                              <p className="text-sm text-gray-400 mt-1 mb-2"><strong>정의:</strong> {details?.definition}</p>
                              <p className="text-sm text-gray-300"><strong>솔루션:</strong> {details?.solution}</p>
                          </div>
                      );
                  })}
              </div>
          </div>
      </div>


      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 pb-4">
        <button
          onClick={saveProfile}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
        >
          프로파일 저장하기
        </button>
        <button
          onClick={onRestart}
          className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105"
        >
          다시 시작하기
        </button>
      </div>
    </div>
  );
};

export default ResultsScreen;
