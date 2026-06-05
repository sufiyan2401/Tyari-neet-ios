import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'taiyari_progress_v1';

type ProgressData = {
  /** completed topic IDs */
  completedTopics: string[];
  /** chapterId -> total topic count seen */
  chapterTotals: Record<string, number>;
  /** topicId -> topic name */
  topicNames: Record<string, string>;
};

const initialData: ProgressData = { completedTopics: [], chapterTotals: {}, topicNames: {} };

let cache: ProgressData | null = null;
const listeners = new Set<(data: ProgressData) => void>();

const loadFromStorage = async (): Promise<ProgressData> => {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : initialData;
    cache = {
      completedTopics: Array.isArray(parsed.completedTopics) ? parsed.completedTopics : [],
      chapterTotals:
        parsed.chapterTotals && typeof parsed.chapterTotals === 'object'
          ? parsed.chapterTotals
          : {},
      topicNames:
        parsed.topicNames && typeof parsed.topicNames === 'object'
          ? parsed.topicNames
          : {},
    };
  } catch {
    cache = initialData;
  }
  return cache!;
};

const saveToStorage = async (data: ProgressData) => {
  cache = data;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
  listeners.forEach((fn) => fn(data));
};

export const useProgress = () => {
  const [data, setData] = useState<ProgressData>(cache || initialData);

  useEffect(() => {
    let mounted = true;
    loadFromStorage().then((d) => {
      if (mounted) setData(d);
    });
    const onChange = (d: ProgressData) => {
      if (mounted) setData(d);
    };
    listeners.add(onChange);
    return () => {
      mounted = false;
      listeners.delete(onChange);
    };
  }, []);

  const markCompleted = useCallback(async (topicId: string, topicName?: string) => {
    const current = await loadFromStorage();
    if (current.completedTopics.includes(topicId)) return;
    const updated: ProgressData = {
      ...current,
      completedTopics: [...current.completedTopics, topicId],
      topicNames: topicName
        ? { ...current.topicNames, [topicId]: topicName }
        : current.topicNames,
    };
    await saveToStorage(updated);
  }, []);

  const setChapterTopics = useCallback(
    async (chapterId: string, topicIds: string[]) => {
      const current = await loadFromStorage();
      const total = topicIds.length;
      if (current.chapterTotals[chapterId] === total) return;
      const updated: ProgressData = {
        ...current,
        chapterTotals: { ...current.chapterTotals, [chapterId]: total },
      };
      await saveToStorage(updated);
    },
    []
  );

  const isCompleted = useCallback(
    (topicId: string) => data.completedTopics.includes(topicId),
    [data]
  );

  const getCompletedCount = useCallback(
    (topicIds: string[]) => topicIds.filter((id) => data.completedTopics.includes(id)).length,
    [data]
  );

  /** Returns chapter total saved earlier (when user visited Topics screen). 0 if never visited. */
  const getChapterTotal = useCallback(
    (chapterId: string) => data.chapterTotals[chapterId] || 0,
    [data]
  );

  return {
    completedTopics: data.completedTopics,
    topicNames: data.topicNames,
    markCompleted,
    isCompleted,
    getCompletedCount,
    setChapterTopics,
    getChapterTotal,
  };
};
