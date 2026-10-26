import { CalendarEvent } from './types';

export interface PersonalTask {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  due_date: string; // YYYY-MM-DD
  due_time?: string;
  description?: string;
  priority: 'high' | 'normal' | 'low';
  is_completed: boolean;
  created_at: string;
}

const STORAGE_PREFIX = 'smr2_personal_tasks_';

/**
 * Get all personal tasks for a given user ID from localStorage.
 */
export function getPersonalTasks(userId: string): PersonalTask[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => {
      // Pending first, then by date
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      return (a.due_date || '').localeCompare(b.due_date || '');
    });
  } catch (err) {
    console.warn('Error reading personal tasks from localStorage:', err);
    return [];
  }
}

/**
 * Save or create a personal task for a given user ID.
 */
export function savePersonalTask(
  userId: string,
  taskData: {
    id?: string;
    title: string;
    subject?: string;
    due_date: string;
    due_time?: string;
    description?: string;
    priority?: 'high' | 'normal' | 'low';
  }
): PersonalTask {
  if (typeof window === 'undefined' || !userId) {
    throw new Error('No user session available');
  }

  const existing = getPersonalTasks(userId);
  const taskId = taskData.id || `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const existingIdx = existing.findIndex((t) => t.id === taskId);

  const newTask: PersonalTask = {
    id: taskId,
    user_id: userId,
    title: taskData.title.trim(),
    subject: taskData.subject || 'General',
    due_date: taskData.due_date,
    due_time: taskData.due_time || '',
    description: taskData.description?.trim() || '',
    priority: taskData.priority || 'normal',
    is_completed: existingIdx >= 0 ? existing[existingIdx].is_completed : false,
    created_at: existingIdx >= 0 ? existing[existingIdx].created_at : new Date().toISOString(),
  };

  let updated: PersonalTask[];
  if (existingIdx >= 0) {
    updated = [...existing];
    updated[existingIdx] = newTask;
  } else {
    updated = [newTask, ...existing];
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('smr2_personal_tasks_updated', { detail: { userId } }));
  } catch (err) {
    console.error('Error saving personal task:', err);
  }

  return newTask;
}

/**
 * Toggle the completion status of a personal task.
 */
export function togglePersonalTask(userId: string, taskId: string): PersonalTask[] {
  if (typeof window === 'undefined' || !userId) return [];
  const existing = getPersonalTasks(userId);
  const updated = existing.map((t) => {
    if (t.id === taskId) {
      return { ...t, is_completed: !t.is_completed };
    }
    return t;
  });

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('smr2_personal_tasks_updated', { detail: { userId } }));
  } catch (err) {
    console.error('Error toggling personal task:', err);
  }

  return updated;
}

/**
 * Delete a personal task.
 */
export function deletePersonalTask(userId: string, taskId: string): PersonalTask[] {
  if (typeof window === 'undefined' || !userId) return [];
  const existing = getPersonalTasks(userId);
  const updated = existing.filter((t) => t.id !== taskId);

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('smr2_personal_tasks_updated', { detail: { userId } }));
  } catch (err) {
    console.error('Error deleting personal task:', err);
  }

  return updated;
}

/**
 * Get summary stats for a user's personal tasks.
 */
export function getPersonalTasksStats(userId: string) {
  const tasks = getPersonalTasks(userId);
  const total = tasks.length;
  const completed = tasks.filter((t) => t.is_completed).length;
  const pending = total - completed;

  const todayStr = new Date().toISOString().split('T')[0];
  const dueToday = tasks.filter((t) => !t.is_completed && t.due_date === todayStr).length;

  return { total, completed, pending, dueToday };
}
