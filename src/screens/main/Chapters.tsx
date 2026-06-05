import {
  getGuestChaptersWithFreeTopics,
  getGuestClassesForSubjectWithFreeTopics,
} from '@/constants/guestData';
import { useAuth } from '@/contexts/AuthContext';
import { useGetChaptersBySubjectId } from '@/hooks/api/chapters';
import { useGetAllClasses } from '@/hooks/api/classes';
import { useProgress } from '@/hooks/useProgress';
import { TChapter } from '@/types/Chapter';
import { TClass } from '@/types/Class';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChaptersScreenProps = {
  navigation: any;
  route: {
    params?: {
      subjectId?: string;
      subjectTitle?: string;
      classId?: string;
      featureName?: string;
      freeOnly?: boolean;
    };
  };
};

const FILTERS = ['All', 'In Progress', 'Not Started', 'Completed'] as const;
type Filter = (typeof FILTERS)[number];

export const Chapters = ({ navigation, route }: ChaptersScreenProps) => {
  const { isGuest } = useAuth();
  const subjectId = route?.params?.subjectId;
  const subjectTitle = route?.params?.subjectTitle;
  const initialClassId = route?.params?.classId;
  const featureName = route?.params?.featureName;
  const freeOnly = route?.params?.freeOnly ?? false;

  if (!subjectId || !subjectTitle) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>Invalid subject data. Please try again.</Text>
      </SafeAreaView>
    );
  }

  const [filter, setFilter] = useState<Filter>('All');

  const { data: classes } = useGetAllClasses({ enabled: !isGuest });
  const guestClasses = getGuestClassesForSubjectWithFreeTopics(subjectId);

  const allClasses: TClass[] = isGuest ? guestClasses : classes?.data || [];
  const selectedClassId = initialClassId || allClasses[0]?.id || '';
  const selectedClass = allClasses.find((c) => c.id === selectedClassId);

  const {
    data: chapters,
    isLoading: chaptersLoading,
    error: chaptersError,
  } = useGetChaptersBySubjectId(
    { subjectId, classId: selectedClassId },
    { enabled: !isGuest && Boolean(subjectId && selectedClassId) }
  );

  const chaptersToRender: TChapter[] = isGuest
    ? getGuestChaptersWithFreeTopics(subjectId, selectedClassId)
    : chapters?.data || [];

  const { completedTopics, getChapterTotal } = useProgress();

  const getChapterProgress = (ch: TChapter) => {
    const total = getChapterTotal(ch.id) || (ch as any).Topic?.length || 0;
    if (total === 0) return { done: 0, total: 0, pct: 0 };
    const topics = (ch as any).Topic || [];
    const done = topics.filter((t: any) => completedTopics.includes(t.id)).length;
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  const filteredChapters = useMemo(() => {
    if (filter === 'All') return chaptersToRender;
    return chaptersToRender.filter((ch) => {
      const { pct, total } = getChapterProgress(ch);
      if (filter === 'Completed') return total > 0 && pct >= 100;
      if (filter === 'In Progress') return pct > 0 && pct < 100;
      if (filter === 'Not Started') return pct === 0;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaptersToRender, filter, completedTopics]);

  const handleBack = () => navigation.goBack();

  const handleChapterPress = (chapter: TChapter) => {
    navigation.navigate('Topics', {
      subjectId,
      subjectTitle,
      chapterId: chapter.id,
      chapterTitle: chapter.name,
      chapterNumber: chapter.number,
      featureName,
      freeOnly,
    });
  };

  if (!isGuest && chaptersLoading) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color="#F1BB3E" />
      </SafeAreaView>
    );
  }

  if (!isGuest && chaptersError) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>{chaptersError.message}</Text>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#F5A623', '#F9C45A', '#FCDA3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.safeArea}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Yellow Header */}
        <View style={styles.yellowSection}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>{subjectTitle}</Text>
          </View>

          <View style={styles.headerPanel}>
            <Text style={styles.headerGreet}>
              {selectedClass?.name || 'Class'} · {chaptersToRender.length} chapters
            </Text>
            <Text style={styles.headerTitle}>Pick a Chapter</Text>
          </View>
        </View>

        {/* Body */}
        <View style={styles.bodyCard}>
          {/* Filter pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTERS.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chapter list */}
          {filteredChapters.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No chapters in this filter</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filteredChapters.map((ch) => {
                const { done, total, pct } = getChapterProgress(ch);
                const lessons = total || (ch as any).Topic?.length || 0;
                const num = String(ch.number ?? 1).padStart(2, '0');

                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={styles.chapterCard}
                    activeOpacity={0.85}
                    onPress={() => handleChapterPress(ch)}
                  >
                    <View style={styles.chNum}>
                      <Text style={styles.chNumText}>{num}</Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.chName} numberOfLines={1}>
                        {ch.name}
                      </Text>
                      <View style={styles.chMeta}>
                        <Text style={styles.chMetaText}>
                          📖 {lessons > 0 ? `${lessons} lessons` : 'Tap to view lessons'}
                        </Text>
                        {total > 0 && (
                          <Text style={styles.chMetaText}>· {done}/{total} done</Text>
                        )}
                      </View>
                      {total > 0 && (
                        <View style={styles.chBar}>
                          <View style={[styles.chBarFill, { width: `${pct}%` }]} />
                        </View>
                      )}
                    </View>
                    <View style={styles.chArrow}>
                      <Text style={styles.chArrowText}>→</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF8E8', paddingHorizontal: 16,
  },
  scroll: { paddingBottom: 120, backgroundColor: '#FFF8E8' },

  yellowSection: { backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  headerPanel: { paddingHorizontal: 20, paddingBottom: 28 },
  headerGreet: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },

  bodyCard: {
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 24,
  },

  filterRow: { gap: 8, paddingBottom: 14 },
  filterPill: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#f0f0f0',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: { backgroundColor: '#92400E', borderColor: '#92400E' },
  filterText: { fontSize: 11.5, fontWeight: '700', color: '#555' },
  filterTextActive: { color: '#fff' },

  chapterCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  chNum: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#92400E',
    alignItems: 'center', justifyContent: 'center',
  },
  chNumText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  chName: { fontSize: 14, fontWeight: '800', color: '#111', marginBottom: 4 },
  chMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chMetaText: { fontSize: 11, color: '#666' },
  chBar: {
    height: 4, borderRadius: 4,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    marginTop: 6,
  },
  chBarFill: { height: '100%', backgroundColor: '#92400E' },
  chArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center',
  },
  chArrowText: { color: '#92400E', fontSize: 14, fontWeight: '900' },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', fontSize: 13 },
  errorText: { fontSize: 16, color: '#EF4444', textAlign: 'center' },
});

export default Chapters;
