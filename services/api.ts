
import { STORAGE_KEYS } from '../constants';
import type { User, Notice, LessonEntry, PriceItem, NotificationItem, Payment, Reservation, Locker, ConsultationLog } from '../types';
import { generateUUID, nowISO, daysFromNow, calcPackPublicPrice } from '../utils/helpers';

// --- SEED DATA ---
const seedData = {
  getUsers: (): User[] => ([
    // Admin user
    { id: 'admin', username: 'tug', name: '관리자', password: '2124', role: 'admin', membership: { start: nowISO(), end: daysFromNow(9999), sessions: { '30': 999, '50': 999, 'mental': 999, 'rentals': 999 } }, notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-0000-0000', memo: '' },
    
    // New Members
    { id: 'user_sparrow', username: '1', name: '참새', password: '1', role: 'member', membership: { start: nowISO(), end: daysFromNow(60), sessions: { '30': 10, '50': 10, 'mental': 0, 'rentals': 0 } }, notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-1111-1111', memo: '등록 상품: 50분 10회 레슨' },
    { id: 'user_pigeon', username: '2', name: '비둘기', password: '2', role: 'member', membership: { start: nowISO(), end: daysFromNow(30), sessions: { '30': 5, '50': 5, 'mental': 0, 'rentals': 5 } }, notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-2222-2222', memo: '' },
    { id: 'user_eagle', username: '3', name: '독수리', password: '3', role: 'member', membership: { start: nowISO(), end: daysFromNow(-10), sessions: { '30': 0, '50': 0, 'mental': 0, 'rentals': 0 } }, notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-3333-3333', memo: '재등록 요망' }, // Expired member
    
    // New Instructors (With Settlement Rates)
    { 
      id: 'inst_jwoo', username: '11', name: '안진우', password: '11', role: 'instructor', 
      membership: { start: nowISO(), end: daysFromNow(9999), sessions: { '30': 0, '50': 0 } }, 
      notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-1111-0000', color: '#3b82f6', daysOff: [2], oneTimeOff: [], memo: '',
      settlementRates: { '30': 15000, '50': 25000, 'mental': 0 } 
    },
    { 
      id: 'inst_dhoon', username: '22', name: '김도훈', password: '22', role: 'instructor', 
      membership: { start: nowISO(), end: daysFromNow(9999), sessions: { '30': 0, '50': 0 } }, 
      notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-2222-0000', color: '#22c55e', daysOff: [], oneTimeOff: [], memo: '',
      settlementRates: { '30': 15000, '50': 25000, 'mental': 0 } 
    },

    // Mental Coach (With Settlement Rates)
    { 
      id: 'mental_coach_kim', username: '33', name: '김멘탈', password: '33', role: 'mental_coach', 
      membership: { start: nowISO(), end: daysFromNow(9999), sessions: { '30': 0, '50': 0 } }, 
      notificationsRead: {}, notificationsDeleted: {}, archivedNotificationIds: {}, createdAt: nowISO(), phone: '010-3333-0000', color: '#ec4899', daysOff: [], oneTimeOff: [], memo: '',
      settlementRates: { '30': 0, '50': 0, 'mental': 30000 }
    },
  ]),
  getNotices: (users: User[]): Notice[] => ([
    { id: generateUUID(), authorId: users.find(u => u.role === 'admin')?.id || 'admin', title: '7월 정기 휴무 안내', body: '안녕하세요. 7월 15일은 스튜디오 정기 휴무일입니다.', createdAt: daysFromNow(-5) },
    { id: generateUUID(), authorId: users.find(u => u.role === 'admin')?.id || 'admin', title: '새로운 레슨 프로그램 런칭', body: '초보자를 위한 스윙 교정 프로그램이 새롭게 시작됩니다. 많은 관심 부탁드립니다.', createdAt: daysFromNow(-10) },
  ]),
  getPrices: (): PriceItem[] => ([
    { id: 'event1', isEvent: true, name: '썸머 스페셜 이벤트', desc: '여름 시즌을 맞아 특별 할인 이벤트를 진행합니다. 지금 바로 등록하세요!', count: 20, sessionMinutes: 50, durationDays: 120, listPrice: 1000000, discountPercent: 20, mentalCoachingCount: 0, rentalCount: 0 },
    { id: 'p1', name: '50분 10회 레슨', desc: '가장 인기 있는 기본 패키지입니다. 3개월 내 사용 가능합니다.', count: 10, sessionMinutes: 50, durationDays: 90, listPrice: calcPackPublicPrice(10), discountPercent: 10, mentalCoachingCount: 0, rentalCount: 0 },
    { id: 'p2', name: '50분 20회 레슨', desc: '장기적인 실력 향상을 위한 합리적인 선택입니다.', count: 20, sessionMinutes: 50, durationDays: 180, listPrice: calcPackPublicPrice(20), discountPercent: 15, mentalCoachingCount: 0, rentalCount: 0 },
    { id: 'p3', name: '30분 10회 레슨', desc: '집중적인 교정을 위한 30분 레슨 패키지입니다.', count: 10, sessionMinutes: 30, durationDays: 90, listPrice: calcPackPublicPrice(10) * 0.7, discountPercent: 5, mentalCoachingCount: 0, rentalCount: 0 },
    { id: 'p_mental', name: '멘탈코칭 5회', desc: '필드에서의 심리적 안정을 위한 전문 멘탈 코칭 프로그램입니다.', count: 0, sessionMinutes: 50, durationDays: 60, listPrice: 500000, discountPercent: 0, mentalCoachingCount: 5, rentalCount: 0 },
    { id: 'p_rental', name: 'GC쿼드 대관 10회', desc: 'GC쿼드 룸을 자유롭게 이용할 수 있는 대관권입니다.', count: 0, sessionMinutes: 60, durationDays: 90, listPrice: 300000, discountPercent: 0, mentalCoachingCount: 0, rentalCount: 10 },
  ]),
  getLessons: (users: User[]): LessonEntry[] => {
    const member = users.find(u => u.username === '1');
    const instructor = users.find(u => u.username === '11');
    if (!member || !instructor) return [];
    return [
      { id: generateUUID(), memberId: member.id, instructorId: instructor.id, instructorName: instructor.name, content: '드라이버 스윙 궤도 수정. 백스윙 시 머리 고정 연습 필요.', createdAt: daysFromNow(-3), videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
      { id: generateUUID(), memberId: member.id, instructorId: instructor.id, instructorName: instructor.name, content: '아이언 샷 정확도 향상. 어드레스 자세 점검.', createdAt: daysFromNow(-8) },
    ];
  },
  getReservations: (users: User[]): Reservation[] => {
    const member = users.find(u => u.username === '1');
    const instructor = users.find(u => u.username === '11');
    if (!member || !instructor) return [];
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 3);
    nextWeek.setHours(16, 30, 0, 0);

    const pastLesson = new Date();
    pastLesson.setDate(pastLesson.getDate() - 2);
    pastLesson.setHours(11, 0, 0, 0);
    
    return [
      { id: generateUUID(), type: 'lesson', memberId: member.id, memberName: member.name, dateTime: tomorrow.toISOString(), duration: 50, createdAt: nowISO(), instructorId: instructor.id, instructorName: instructor.name, status: 'scheduled' },
      { id: generateUUID(), type: 'lesson', memberId: member.id, memberName: member.name, dateTime: nextWeek.toISOString(), duration: 30, createdAt: nowISO(), instructorId: instructor.id, instructorName: instructor.name, status: 'scheduled' },
      { id: generateUUID(), type: 'lesson', memberId: member.id, memberName: member.name, dateTime: pastLesson.toISOString(), duration: 50, createdAt: daysFromNow(-3), instructorId: instructor.id, instructorName: instructor.name, status: 'scheduled' },
    ];
  },
  getPayments: (users: User[]): Payment[] => {
    const member = users.find(u => u.username === '1');
    if (!member) return [];
    return [
      { id: generateUUID(), userId: member.id, amount: 450000, productId: 'p1', productName: '50분 10회 레슨', createdAt: daysFromNow(-60), transactionId: 'TX' + generateUUID(), paymentMethod: 'card' },
    ];
  },
  getLockers: (): Locker[] => {
    const lockers: Locker[] = [];
    // Generate 50 lockers
    for (let i = 1; i <= 50; i++) {
        const section = i <= 25 ? 'A' : 'B';
        const isOccupied = i % 5 === 0; // Simulate some usage
        lockers.push({
            id: `locker_${i}`,
            number: i,
            section: section,
            status: isOccupied ? 'occupied' : 'available',
            userId: isOccupied ? 'user_sparrow' : undefined,
            userName: isOccupied ? '참새' : undefined,
            startDate: isOccupied ? daysFromNow(-30) : undefined,
            endDate: isOccupied ? daysFromNow(60) : undefined,
        });
    }
    return lockers;
  }
};

// Helper functions for localStorage
const _getData = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting data for ${key}:`, error);
    return null;
  }
};

const _setData = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting data for ${key}:`, error);
  }
};

// --- API Initialization ---
const _initData = () => {
    // 이미 데이터가 존재하면 초기화하지 않음 (새로고침 시 데이터 유지)
    if (localStorage.getItem(STORAGE_KEYS.users)) {
      return;
    }

    const users = seedData.getUsers();
    _setData(STORAGE_KEYS.users, users);
    const notices = seedData.getNotices(users);
    _setData(STORAGE_KEYS.notices, notices);
    _setData(STORAGE_KEYS.prices, seedData.getPrices());
    _setData(STORAGE_KEYS.lessons, seedData.getLessons(users));
    _setData(STORAGE_KEYS.reservations, seedData.getReservations(users));
    _setData(STORAGE_KEYS.payments, seedData.getPayments(users));
    _setData(STORAGE_KEYS.lockers, seedData.getLockers());
    _setData(STORAGE_KEYS.notifications, []);
    _setData(STORAGE_KEYS.consultations, []);
};
_initData();

// --- API Functions ---
const DELAY = 100; // Simulate network latency

const _addNotification = (notification: Omit<NotificationItem, 'id' | 'createdAt'>) => {
    const notifications = _getData<NotificationItem[]>(STORAGE_KEYS.notifications) || [];
    const newNotification: NotificationItem = {
        ...notification,
        id: generateUUID(),
        createdAt: nowISO(),
    };
    _setData(STORAGE_KEYS.notifications, [newNotification, ...notifications]);
};

// AUTH
const login = async (username: string, password: string): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY * 2));
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        _setData(STORAGE_KEYS.currentUser, user.id);
        return user;
    }
    return null;
};

const logout = async (): Promise<void> => {
    await new Promise(res => setTimeout(res, DELAY));
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    // 로그아웃 시 자동 로그인 해제
    localStorage.removeItem(STORAGE_KEYS.rememberId);
};

const getCurrentUser = async (): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    const currentUserId = _getData<string>(STORAGE_KEYS.currentUser);
    if (!currentUserId) return null;
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];
    return users.find(u => u.id === currentUserId) || null;
};

// USERS
const getUsers = async (): Promise<User[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<User[]>(STORAGE_KEYS.users) || [];
};

const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'notificationsRead' | 'notificationsDeleted'>, adminId: string, adminPassword: string): Promise<User[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const admin = users.find(u => u.id === adminId && u.role === 'admin');
    if (!admin || admin.password !== adminPassword) {
        throw new Error('관리자 비밀번호가 일치하지 않습니다.');
    }
    const newUser: User = {
        ...userData,
        id: `user_${generateUUID().slice(0, 8)}`,
        createdAt: nowISO(),
        notificationsRead: {},
        notificationsDeleted: {},
        archivedNotificationIds: {},
        daysOff: userData.daysOff || [],
        oneTimeOff: userData.oneTimeOff || [],
        memo: userData.memo || '',
    };
    const updatedUsers = [...users, newUser];
    _setData(STORAGE_KEYS.users, updatedUsers);
    return updatedUsers;
};

const updateUser = async (updatedUser: User, adminId: string, adminPassword: string): Promise<User[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const admin = users.find(u => u.id === adminId && u.role === 'admin');
    if (!admin || admin.password !== adminPassword) {
        throw new Error('관리자 비밀번호가 일치하지 않습니다.');
    }
    const originalUser = users.find(u => u.id === updatedUser.id);
    const userToSave: User = { 
        ...originalUser, 
        ...updatedUser,
        daysOff: updatedUser.daysOff || [],
        oneTimeOff: updatedUser.oneTimeOff || [],
        memo: updatedUser.memo || '',
    };

    users = users.map(u => u.id === updatedUser.id ? userToSave : u);
    _setData(STORAGE_KEYS.users, users);
    return users;
};

const deleteUser = async (userId: string, adminId: string, adminPassword: string): Promise<User[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const admin = users.find(u => u.id === adminId && u.role === 'admin');
    if (!admin || admin.password !== adminPassword) {
        throw new Error('관리자 비밀번호가 일치하지 않습니다.');
    }
    users = users.filter(u => u.id !== userId);
    _setData(STORAGE_KEYS.users, users);
    return users;
};

const changePassword = async (userId: string, currentPassword: string, newPassword: string): Promise<User> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const userIndex = users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
        throw new Error('사용자를 찾을 수 없습니다.');
    }

    const user = users[userIndex];
    if (user.password !== currentPassword) {
        throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }

    const updatedUser = { ...user, password: newPassword };
    users[userIndex] = updatedUser;
    _setData(STORAGE_KEYS.users, users);
    
    return updatedUser;
};

// NOTICES
const getNotices = async (): Promise<Notice[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<Notice[]>(STORAGE_KEYS.notices) || [];
};

const createNotice = async (noticeData: { title: string, body?: string }, authorId: string): Promise<Notice[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    const notices = _getData<Notice[]>(STORAGE_KEYS.notices) || [];
    const newNotice: Notice = {
        ...noticeData,
        id: generateUUID(),
        authorId,
        createdAt: nowISO(),
    };
    const updatedNotices = [newNotice, ...notices];
    _setData(STORAGE_KEYS.notices, updatedNotices);
    
    _addNotification({
        userId: null, // Global notification
        title: '새 공지사항',
        body: newNotice.title,
        type: 'notice',
        refId: newNotice.id,
    });
    return updatedNotices;
};

const updateNotice = async (updatedNotice: Notice): Promise<Notice[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let notices = _getData<Notice[]>(STORAGE_KEYS.notices) || [];
    notices = notices.map(n => n.id === updatedNotice.id ? updatedNotice : n);
    _setData(STORAGE_KEYS.notices, notices);
    return notices;
};

const deleteNotice = async (id: string): Promise<Notice[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let notices = _getData<Notice[]>(STORAGE_KEYS.notices) || [];
    notices = notices.filter(n => n.id !== id);
    _setData(STORAGE_KEYS.notices, notices);
    return notices;
};

// LESSONS
const getLessons = async (): Promise<LessonEntry[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<LessonEntry[]>(STORAGE_KEYS.lessons) || [];
};

const createLesson = async (lessonData: Omit<LessonEntry, 'id' | 'createdAt'>, videoFile?: File | null, imageFile?: File | null): Promise<LessonEntry[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    const lessons = _getData<LessonEntry[]>(STORAGE_KEYS.lessons) || [];
    const newLesson: LessonEntry = {
        ...lessonData,
        id: generateUUID(),
        createdAt: nowISO(),
        videoUrl: videoFile ? URL.createObjectURL(videoFile) : undefined,
        imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
    };
    const updatedLessons = [newLesson, ...lessons];
    _setData(STORAGE_KEYS.lessons, updatedLessons);
    
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const member = users.find(u => u.id === newLesson.memberId);
    if (member) {
        _addNotification({
            userId: member.id,
            title: '새 레슨일지가 등록되었습니다.',
            body: `${newLesson.instructorName} 프로님이 레슨일지를 작성했습니다.`,
            type: 'lesson',
            refId: newLesson.id,
        });
    }
    
    // Notify all admins
    const admins = users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
        _addNotification({
            userId: admin.id,
            title: '새 레슨일지 등록',
            body: `${newLesson.instructorName} 프로가 ${member?.name ?? '회원'}님의 일지를 작성했습니다.`,
            type: 'lesson',
            refId: newLesson.id,
        });
    });

    return updatedLessons;
};

const updateLesson = async (id: string, lessonData: Omit<LessonEntry, 'id' | 'createdAt'>, videoFile?: File | null, removeVideo?: boolean, imageFile?: File | null, removeImage?: boolean): Promise<LessonEntry[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let lessons = _getData<LessonEntry[]>(STORAGE_KEYS.lessons) || [];
    lessons = lessons.map(l => {
        if (l.id === id) {
            let videoUrl = l.videoUrl;
            if (videoFile) videoUrl = URL.createObjectURL(videoFile);
            if (removeVideo) videoUrl = undefined;
            
            let imageUrl = l.imageUrl;
            if (imageFile) imageUrl = URL.createObjectURL(imageFile);
            if (removeImage) imageUrl = undefined;

            return { ...l, ...lessonData, videoUrl, imageUrl };
        }
        return l;
    });
    _setData(STORAGE_KEYS.lessons, lessons);
    return lessons;
};

const deleteLesson = async (id: string): Promise<LessonEntry[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let lessons = _getData<LessonEntry[]>(STORAGE_KEYS.lessons) || [];
    lessons = lessons.filter(l => l.id !== id);
    _setData(STORAGE_KEYS.lessons, lessons);
    return lessons;
};

// PRICES
const getPrices = async (): Promise<PriceItem[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<PriceItem[]>(STORAGE_KEYS.prices) || [];
};

const updatePrices = async (updatedPrices: PriceItem[]): Promise<PriceItem[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    _setData(STORAGE_KEYS.prices, updatedPrices);
    return updatedPrices;
};

// NOTIFICATIONS
const getNotifications = async (): Promise<NotificationItem[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<NotificationItem[]>(STORAGE_KEYS.notifications) || [];
};

const markNotificationAsRead = async (userId: string, notificationId: string): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const updatedUser = {
                ...u,
                notificationsRead: {
                    ...u.notificationsRead,
                    [notificationId]: true,
                },
            };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

const markNotificationsAsReadByIds = async (userId: string, notificationIds: string[]): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const newReadStatus = { ...u.notificationsRead };
            notificationIds.forEach(id => {
                newReadStatus[id] = true;
            });
            const updatedUser = { ...u, notificationsRead: newReadStatus };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

const markNotificationsAsReadByType = async (userId: string, type: 'notice' | 'lesson' | 'payment' | 'reservation'): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    const notifications = _getData<NotificationItem[]>(STORAGE_KEYS.notifications) || [];
    const notificationsToMark = notifications.filter(n => {
        return (type === 'notice' && n.userId === null) || (n.userId === userId && n.type === type);
    });

    if (notificationsToMark.length === 0) {
        const users = _getData<User[]>(STORAGE_KEYS.users) || [];
        return users.find(u => u.id === userId) || null;
    }
    
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const newReadStatus = { ...u.notificationsRead };
            notificationsToMark.forEach(n => {
                newReadStatus[n.id] = true;
            });
            const updatedUser = { ...u, notificationsRead: newReadStatus };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

const markNotificationsAsReadByReservationType = async (userId: string, reservationType: 'lesson' | 'training_room' | 'mental' | 'lesson_room_rental'): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    const notifications = _getData<NotificationItem[]>(STORAGE_KEYS.notifications) || [];
    const reservations = _getData<Reservation[]>(STORAGE_KEYS.reservations) || [];

    const notificationsToMark = notifications.filter(n => {
        if ((n.userId === userId || n.userId === null) && n.type === 'reservation') {
            const correspondingReservation = reservations.find(r => r.id === n.refId);
            return correspondingReservation?.type === reservationType;
        }
        return false;
    });

    if (notificationsToMark.length === 0) {
        const users = _getData<User[]>(STORAGE_KEYS.users) || [];
        return users.find(u => u.id === userId) || null;
    }

    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const newReadStatus = { ...u.notificationsRead };
            notificationsToMark.forEach(n => {
                if (!newReadStatus[n.id]) {
                    newReadStatus[n.id] = true;
                }
            });
            const updatedUser = { ...u, notificationsRead: newReadStatus };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

const deleteNotificationsForUser = async (userId: string, notificationIds: string[]): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const newDeletedStatus = { ...u.notificationsDeleted };
            notificationIds.forEach(id => {
                newDeletedStatus[id] = true;
            });
            const updatedUser = { ...u, notificationsDeleted: newDeletedStatus };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

const archiveNotifications = async (userId: string, notificationIds: string[]): Promise<User | null> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let targetUser: User | null = null;
    users = users.map(u => {
        if (u.id === userId) {
            const newArchivedStatus = { ...(u.archivedNotificationIds || {}) };
            notificationIds.forEach(id => {
                newArchivedStatus[id] = true;
            });
            const updatedUser = { ...u, archivedNotificationIds: newArchivedStatus };
            targetUser = updatedUser;
            return updatedUser;
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, users);
    return targetUser;
};

// PAYMENTS
const getPayments = async (): Promise<Payment[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<Payment[]>(STORAGE_KEYS.payments) || [];
};

const simulatePaymentGateway = async (cardInfo: { cvc: string }, amount: number): Promise<{ success: boolean; message?: string; transactionId?: string }> => {
    await new Promise(res => setTimeout(res, DELAY * 5)); // Simulate longer network delay
    if (cardInfo.cvc === '123') {
        return { success: true, transactionId: 'TX_CARD_' + generateUUID() };
    }
    if (cardInfo.cvc === '999') {
        return { success: false, message: '카드 잔액이 부족합니다.' };
    }
    return { success: false, message: '유효하지 않은 카드 정보입니다.' };
};

const processPaymentAndExtendMembership = async (userId: string, item: PriceItem, amount: number, transactionId: string, paymentMethod: 'card' | 'kakaopay'): Promise<{ updatedUsers: User[], newPayment: Payment }> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const updatedUsers = users.map(u => {
        if (u.id === userId) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const maxEndDate = new Date(today);
            maxEndDate.setDate(maxEndDate.getDate() + 180);

            const currentEndDate = new Date(u.membership.end);
            
            const extensionStartDate = currentEndDate < today ? today : currentEndDate;

            const proposedEndDate = new Date(extensionStartDate);
            proposedEndDate.setDate(proposedEndDate.getDate() + item.durationDays);

            const finalEndDate = proposedEndDate > maxEndDate ? maxEndDate : proposedEndDate;

            const sessionKey = item.sessionMinutes === 30 ? '30' : '50';
            const newSessions = {
                ...u.membership.sessions,
                [sessionKey]: (u.membership.sessions[sessionKey] || 0) + item.count,
                'mental': (u.membership.sessions['mental'] || 0) + (item.mentalCoachingCount || 0),
                'rentals': (u.membership.sessions['rentals'] || 0) + (item.rentalCount || 0)
            };

            return {
                ...u,
                membership: {
                    ...u.membership,
                    end: finalEndDate.toISOString(),
                    sessions: newSessions
                }
            };
        }
        return u;
    });
    _setData(STORAGE_KEYS.users, updatedUsers);

    const payments = _getData<Payment[]>(STORAGE_KEYS.payments) || [];
    const newPayment: Payment = {
        id: generateUUID(),
        userId,
        amount,
        productId: item.id,
        productName: item.name,
        createdAt: nowISO(),
        transactionId,
        paymentMethod,
        pgProvider: paymentMethod === 'kakaopay' ? 'KAKAOPAY' : undefined,
    };
    _setData(STORAGE_KEYS.payments, [newPayment, ...payments]);
    
    // Notification for the user who made the payment
    _addNotification({
        userId: userId,
        title: '결제가 완료되었습니다.',
        body: `${item.name} 상품 구매가 완료되었습니다.`,
        type: 'payment',
        refId: newPayment.id,
    });

    // Notification for all admins
    const admins = updatedUsers.filter(u => u.role === 'admin');
    const member = updatedUsers.find(u => u.id === userId);
    admins.forEach(admin => {
        _addNotification({
            userId: admin.id,
            title: '신규 결제 발생',
            body: `${member?.name}님이 '${item.name}' (${item.sessionMinutes}분/${item.count}회${item.mentalCoachingCount ? ` + 멘탈코칭 ${item.mentalCoachingCount}회` : ''}${item.rentalCount ? ` + 대관 ${item.rentalCount}회` : ''}) 상품을 ${amount.toLocaleString()}원에 구매했습니다.`,
            type: 'payment',
            refId: newPayment.id
        });
    });


    return { updatedUsers, newPayment };
};

// RESERVATIONS
const getReservations = async (): Promise<Reservation[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let reservations = _getData<Reservation[]>(STORAGE_KEYS.reservations) || [];
    const now = new Date();
    let wasUpdated = false;

    reservations = reservations.map(r => {
        const reservationDate = new Date(r.dateTime);
        if (r.status === 'scheduled' && reservationDate < now) {
            wasUpdated = true;
            // 'training_room' auto-attends, 'lesson' and 'mental' become absent.
            const newStatus = r.type === 'training_room' ? 'attended' : 'absent';
            return { ...r, status: newStatus };
        }
        return r;
    });

    if (wasUpdated) {
        _setData(STORAGE_KEYS.reservations, reservations);
    }
    return reservations;
};

const createReservation = async (reservationData: Omit<Reservation, 'id' | 'createdAt' | 'memberName' | 'instructorName' | 'status'>): Promise<{ reservations: Reservation[], users: User[] }> => {
    await new Promise(res => setTimeout(res, DELAY));
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    let reservations = _getData<Reservation[]>(STORAGE_KEYS.reservations) || [];
    const member = users.find(u => u.id === reservationData.memberId);

    if (!member) throw new Error('회원 정보를 찾을 수 없습니다.');

    let updatedUsers = users;
    let instructor: User | undefined;
    let instructorName: string | undefined;
    let notificationTitle: string;
    let memberNotificationBody: string;
    let instructorNotificationBody: string | null = null;
    let adminNotificationBody: string;

    if (reservationData.type === 'lesson') {
        if (!reservationData.instructorId) throw new Error('프로를 선택해주세요.');
        instructor = users.find(u => u.id === reservationData.instructorId);
        if (!instructor) throw new Error('프로 정보를 찾을 수 없습니다.');
        instructorName = instructor.name;

        const sessionKey = reservationData.duration === 30 ? '30' : '50';
        if ((member.membership.sessions[sessionKey] || 0) <= 0) {
            throw new Error(`${reservationData.duration}분 레슨권이 없습니다.`);
        }

        updatedUsers = users.map(u => {
            if (u.id === member.id) {
                return {
                    ...u,
                    membership: { ...u.membership, sessions: { ...u.membership.sessions, [sessionKey]: (u.membership.sessions[sessionKey] || 0) - 1 } }
                };
            }
            return u;
        });
        
        notificationTitle = '레슨 예약 알림';
        const reservationTime = new Date(reservationData.dateTime).toLocaleString('ko-KR');
        memberNotificationBody = `[예약 완료] ${instructorName} 프로님의 ${reservationTime} 레슨이 예약되었습니다.`;
        instructorNotificationBody = `${member.name}님이 프로님과 ${reservationTime} 레슨을 예약했습니다.`;
        adminNotificationBody = `${member.name}님이 ${instructor.name} 프로와 ${reservationTime} 레슨을 예약했습니다.`;

    } else if (reservationData.type === 'mental') {
        if (!reservationData.instructorId) throw new Error('프로를 선택해주세요.');
        instructor = users.find(u => u.id === reservationData.instructorId);
        if (!instructor) throw new Error('프로 정보를 찾을 수 없습니다.');
        instructorName = instructor.name;

        if ((member.membership.sessions['mental'] || 0) <= 0) {
            throw new Error(`멘탈코칭 이용권이 없습니다.`);
        }

        updatedUsers = users.map(u => {
            if (u.id === member.id) {
                return {
                    ...u,
                    membership: { ...u.membership, sessions: { ...u.membership.sessions, 'mental': (u.membership.sessions['mental'] || 0) - 1 } }
                };
            }
            return u;
        });
        
        notificationTitle = '멘탈코칭 예약 알림';
        const reservationTime = new Date(reservationData.dateTime).toLocaleString('ko-KR');
        memberNotificationBody = `[예약 완료] ${instructorName} 프로님의 ${reservationTime} 멘탈코칭이 예약되었습니다.`;
        instructorNotificationBody = `${member.name}님이 프로님과 ${reservationTime} 멘탈코칭을 예약했습니다.`;
        adminNotificationBody = `${member.name}님이 ${instructor.name} 프로와 ${reservationTime} 멘탈코칭을 예약했습니다.`;

    } else if (reservationData.type === 'lesson_room_rental') {
        // Lesson Room Rental Logic - GC Quad Unified
        instructorName = 'GC쿼드'; // Unified name
        
        // Check rental balance
        if ((member.membership.sessions['rentals'] || 0) <= 0) {
            throw new Error('대관권이 없습니다. 상품을 구매해주세요.');
        }

        // Deduct rental session
        updatedUsers = users.map(u => {
            if (u.id === member.id) {
                return {
                    ...u,
                    membership: { 
                        ...u.membership, 
                        sessions: { 
                            ...u.membership.sessions, 
                            'rentals': (u.membership.sessions['rentals'] || 0) - 1 
                        } 
                    }
                };
            }
            return u;
        });
        
        notificationTitle = 'GC쿼드 대관 예약 알림';
        const reservationTime = new Date(reservationData.dateTime).toLocaleString('ko-KR');
        memberNotificationBody = `[예약 완료] ${reservationTime} GC쿼드 대관(60분)이 예약되었습니다. (대관권 1회 차감)`;
        instructorNotificationBody = null; // No specific instructor to notify
        adminNotificationBody = `${member.name}님이 ${reservationTime} GC쿼드 대관을 예약했습니다.`;

    } else if (reservationData.type === 'training_room') {
        const reqDate = new Date(reservationData.dateTime);
        const reqDateString = reqDate.toDateString();
        const hasExistingBooking = reservations.some(r => r.memberId === reservationData.memberId && r.type === 'training_room' && new Date(r.dateTime).toDateString() === reqDateString);
        if (hasExistingBooking) throw new Error('수련의 방은 하루에 한 번만 예약할 수 있습니다.');
        
        instructorName = '수련의 방';
        
        notificationTitle = '시설 예약 알림';
        const reservationTime = new Date(reservationData.dateTime).toLocaleString('ko-KR');
        memberNotificationBody = `[예약 완료] ${reservationTime} 수련의 방 예약이 완료되었습니다.`;
        adminNotificationBody = `${member.name}님이 ${reservationTime} 수련의 방 예약을 완료했습니다.`;

    } else {
        throw new Error('알 수 없는 예약 종류입니다.');
    }

    const newReservation: Reservation = {
        ...reservationData,
        id: generateUUID(),
        memberName: member.name,
        instructorName,
        createdAt: nowISO(),
        status: 'scheduled',
    };

    reservations.push(newReservation);
    _setData(STORAGE_KEYS.reservations, reservations);
    _setData(STORAGE_KEYS.users, updatedUsers);
    
    // Notifications
    _addNotification({ userId: member.id, title: notificationTitle, body: memberNotificationBody, type: 'reservation', refId: newReservation.id });
    if (instructor && instructorNotificationBody) {
        _addNotification({ userId: instructor.id, title: '새로운 예약', body: instructorNotificationBody, type: 'reservation', refId: newReservation.id });
    }
    const admins = users.filter(u => u.role === 'admin');
    admins.forEach(admin => {
        if (!instructor || admin.id !== instructor.id) {
            _addNotification({ userId: admin.id, title: '새로운 예약 완료', body: adminNotificationBody, type: 'reservation', refId: newReservation.id });
        }
    });

    return { reservations, users: updatedUsers };
};

const deleteReservation = async (id: string, cancellerId: string, adminPassword?: string): Promise<{ reservations: Reservation[], users: User[] }> => {
    await new Promise(res => setTimeout(res, DELAY));
    let reservations = _getData<Reservation[]>(STORAGE_KEYS.reservations) || [];
    let users = _getData<User[]>(STORAGE_KEYS.users) || [];
    
    const reservationToDelete = reservations.find(r => r.id === id);
    if (!reservationToDelete) throw new Error('예약을 찾을 수 없습니다.');

    const canceller = users.find(u => u.id === cancellerId);
    if (!canceller) throw new Error('사용자 정보를 찾을 수 없습니다.');
    
    if (canceller.role === 'admin' && (reservationToDelete.status === 'attended' || reservationToDelete.status === 'absent')) {
        const updatedReservations = reservations.map(r => 
            r.id === id ? { ...r, isHidden: true } : r
        );
        _setData(STORAGE_KEYS.reservations, updatedReservations);
        
        const member = users.find(u => u.id === reservationToDelete.memberId);
        const reservationTime = new Date(reservationToDelete.dateTime).toLocaleString('ko-KR');
        _addNotification({
            userId: canceller.id,
            title: '지난 예약 삭제',
            body: `${member?.name ?? '회원'}님의 ${reservationTime} 지난 예약을 삭제 처리했습니다.`,
            type: 'reservation',
            refId: reservationToDelete.id,
        });

        return { reservations: updatedReservations, users };
    }

    if (canceller.role === 'admin' && (reservationToDelete.type === 'lesson' || reservationToDelete.type === 'mental' || reservationToDelete.type === 'lesson_room_rental')) {
        if (!adminPassword || canceller.password !== adminPassword) {
            throw new Error('관리자 비밀번호가 일치하지 않습니다.');
        }
    }
    
    if (canceller.role !== 'admin' && reservationToDelete.status !== 'scheduled') {
        throw new Error('출석/결석 처리된 예약은 취소할 수 없습니다. 관리자에게 문의하세요.');
    }

    reservations = reservations.filter(r => r.id !== id);
    _setData(STORAGE_KEYS.reservations, reservations);
    
    let updatedUsers = users;
    if (reservationToDelete.status === 'scheduled') {
        if (reservationToDelete.type === 'lesson') {
            updatedUsers = users.map(u => {
                if (u.id === reservationToDelete.memberId) {
                    const sessionKey = reservationToDelete.duration === 30 ? '30' : '50';
                    return {
                        ...u,
                        membership: {
                            ...u.membership,
                            sessions: {
                                ...u.membership.sessions,
                                [sessionKey]: (u.membership.sessions[sessionKey] || 0) + 1,
                            }
                        }
                    };
                }
                return u;
            });
        } else if (reservationToDelete.type === 'mental') {
             updatedUsers = users.map(u => {
                if (u.id === reservationToDelete.memberId) {
                    return {
                        ...u,
                        membership: {
                            ...u.membership,
                            sessions: {
                                ...u.membership.sessions,
                                'mental': (u.membership.sessions['mental'] || 0) + 1,
                            }
                        }
                    };
                }
                return u;
            });
        } else if (reservationToDelete.type === 'lesson_room_rental') {
            // Refund rental ticket
            updatedUsers = users.map(u => {
                if (u.id === reservationToDelete.memberId) {
                    return {
                        ...u,
                        membership: {
                            ...u.membership,
                            sessions: {
                                ...u.membership.sessions,
                                'rentals': (u.membership.sessions['rentals'] || 0) + 1,
                            }
                        }
                    };
                }
                return u;
            });
        }
        
        _setData(STORAGE_KEYS.users, updatedUsers);
    }

    const member = users.find(u => u.id === reservationToDelete.memberId);
    const instructor = users.find(u => u.id === reservationToDelete.instructorId);
    const reservationTime = new Date(reservationToDelete.dateTime).toLocaleString('ko-KR');
    const isPastLesson = new Date(reservationToDelete.dateTime) < new Date();
    
    let facilityName = '수련의 방';
    if (reservationToDelete.type === 'lesson') facilityName = `${reservationToDelete.instructorName} 프로 레슨`;
    if (reservationToDelete.type === 'mental') facilityName = `${reservationToDelete.instructorName} 프로 멘탈코칭`;
    if (reservationToDelete.type === 'lesson_room_rental') facilityName = 'GC쿼드 대관';

    // Notify member and/or instructor
    if (canceller.role === 'member') {
        if (member) {
            const refundMsg = reservationToDelete.type === 'lesson_room_rental' ? '(대관권 환불)' : '';
            _addNotification({ userId: member.id, title: '예약 취소 알림', body: `[예약 취소] ${reservationTime} ${facilityName} 예약이 취소되었습니다. ${refundMsg}`, type: 'reservation', refId: reservationToDelete.id });
        }
        if (instructor) {
            _addNotification({ userId: instructor.id, title: '예약 취소됨', body: `${member?.name ?? '회원'}님의 ${reservationTime} 예약을 취소했습니다.`, type: 'reservation', refId: reservationToDelete.id });
        }
    } else { // Canceller is admin or instructor
        if (member && !isPastLesson) {
             const refundMsg = reservationToDelete.type === 'lesson_room_rental' ? '(대관권 환불)' : '';
             _addNotification({ userId: member.id, title: '예약 취소 알림', body: `[예약 취소] ${canceller.name} 프로/관리자에 의해 ${reservationTime} ${facilityName} 예약이 취소되었습니다. ${refundMsg}`, type: 'reservation', refId: reservationToDelete.id });
        }
    }

    // Notify ALL admins of the cancellation
    const admins = users.filter(u => u.role === 'admin');
    const adminNotificationBody = `${canceller.name}님이 ${member?.name ?? '회원'}님의 ${reservationTime} ${facilityName} 예약을 취소했습니다.`;
    const isFacility = reservationToDelete.type === 'training_room';
    const adminNotificationTitle = isFacility ? '시설 예약 취소됨' : '예약 취소됨';
    const adminNotificationType = 'reservation';
    
    admins.forEach(admin => {
        _addNotification({
            userId: admin.id,
            title: adminNotificationTitle,
            body: adminNotificationBody,
            type: adminNotificationType,
            refId: reservationToDelete.id,
        });
    });

    return { reservations, users: updatedUsers };
};

const updateReservationStatus = async (reservationId: string, status: 'attended' | 'absent', actorId: string): Promise<Reservation[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let reservations = _getData<Reservation[]>(STORAGE_KEYS.reservations) || [];
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];

    const reservationToUpdate = reservations.find(r => r.id === reservationId);
    if (!reservationToUpdate) throw new Error('예약을 찾을 수 없습니다.');
    
    const reservationDay = new Date(reservationToUpdate.dateTime);
    reservationDay.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reservationDay > today) {
        throw new Error('미래의 예약은 출석/결석 처리할 수 없습니다.');
    }

    reservations = reservations.map(r => 
        r.id === reservationId ? { ...r, status } : r
    );
    _setData(STORAGE_KEYS.reservations, reservations);
    
    const member = users.find(u => u.id === reservationToUpdate.memberId);
    const statusText = status === 'attended' ? '출석' : '결석';
    const reservationTime = new Date(reservationToUpdate.dateTime).toLocaleString('ko-KR');
    
    let facilityName = '수련의 방';
    if (reservationToUpdate.type === 'lesson') facilityName = '레슨';
    if (reservationToUpdate.type === 'mental') facilityName = '멘탈코칭';
    if (reservationToUpdate.type === 'lesson_room_rental') facilityName = 'GC쿼드 대관';

    if(member) {
        _addNotification({
            userId: member.id,
            title: '예약 상태 변경 알림',
            body: `[상태 변경] ${reservationTime} ${facilityName} 예약이 ${statusText}으로 처리되었습니다.`,
            type: 'reservation',
            refId: reservationToUpdate.id,
        });
    }

    // If a LESSON/MENTAL/RENTAL status is changed, notify all admins.
    if (reservationToUpdate.type === 'lesson' || reservationToUpdate.type === 'mental' || reservationToUpdate.type === 'lesson_room_rental') {
        const admins = users.filter(u => u.role === 'admin');
        admins.forEach(admin => {
            _addNotification({
                userId: admin.id,
                title: `${facilityName} ${statusText} 처리`,
                body: `${member?.name ?? '회원'}님의 ${facilityName}이 ${statusText} 처리 되었습니다.`,
                type: 'reservation',
                refId: reservationToUpdate.id,
            });
        });
    }

    return reservations;
};

// --- LOCKER API ---
const getLockers = async (): Promise<Locker[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<Locker[]>(STORAGE_KEYS.lockers) || [];
};

const assignLocker = async (lockerId: string, userId: string, startDate: string, endDate: string): Promise<Locker[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let lockers = _getData<Locker[]>(STORAGE_KEYS.lockers) || [];
    const users = _getData<User[]>(STORAGE_KEYS.users) || [];
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('회원을 찾을 수 없습니다.');

    lockers = lockers.map(locker => {
        if (locker.id === lockerId) {
            return {
                ...locker,
                status: 'occupied',
                userId: user.id,
                userName: user.name,
                startDate: startDate,
                endDate: endDate,
            };
        }
        return locker;
    });
    _setData(STORAGE_KEYS.lockers, lockers);
    return lockers;
};

const releaseLocker = async (lockerId: string): Promise<Locker[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let lockers = _getData<Locker[]>(STORAGE_KEYS.lockers) || [];
    lockers = lockers.map(locker => {
        if (locker.id === lockerId) {
            return {
                ...locker,
                status: 'available',
                userId: undefined,
                userName: undefined,
                startDate: undefined,
                endDate: undefined,
            };
        }
        return locker;
    });
    _setData(STORAGE_KEYS.lockers, lockers);
    return lockers;
};

// --- CRM / CONSULTATIONS API ---
const getConsultations = async (): Promise<ConsultationLog[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    return _getData<ConsultationLog[]>(STORAGE_KEYS.consultations) || [];
};

const createConsultationImpl = async (data: { 
    memberId?: string, 
    memberName?: string, // Explicitly allowed for non-members
    clientPhone?: string,
    adminId: string, 
    content: string, 
    type: 'inquiry' | 'complaint' | 'sales' | 'general' 
}): Promise<ConsultationLog[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let logs = _getData<ConsultationLog[]>(STORAGE_KEYS.consultations) || [];
    
    let finalMemberName = data.memberName || '비회원';

    if (data.memberId) {
        const users = _getData<User[]>(STORAGE_KEYS.users) || [];
        const member = users.find(u => u.id === data.memberId);
        if (member) {
            finalMemberName = member.name;
        }
    }

    const newLog: ConsultationLog = {
        id: generateUUID(),
        memberId: data.memberId, // Can be undefined
        memberName: finalMemberName,
        clientPhone: data.clientPhone,
        adminId: data.adminId,
        content: data.content,
        type: data.type,
        createdAt: nowISO(),
    };
    logs = [newLog, ...logs];
    _setData(STORAGE_KEYS.consultations, logs);
    return logs;
};


const deleteConsultation = async (id: string): Promise<ConsultationLog[]> => {
    await new Promise(res => setTimeout(res, DELAY));
    let logs = _getData<ConsultationLog[]>(STORAGE_KEYS.consultations) || [];
    logs = logs.filter(log => log.id !== id);
    _setData(STORAGE_KEYS.consultations, logs);
    return logs;
};

export const api = {
    login,
    logout,
    getCurrentUser,
    getUsers,
    createUser,
    updateUser,
    deleteUser,
    changePassword,
    getNotices,
    createNotice,
    updateNotice,
    deleteNotice,
    getLessons,
    createLesson,
    updateLesson,
    deleteLesson,
    getPrices,
    updatePrices,
    getNotifications,
    markNotificationAsRead,
    markNotificationsAsReadByIds,
    markNotificationsAsReadByType,
    markNotificationsAsReadByReservationType,
    deleteNotificationsForUser,
    archiveNotifications,
    getPayments,
    simulatePaymentGateway,
    processPaymentAndExtendMembership,
    getReservations,
    createReservation,
    deleteReservation,
    updateReservationStatus,
    getLockers,
    assignLocker,
    releaseLocker,
    getConsultations,
    createConsultation: createConsultationImpl, // Use the improved implementation
    deleteConsultation,
};
