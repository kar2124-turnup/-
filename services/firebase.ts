
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Fix: Cast import.meta to any to resolve TS error "Property 'env' does not exist on type 'ImportMeta'".
const env = (import.meta as any).env;

// TODO: 실제 Firebase 프로젝트 설정값으로 교체해야 합니다.
// Firebase Console -> 프로젝트 설정 -> 일반 -> 내 앱 -> SDK 설정 및 구성
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 및 Auth 객체 내보내기 (다른 파일에서 import하여 사용)
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
