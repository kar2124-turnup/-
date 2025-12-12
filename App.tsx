import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import { useAuth } from './hooks/useAuth';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/dashboards/AdminDashboard';
import MemberDashboard from './components/dashboards/MemberDashboard';
import InstructorDashboard from './components/dashboards/InstructorDashboard';
import MentalCoachDashboard from './components/dashboards/MentalCoachDashboard';
import AccessGate from './components/AccessGate';
import { daysUntil } from './utils/helpers';
import type { User } from './types';

const AppContainer: React.FC = () => {
  const { currentUser, authLoading, isImpersonating, stopImpersonation } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen bg-slate-900" />;
  }

  const renderContent = () => {
    if (!currentUser) {
      return <LoginScreen />;
    }

    const isExpired = currentUser.role === 'member' && daysUntil(currentUser.membership.end) < 0;

    if (isExpired) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <AccessGate />
            </div>
        )
    }

    if (currentUser.role === 'admin') {
      return <AdminDashboard key={currentUser.id} currentUser={currentUser} />;
    }

    if (currentUser.role === 'member') {
      return <MemberDashboard key={currentUser.id} currentUser={currentUser} />;
    }
    
    if (currentUser.role === 'instructor') {
      return <InstructorDashboard key={currentUser.id} currentUser={currentUser} />;
    }

    if (currentUser.role === 'mental_coach') {
      return <MentalCoachDashboard key={currentUser.id} currentUser={currentUser} />;
    }

    return <LoginScreen />; // Fallback
  };

  return (
    <>
      {isImpersonating && (
        <div className="bg-yellow-500 text-center text-slate-900 font-bold p-2 text-sm sticky top-0 z-50">
          다른 사용자로 보는 중입니다. <button onClick={stopImpersonation} className="underline font-bold">원래대로 돌아가기</button>
        </div>
      )}
      {renderContent()}
    </>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmationProvider>
          <AppContainer />
        </ConfirmationProvider>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;