
import React, { useState } from 'react';
import WelcomeScreen from '../WelcomeScreen';
import Checklist from '../Checklist';
import ResultsScreen from '../ResultsScreen';
import { AssessmentData, Question, AssessmentResult, ProfileData, CategorySolution } from '../../types';
import { Card } from '../ui/Card';

// PSMT 문항 데이터 (행동 신경 과학 및 스포츠 심리학 기반)
const PSMT_QUESTIONS: Question[] = [
  // Focus Type (주의 집중 유형: 전두엽 기능 관련)
  { id: 1, question: "어드레스 시 주변의 소음이나 방해 요소가 크게 신경 쓰이지 않는다.", category: "Focus" },
  { id: 2, question: "샷을 하기 직전, 명확한 한 가지 목표(타겟)에만 집중한다.", category: "Focus" },
  { id: 3, question: "미스 샷이 났을 때, 지난 실수를 빨리 잊고 다음 샷에 집중한다.", category: "Focus" },
  
  // Emotional Regulation (감정 조절: 편도체 안정성)
  { id: 4, question: "경기 중 긴장감이 높아져도 신체 루틴(호흡, 그립 등)이 일정하다.", category: "Emotion" },
  { id: 5, question: "동반자의 플레이나 말에 감정이 쉽게 흔들리지 않는다.", category: "Emotion" },
  { id: 6, question: "버디나 더블보기 후에도 평정심을 유지하며 다음 홀로 이동한다.", category: "Emotion" },

  // Visualization & Strategy (시각화 및 전략: 뇌신경 경로 활성화)
  { id: 7, question: "샷을 하기 전, 공이 날아가는 궤적을 머릿속으로 생생하게 그린다.", category: "Visualization" },
  { id: 8, question: "위험 요소(해저드, OB)보다 안전한 공략 지점을 먼저 본다.", category: "Visualization" },
  
  // Confidence & Decisiveness (자신감 및 결단력: 도파민/보상 체계)
  { id: 9, question: "클럽을 선택하고 나면 내 선택을 의심하지 않고 샷을 한다.", category: "Confidence" },
  { id: 10, question: "나의 스윙 메커니즘을 신뢰하며 과감하게 스윙한다.", category: "Confidence" }
];

// 기술(TSMT) 문항 데이터
const TSMT_QUESTIONS: Question[] = [
  { id: 11, question: "드라이버 비거리가 내 신체 조건 대비 충분하다고 생각한다.", category: "Power" },
  { id: 12, question: "아이언 샷의 일관성(정타 확률)이 높은 편이다.", category: "Accuracy" },
  { id: 13, question: "그린 주변 20m 이내 어프로치에서 핀에 붙일 자신이 있다.", category: "ShortGame" },
  { id: 14, question: "3m 이내 퍼팅 성공률이 높다.", category: "Putting" },
  { id: 15, question: "경사지(트러블 상황)에서의 대처 능력이 좋다.", category: "TroubleShot" }
];

// 분석 결과 데이터 및 솔루션
const ASSESSMENT_DATA: AssessmentData = {
  psmt: {
    categories: [
      { category: "Focus", definition: "주의 집중 및 전환 능력 (전두엽)", solution: "프리샷 루틴을 3단계로 단순화하고, '공을 보는 것'보다 '타겟을 상상하는 것'에 뇌를 사용하세요. 4-7-8 호흡법을 추천합니다." },
      { category: "Emotion", definition: "감정 조절 및 스트레스 관리 (편도체)", solution: "미스 샷 이후 '반응'하지 않고 '관찰'하는 훈련이 필요합니다. 샷 결과와 자아를 분리하고, 걷는 속도를 조절하여 심박수를 낮추세요." },
      { category: "Visualization", definition: "뇌신경 시각화 능력", solution: "실제 샷 연습만큼 이미지 트레이닝 비중을 높이세요. 공이 떨어지는 지점뿐만 아니라 날아가는 탄도까지 구체적으로 상상하는 연습을 하세요." },
      { category: "Confidence", definition: "자기 확신 및 결단력", solution: "망설임은 근육의 긴장을 유발합니다. 클럽 선택 후에는 5초 이내에 샷을 하세요. 작은 성공 경험을 누적하여 뇌의 보상 회로를 강화하세요." }
    ]
  },
  tsmt: {
    categories: [
      { category: "Power", definition: "비거리 및 파워", solution: "지면 반발력 활용과 코어 회전 훈련이 필요합니다. 스피드 스틱 등을 활용한 빈 스윙 훈련을 병행하세요." },
      { category: "Accuracy", definition: "방향성 및 일관성", solution: "백스윙 탑에서의 템포를 점검하고, 체중 이동이 올바르게 이루어지는지 영상 분석을 통해 확인하세요." },
      { category: "ShortGame", definition: "숏게임 및 감각", solution: "캐리와 런의 비율을 계산하는 '공식'을 만들고, 다양한 라이에서의 터치감을 익히세요." },
      { category: "Putting", definition: "퍼팅 스트로크 및 리딩", solution: "거리감 훈련을 최우선으로 하세요. 눈을 감고 스트로크하여 감각을 극대화하는 훈련이 도움됩니다." },
      { category: "TroubleShot", definition: "위기 관리 능력", solution: "욕심을 버리고 레이업하는 전략을 수립하세요. 경사지에 따른 탄도 변화를 이해해야 합니다." }
    ]
  }
};

const MentalAnalysis: React.FC = () => {
  const [step, setStep] = useState<'welcome' | 'psmt' | 'tsmt' | 'results'>('welcome');
  const [psmtAnswers, setPsmtAnswers] = useState<{ [key: number]: number }>({});
  const [tsmtAnswers, setTsmtAnswers] = useState<{ [key: number]: number }>({});

  const calculateScore = (answers: { [key: number]: number }, questions: Question[], categoryName: string) => {
    const categoryQuestions = questions.filter(q => q.category === categoryName);
    if (categoryQuestions.length === 0) return 0;
    
    const sum = categoryQuestions.reduce((acc, q) => acc + (answers[q.id!] || 0), 0);
    // 5점 만점을 100점 만점으로 환산
    return Math.round((sum / (categoryQuestions.length * 5)) * 100);
  };

  const getResults = (): AssessmentResult => {
    // PSMT Categories
    const psmtCategories = Array.from(new Set(PSMT_QUESTIONS.map(q => q.category!)));
    const psmtProfile: ProfileData[] = psmtCategories.map(cat => ({
      subject: cat,
      score: calculateScore(psmtAnswers, PSMT_QUESTIONS, cat),
      fullMark: 100
    }));

    // TSMT Categories
    const tsmtCategories = Array.from(new Set(TSMT_QUESTIONS.map(q => q.category!)));
    const tsmtProfile: ProfileData[] = tsmtCategories.map(cat => ({
      subject: cat,
      score: calculateScore(tsmtAnswers, TSMT_QUESTIONS, cat),
      fullMark: 100
    }));

    const totalPsmt = psmtProfile.reduce((acc, curr) => acc + curr.score, 0);
    const totalTsmt = tsmtProfile.reduce((acc, curr) => acc + curr.score, 0);

    return {
      totalPsmt,
      psmtProfile,
      totalTsmt,
      tsmtProfile
    };
  };

  return (
    <Card className="min-h-[600px] flex items-center justify-center">
      {step === 'welcome' && (
        <WelcomeScreen onStart={() => setStep('psmt')} />
      )}
      
      {step === 'psmt' && (
        <Checklist 
          title="STEP 1: PSMT (심리/멘탈) 진단" 
          questions={PSMT_QUESTIONS} 
          onComplete={(answers) => {
            setPsmtAnswers(answers);
            setStep('tsmt');
          }} 
        />
      )}

      {step === 'tsmt' && (
        <Checklist 
          title="STEP 2: TSMT (기술/스킬) 진단" 
          questions={TSMT_QUESTIONS} 
          onComplete={(answers) => {
            setTsmtAnswers(answers);
            setStep('results');
          }} 
        />
      )}

      {step === 'results' && (
        <div className="w-full">
            <ResultsScreen 
            data={ASSESSMENT_DATA} 
            results={getResults()} 
            onRestart={() => {
                setPsmtAnswers({});
                setTsmtAnswers({});
                setStep('welcome');
            }} 
            />
        </div>
      )}
    </Card>
  );
};

export default MentalAnalysis;
