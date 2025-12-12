

// Fix: Added all necessary type definitions and exported them.
// This resolves the "module has no exported member" errors across the application.
// It also removes the incorrect self-import and constant definitions that were previously in this file.
export interface Membership {
  start: string;
  end: string;
  sessions: {
    '30': number;
    '50': number;
    'mental'?: number;
  };
}

export interface User {
  id: string;
  username: string;
  name:string;
  password?: string;
  role: 'admin' | 'member' | 'instructor' | 'mental_coach';
  membership: Membership;
  notificationsRead: { [key: string]: boolean };
  notificationsDeleted: { [key: string]: boolean };
  archivedNotificationIds?: { [key: string]: boolean };
  createdAt: string;
  phone: string;
  color?: string;
  daysOff?: number[]; // 0 (Sun) to 6 (Sat)
  oneTimeOff?: string[]; // 'YYYY-MM-DD'
  memo?: string;
}

export interface Notice {
  id: string;
  authorId: string;
  title: string;
  body?: string;
  createdAt: string;
}

export interface LessonEntry {
  id: string;
  memberId: string;
  instructorId: string;
  instructorName: string;
  content: string;
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface PriceItem {
  id: string;
  name: string;
  desc: string;
  count: number;
  sessionMinutes: number;
  durationDays: number;
  listPrice: number;
  discountPercent: number;
  isEvent?: boolean;
  mentalCoachingCount?: number;
}

export interface NotificationItem {
  id: string;
  userId: string | null;
  title: string;
  body: string;
  type: 'notice' | 'lesson' | 'payment' | 'reservation';
  refId: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  productId: string;
  productName: string;
  createdAt: string;
  transactionId?: string;
  paymentMethod?: 'card' | 'kakaopay';
  pgProvider?: 'KAKAOPAY';
}

export interface Reservation {
  id: string;
  type: 'lesson' | 'training_room' | 'mental';
  memberId: string;
  memberName: string;
  dateTime: string;
  duration: number;
  createdAt: string;
  instructorId?: string;
  instructorName?: string;
  status: 'scheduled' | 'attended' | 'absent';
  isHidden?: boolean;
}

export type TurnUpTab = 'dashboard' | 'home' | 'notices' | 'lessons' | 'reservations' | 'price' | 'notifications' | 'profile' | 'instructors' | 'users';

// --- Golf Performance Analyzer Types (PSMT/TSMT) ---

export interface Question {
  id?: number;
  question: string;
  category?: string;
}

export interface ProfileData {
  subject: string;
  score: number;
  fullMark: number;
}

export interface CategorySolution {
  category: string;
  definition: string;
  solution: string;
}

export interface AssessmentData {
  psmt: {
    categories: CategorySolution[];
  };
  tsmt: {
    categories: CategorySolution[];
  };
}

export interface AssessmentResult {
  // PSMT: Golf Psychology/Mental (골프 심리/멘탈)
  totalPsmt: number;
  psmtProfile: ProfileData[];
  
  // TSMT: Technical/Skill (기술/스킬)
  totalTsmt: number;
  tsmtProfile: ProfileData[];
}
