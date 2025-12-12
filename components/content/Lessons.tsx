import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import type { LessonEntry, NotificationItem, User } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { useToast } from '../../contexts/ToastContext';
import { useConfirmation } from '../../contexts/ConfirmationContext';
import { api } from '../../services/api';
import { ChevronDown } from 'lucide-react';


interface LessonsProps {
  lessons: LessonEntry[];
  setLessons: React.Dispatch<React.SetStateAction<LessonEntry[]>>;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationItem[]>>;
  memberIdForNewJournal?: string | null;
  onJournalCreated?: () => void;
  notifications: NotificationItem[];
  currentUser: User | null;
  updateCurrentUser: (user: User) => void;
}

const Lessons: React.FC<LessonsProps> = ({ lessons, setLessons, setNotifications, memberIdForNewJournal, onJournalCreated, notifications, currentUser, updateCurrentUser }) => {
  const { users } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirmation();

  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<LessonEntry | null>(null);
  const [memberId, setMemberId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [content, setContent] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [removeVideo, setRemoveVideo] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const isAdmin = currentUser?.role === 'admin';
  const isInstructor = currentUser?.role === 'instructor';
  const canCreate = isAdmin || isInstructor;

  const toggleExpand = async (lessonId: string) => {
    setExpandedLessons(prev => {
        const newSet = new Set(prev);
        if (newSet.has(lessonId)) {
            newSet.delete(lessonId);
        } else {
            newSet.add(lessonId);
        }
        return newSet;
    });

    if (!currentUser) return;
    const notification = notifications.find(n => 
        n.refId === lessonId && 
        n.type === 'lesson' &&
        n.userId === currentUser.id
    );

    if (notification && !currentUser.notificationsRead?.[notification.id]) {
        try {
            const updatedUser = await api.markNotificationAsRead(currentUser.id, notification.id);
            if (updatedUser) {
                updateCurrentUser(updatedUser);
            }
        } catch (error) {
            console.error("Failed to mark lesson notification as read:", (error as Error).message);
        }
    }
  };
  
  const members = users.filter(u => u.role === 'member');
  const instructors = users.filter(u => u.role === 'instructor' || u.role === 'admin');


  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoPreviewUrl(url);
      // Cleanup function to prevent memory leaks
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoPreviewUrl(null);
    }
  }, [videoFile]);
  
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreviewUrl(null);
    }
  }, [imageFile]);

  const handleShowForm = useCallback((lesson: LessonEntry | null = null, preselectedMemberId: string | null = null) => {
    if (lesson) {
      setEditingLesson(lesson);
      setMemberId(lesson.memberId);
      setInstructorId(lesson.instructorId);
      setContent(lesson.content);
    } else {
      setEditingLesson(null);
      setMemberId(preselectedMemberId || (members.length > 0 ? members[0].id : ''));
      setContent('');
      if (isInstructor && currentUser) {
          setInstructorId(currentUser.id);
      } else if (isAdmin) {
          setInstructorId(instructors.length > 0 ? instructors[0].id : '');
      }
    }
    setVideoFile(null);
    setRemoveVideo(false);
    setVideoPreviewUrl(null);
    setImageFile(null);
    setRemoveImage(false);
    setImagePreviewUrl(null);
    setShowForm(true);
  }, [currentUser, users, isInstructor, isAdmin]);
  
  useEffect(() => {
    if (memberIdForNewJournal) {
        handleShowForm(null, memberIdForNewJournal);
        onJournalCreated?.();
    }
  }, [memberIdForNewJournal, handleShowForm, onJournalCreated]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingLesson(null);
    setVideoFile(null);
    setRemoveVideo(false);
    setVideoPreviewUrl(null);
    setImageFile(null);
    setRemoveImage(false);
    setImagePreviewUrl(null);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        showToast('오류', '영상 파일은 50MB를 초과할 수 없습니다.', 'error');
        e.target.value = ''; // Reset file input
        return;
      }
      setVideoFile(file);
      setRemoveVideo(false); // A new file overrides the remove flag
    }
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('오류', '이미지 파일은 10MB를 초과할 수 없습니다.', 'error');
        e.target.value = ''; // Reset file input
        return;
      }
      setImageFile(file);
      setRemoveImage(false);
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    setRemoveVideo(true);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId || !content || !instructorId) return;
    setIsLoading(true);

    const instructorName = users.find(u => u.id === instructorId)?.name || '담당 프로';

    try {
      if (editingLesson) {
        const newLessons = await api.updateLesson(editingLesson.id, { memberId, content, instructorId, instructorName }, videoFile, removeVideo, imageFile, removeImage);
        setLessons(newLessons);
        showToast('성공', '레슨일지가 수정되었습니다.', 'success');
      } else {
        const newLessons = await api.createLesson({ memberId, content, instructorId, instructorName }, videoFile, imageFile);
        setLessons(newLessons);
        const newNotifications = await api.getNotifications();
        setNotifications(newNotifications);
        const memberName = users.find(u => u.id === memberId)?.name || '회원';
        showToast('성공', `${memberName}님의 새 레슨일지가 등록되었습니다.`, 'success');
      }
      handleCloseForm();
    } catch (error) {
      console.error('Lesson submission error:', (error as Error).message);
      const errorMessage = error instanceof Error ? error.message : '일지 저장 중 알 수 없는 오류가 발생했습니다.';
      showToast('오류', errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm('정말로 이 레슨일지를 삭제하시겠습니까?');
    if (isConfirmed) {
      setIsLoading(true);
      try {
        const newLessons = await api.deleteLesson(id);
        setLessons(newLessons);
        showToast('성공', '레슨일지가 삭제되었습니다.', 'success');
      } catch (error) {
        showToast('오류', '삭제 중 오류가 발생했습니다.', 'error');
        console.error("Lesson deletion failed:", (error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const userLessons = (() => {
    if (isAdmin) return lessons;
    if (isInstructor) return lessons.filter(l => l.instructorId === currentUser?.id);
    return lessons.filter(l => l.memberId === currentUser?.id);
  })();
    
  const sortedLessons = [...userLessons].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getMemberName = (id: string) => users.find(u => u.id === id)?.name || '알 수 없음';
  
  return (
    <Card>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">레슨일지</h2>
        {canCreate && !showForm && (
          <Button onClick={() => handleShowForm()}>일지 작성</Button>
        )}
      </div>
      
      <AnimatePresence>
        {showForm && canCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit} className="mb-8 p-4 bg-slate-800/50 rounded-lg"
          >
            <h3 className="text-lg font-bold mb-4 text-white">{editingLesson ? '일지 수정' : '새 일지 작성'}</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">회원</label>
              <Select value={memberId} onChange={e => setMemberId(e.target.value)} required>
                {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.username})</option>)}
              </Select>
            </div>
            {isAdmin && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">담당 프로</label>
                <Select value={instructorId} onChange={e => setInstructorId(e.target.value)} required>
                  {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </Select>
              </div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">레슨 내용</label>
              <Textarea placeholder="레슨 내용을 입력하세요..." value={content} onChange={e => setContent(e.target.value)} rows={5} required />
            </div>
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">레슨 영상 (최대 50MB)</label>
                <Input type="file" accept="video/*" onChange={handleVideoChange} />
                
                {videoPreviewUrl ? (
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg">
                        <p className="text-xs text-slate-400 mb-2">새 영상 미리보기:</p>
                        <video src={videoPreviewUrl} controls className="w-full max-w-xs mx-auto rounded" playsInline />
                        <Button type="button" variant="destructive" size="sm" onClick={() => setVideoFile(null)} className="mt-2 w-full">
                            업로드 취소
                        </Button>
                    </div>
                ) : editingLesson?.videoUrl && !removeVideo && (
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg">
                        <p className="text-xs text-slate-400 mb-2">현재 영상:</p>
                        <video src={editingLesson.videoUrl} controls className="w-full max-w-xs mx-auto rounded" playsInline />
                        <Button type="button" variant="destructive" size="sm" onClick={handleRemoveVideo} className="mt-2 w-full">
                            영상 삭제
                        </Button>
                    </div>
                )}
            </div>
            <div className="mt-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">레슨 사진 (최대 10MB)</label>
                <Input type="file" accept="image/*" onChange={handleImageChange} />
                
                {imagePreviewUrl ? (
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg">
                        <p className="text-xs text-slate-400 mb-2">새 사진 미리보기:</p>
                        <img src={imagePreviewUrl} alt="Preview" className="w-full max-w-xs mx-auto rounded" />
                        <Button type="button" variant="destructive" size="sm" onClick={() => setImageFile(null)} className="mt-2 w-full">
                            업로드 취소
                        </Button>
                    </div>
                ) : editingLesson?.imageUrl && !removeImage && (
                    <div className="mt-2 p-2 bg-slate-900 rounded-lg">
                        <p className="text-xs text-slate-400 mb-2">현재 사진:</p>
                        <img src={editingLesson.imageUrl} alt="Current lesson" className="w-full max-w-xs mx-auto rounded" />
                        <Button type="button" variant="destructive" size="sm" onClick={handleRemoveImage} className="mt-2 w-full">
                            사진 삭제
                        </Button>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" onClick={handleCloseForm} variant="secondary">취소</Button>
              <Button type="submit" isLoading={isLoading}>
                {editingLesson ? '수정' : '저장'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div>
        {sortedLessons.length === 0 ? (
          <p className="text-slate-400 text-center py-4">
            {canCreate ? '작성된 레슨일지가 없습니다.' : '아직 회원님의 레슨일지가 없습니다.'}
          </p>
        ) : (
          <motion.ul layout className="space-y-4">
            {sortedLessons.map(lesson => {
              const isExpanded = expandedLessons.has(lesson.id);
              const isNew = notifications.some(n => 
                n.refId === lesson.id &&
                n.type === 'lesson' &&
                n.userId === currentUser?.id &&
                !currentUser?.notificationsRead?.[n.id]
              );

              return (
                <motion.li 
                  key={lesson.id} 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-slate-800 rounded-lg p-4"
                >
                  <button
                    onClick={() => toggleExpand(lesson.id)}
                    className="w-full flex justify-between items-start text-left"
                    aria-expanded={isExpanded}
                  >
                      <div>
                        {(isAdmin || isInstructor) && (
                            <p className="text-sm font-bold text-yellow-400 flex items-center gap-2">
                                {getMemberName(lesson.memberId)} 회원님
                                {isNew && <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">NEW</span>}
                            </p>
                        )}
                        <p className="text-sm text-slate-300 mt-0.5">{lesson.instructorName} 프로</p>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            {new Date(lesson.createdAt).toLocaleString()}
                            {!(isAdmin || isInstructor) && isNew && <span className="text-xs bg-red-500 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">NEW</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {canCreate && (
                          <div className="flex gap-3 text-sm z-10" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleShowForm(lesson)} className="text-yellow-400 hover:underline">수정</button>
                            <button onClick={() => handleDelete(lesson.id)} className="text-red-500 hover:underline">삭제</button>
                          </div>
                        )}
                        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
                          <ChevronDown size={20} className="text-slate-400" />
                        </motion.div>
                      </div>
                  </button>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                          <p className="text-slate-300 whitespace-pre-wrap text-sm">{lesson.content}</p>

                          {lesson.imageUrl && (
                              <div className="mt-4">
                                  <img
                                    src={lesson.imageUrl}
                                    alt="레슨 사진"
                                    className="w-full max-w-md mx-auto rounded-lg"
                                  />
                              </div>
                          )}
                          {lesson.videoUrl && (
                              <div className="mt-4">
                                  <video
                                    src={lesson.videoUrl}
                                    controls
                                    className="w-full max-w-md mx-auto rounded-lg"
                                    playsInline
                                  >
                                    이 브라우저에서는 비디오 태그를 지원하지 않습니다. 
                                    <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer">여기서 영상을 확인하세요</a>
                                  </video>
                              </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </div>
    </Card>
  );
};

export default Lessons;