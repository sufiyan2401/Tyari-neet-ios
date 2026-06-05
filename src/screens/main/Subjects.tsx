import { ClassSelectModal } from '@/components/ClassSelectModal/ClassSelectModal';
import { getGuestChaptersBySubjectAndClass, getGuestClassesForSubjectWithFreeTopics, getGuestSubjectsWithFreeTopics } from '@/constants/guestData';
import { useAuth } from '@/contexts/AuthContext';
import { useGetAllClasses } from '@/hooks/api/classes';
import { useGetAllSubjects } from '@/hooks/api/subjects';
import { useProgress } from '@/hooks/useProgress';
import { TClass } from '@/types/Class';
import { TSubject } from '@/types/Subject';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SubjectsScreenProps = {
  navigation: any;
  route?: { params?: { featureName?: string; freeOnly?: boolean } };
};

type SubjectMeta = {
  emoji: string;
  gradient: [string, string];
};

const NEET_CHAPTER_COUNTS: Record<string, number> = {
  botany: 22,
  zoology: 20,
  physics: 29,
  chemistry: 30,
  biology: 42,
};

const SUBJECT_META: Record<string, SubjectMeta> = {
  botany: { emoji: '🌿', gradient: ['#66BB6A', '#43A047'] },
  chemistry: { emoji: '⚗️', gradient: ['#42A5F5', '#1976D2'] },
  physics: { emoji: '⚛️', gradient: ['#FFB74D', '#92400E'] },
  zoology: { emoji: '🦋', gradient: ['#EF5350', '#C62828'] },
  biology: { emoji: '🧬', gradient: ['#66BB6A', '#43A047'] },
  math: { emoji: '➗', gradient: ['#AB47BC', '#7B1FA2'] },
  maths: { emoji: '➗', gradient: ['#AB47BC', '#7B1FA2'] },
};

const FALLBACK_META: SubjectMeta = {
  emoji: '📘',
  gradient: ['#9CA3AF', '#6B7280'],
};

const getMetaFor = (name: string): SubjectMeta => {
  const key = name.trim().toLowerCase();
  return SUBJECT_META[key] || FALLBACK_META;
};

export const Subjects = ({ navigation, route }: SubjectsScreenProps) => {
  const featureName = route?.params?.featureName;
  const freeOnly = route?.params?.freeOnly ?? false;
  const { isGuest } = useAuth();
  const { data, isLoading, error } = useGetAllSubjects({ enabled: !isGuest });
  const { data: classesData } = useGetAllClasses({ enabled: !isGuest });
  const guestSubjects = getGuestSubjectsWithFreeTopics();

  const subjects: TSubject[] = isGuest ? guestSubjects : data?.data || [];
  const [pickedSubject, setPickedSubject] = useState<TSubject | null>(null);

  const { completedTopics, getChapterTotal } = useProgress();

  const getSubjectProgress = (subject: TSubject) => {
    const chapters: any[] = (subject as any).Chapter || [];
    let total = 0;
    let done = 0;
    chapters.forEach((ch) => {
      const chTotal = getChapterTotal(ch.id) || ch.Topic?.length || 0;
      total += chTotal;
      const chTopics = ch.Topic || [];
      done += chTopics.filter((t: any) => completedTopics.includes(t.id)).length;
    });
    if (total === 0) return { done: 0, total: 0, pct: 0 };
    return { done, total, pct: Math.round((done / total) * 100) };
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('MainTabs', { screen: 'HomeTab' });
    }
  };

  const handleSubjectPress = (subject: TSubject) => {
    setPickedSubject(subject);
  };

  const classesForModal: TClass[] = pickedSubject
    ? (isGuest
        ? getGuestClassesForSubjectWithFreeTopics(pickedSubject.id)
        : classesData?.data || [])
    : [];

  const handleContinueClass = (classId: string) => {
    if (!pickedSubject) return;
    const subject = pickedSubject;
    setPickedSubject(null);
    navigation.navigate('Chapters', {
      subjectId: subject.id,
      subjectTitle: subject.name,
      classId,
      featureName,
      freeOnly,
    });
  };

  if (!isGuest && isLoading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F1BB3E" />
      </SafeAreaView>
    );
  }

  if (!isGuest && error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>Error Fetching Data</Text>
      </SafeAreaView>
    );
  }

  return (
    <LinearGradient colors={['#F5A623', '#F9C45A', '#FCDA3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.safeArea}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFF8E8' }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Yellow Header Section */}
        <View style={styles.yellowSection}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
              <ChevronLeft size={22} color="#111" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>{freeOnly ? 'Free Content' : featureName || 'Subjects'}</Text>
          </View>

          <View style={styles.headerPanel}>
            <Text style={styles.headerGreet}>{freeOnly ? 'Explore free study material 📚' : 'Choose your subject 📚'}</Text>
            <Text style={styles.headerTitle}>{freeOnly ? 'Free Topics' : featureName ? featureName : 'Explore & Master NEET'}</Text>
          </View>
        </View>

        {/* Body Card */}
        <View style={styles.bodyCard}>
          <View style={styles.subjectGrid}>
            {subjects.map((subject, idx) => {
              const meta = getMetaFor(subject.name);
              const num = String(idx + 1).padStart(2, '0');
              const apiCount = Number((subject as any).chapterCount ?? 0);
              const chapterCount = isGuest
                ? getGuestChaptersBySubjectAndClass(subject.id, null).length
                : apiCount > 0 ? apiCount : NEET_CHAPTER_COUNTS[subject.name?.toLowerCase()] ?? 0;
              const { pct, total } = getSubjectProgress(subject);

              return (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectCard}
                  activeOpacity={0.85}
                  onPress={() => handleSubjectPress(subject)}
                >
                  <View style={[styles.subIcon, { backgroundColor: meta.gradient[1] }]}>
                    <Text style={styles.subEmoji}>{meta.emoji}</Text>
                  </View>

                  <Text style={styles.subLabel}>SUBJECT {num}</Text>
                  <Text style={styles.subName} numberOfLines={1}>
                    {subject.name}
                  </Text>

                  <View style={styles.subMeta}>
                    <Text style={styles.subChapters}>
                      <Text style={styles.subChaptersBold}>{chapterCount}</Text> chapters
                    </Text>
                    <View style={styles.subArrow}>
                      <Text style={styles.subArrowText}>→</Text>
                    </View>
                  </View>

                  {total > 0 ? (
                    <>
                      <View style={styles.subProg}>
                        <View
                          style={[
                            styles.subProgFill,
                            {
                              backgroundColor: meta.gradient[1],
                              width: `${pct}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.subProgText}>{pct}% completed</Text>
                    </>
                  ) : (
                    <Text style={styles.subProgText}>Tap to start learning</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </ScrollView>

      <ClassSelectModal
        visible={!!pickedSubject}
        onClose={() => setPickedSubject(null)}
        classes={classesForModal}
        subjectName={pickedSubject?.name || ''}
        subjectEmoji={pickedSubject ? getMetaFor(pickedSubject.name).emoji : ''}
        onContinue={handleContinueClass}
      />
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF8E8',
  },
  scroll: { paddingBottom: 30, flexGrow: 1 },

  /* Yellow header */
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
  topTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  headerPanel: { paddingHorizontal: 20, paddingBottom: 28 },
  headerGreet: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  headerTitle: {
    fontSize: 22, fontWeight: '900', color: '#111',
    letterSpacing: -0.3,
  },

  /* Body */
  bodyCard: {
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
  },

  /* Subject grid */
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  subjectCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 14, right: 14,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 12,
  },
  badgeNew: { backgroundColor: '#E8F5E9' },
  badgeHot: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  badgeTextNew: { color: '#2E7D32' },
  badgeTextHot: { color: '#C62828' },

  subIcon: {
    width: 54, height: 54, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  subEmoji: { fontSize: 28 },
  subLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.5,
    color: '#888', marginBottom: 3,
    textTransform: 'uppercase',
  },
  subName: {
    fontSize: 18, fontWeight: '900', color: '#111',
    letterSpacing: -0.3, marginBottom: 10,
  },
  subMeta: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 8,
  },
  subChapters: { fontSize: 11, color: '#666', fontWeight: '600' },
  subChaptersBold: { color: '#111', fontWeight: '800' },
  subArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1a1a1a',
    alignItems: 'center', justifyContent: 'center',
  },
  subArrowText: { color: '#F9C45A', fontSize: 14, fontWeight: '900' },
  subProg: {
    height: 5, borderRadius: 5,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
    marginTop: 4,
  },
  subProgFill: { height: '100%', borderRadius: 5 },
  subProgText: {
    fontSize: 9, color: '#888',
    marginTop: 5, fontWeight: '600',
  },

  errorText: { fontSize: 16, color: '#666' },
});

export default Subjects;
