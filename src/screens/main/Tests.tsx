import { useGetAllClasses } from '@/hooks/api/classes';
import { useGetAllSubjects } from '@/hooks/api/subjects';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TestsScreenProps = {
  navigation: any;
};

const TEST_TYPES = [
  {
    id: 'daily',
    emoji: '📅',
    title: 'Daily Practice Test',
    desc: 'Everyday concept strengthening',
    sub: '10–15 questions · 20 min',
    colors: ['#E8F5E9', '#C8E6C9'] as [string, string],
    accent: '#2E7D32',
  },
  {
    id: 'weekly',
    emoji: '📊',
    title: 'Weekly Test',
    desc: 'Revision + performance tracking',
    sub: '30–45 questions · 45 min',
    colors: ['#E3F2FD', '#BBDEFB'] as [string, string],
    accent: '#1565C0',
  },
  {
    id: 'full',
    emoji: '📄',
    title: 'Full Syllabus Test',
    desc: 'Real NEET exam simulation',
    sub: '180 questions · 200 min',
    colors: ['#F3E5F5', '#E1BEE7'] as [string, string],
    accent: '#6A1B9A',
  },
];

const SUBJECTS = [
  { id: 'botany',    emoji: '🌿', label: 'SUBJECT 01', name: 'Botany',    chapters: 38, colors: ['#66BB6A', '#43A047'] as [string, string] },
  { id: 'chemistry', emoji: '⚗️', label: 'SUBJECT 02', name: 'Chemistry', chapters: 30, colors: ['#42A5F5', '#1976D2'] as [string, string] },
  { id: 'physics',   emoji: '⚛️', label: 'SUBJECT 03', name: 'Physics',   chapters: 29, colors: ['#FFB74D', '#F5A623'] as [string, string] },
  { id: 'zoology',   emoji: '🦋', label: 'SUBJECT 04', name: 'Zoology',   chapters: 34, colors: ['#EF5350', '#C62828'] as [string, string] },
];

const CLASSES = [
  { id: 'class11', label: '11', title: 'Class 11', desc: '14 chapters · 245 topics' },
  { id: 'class12', label: '12', title: 'Class 12', desc: '15 chapters · 268 topics', alt: true },
];
// Note: real UUIDs fetched from backend in handleContinue via classesData

type Step = 'type' | 'subject' | 'class';

const SUBJECT_EMOJI: Record<string, string> = {
  botany: '🌿', chemistry: '⚗️', physics: '⚛️', zoology: '🦋', biology: '🧬',
};

export const Tests = ({ navigation }: TestsScreenProps) => {
  const { isGuest } = useAuth();
  const { data: classesData } = useGetAllClasses({ enabled: !isGuest });
  const { data: subjectsData } = useGetAllSubjects({ enabled: !isGuest });
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<typeof TEST_TYPES[0] | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [showClassModal, setShowClassModal] = useState(false);

  const realClasses = classesData?.data || [];
  // Map display classes to real UUIDs from backend
  const getClassOptions = () => {
    if (realClasses.length > 0) return realClasses;
    return CLASSES.map((c) => ({ id: c.id, name: c.title }));
  };
  const classOptions = getClassOptions();

  const stepNum = step === 'type' ? 1 : step === 'subject' ? 2 : 3;

  const handleTypePress = (type: typeof TEST_TYPES[0]) => {
    setSelectedType(type);
    setStep('subject');
  };

  const handleSubjectPress = (subject: any) => {
    setSelectedSubject(subject);
    setSelectedClassId(classOptions[0]?.id || '');
    setShowClassModal(true);
  };

  const handleContinue = () => {
    if (!selectedSubject || !selectedType || !selectedClassId) return;
    const cls = classOptions.find((c) => c.id === selectedClassId);
    setShowClassModal(false);

    if (selectedType.id === 'full') {
      // Full Syllabus — skip chapter, go directly to test
      navigation.navigate('TestMCQ', {
        testName: `Full Syllabus · ${selectedSubject.name}`,
        subjectName: selectedSubject.name,
        subjectEmoji: selectedSubject.emoji,
        subjectId: selectedSubject.id,
        classId: selectedClassId,
        chapterId: '',
        chapterName: 'Full Syllabus',
        chapterNum: '',
        totalTime: 200 * 60,
      });
    } else {
      navigation.navigate('DailyTestChapter', {
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        subjectEmoji: selectedSubject.emoji,
        classId: selectedClassId,
        className: (cls as any)?.name || 'Class',
        testType: selectedType.id,
        testTypeTitle: selectedType.title,
      });
    }
  };

  const handleBack = () => {
    if (step === 'subject') {
      setStep('type');
      setSelectedType(null);
    } else {
      navigation.goBack();
    }
  };

  const stepTitle = step === 'type'
    ? 'Choose Test Type'
    : `Choose a Subject`;

  const stepGreet = step === 'type'
    ? 'Step 1 of 3 📚'
    : `Step 2 of 3 · ${selectedType?.title}`;

  return (
    <LinearGradient
      colors={['#F5A623', '#F9C45A', '#FCDA3E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.safeArea}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFF8E8' }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Yellow Header */}
          <View style={styles.yellowSection}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
                <ChevronLeft size={22} color="#111" />
              </TouchableOpacity>
              <Text style={styles.topTitle}>Test Series</Text>
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {[1, 2, 3].map((n) => (
                <View key={n} style={[styles.dot, n === stepNum && styles.dotActive, n < stepNum && styles.dotDone]} />
              ))}
            </View>

            <View style={styles.headerPanel}>
              <Text style={styles.headerGreet}>{stepGreet}</Text>
              <Text style={styles.headerTitle}>{stepTitle}</Text>
            </View>
          </View>

          {/* Body */}
          <View style={styles.bodyCard}>

            {/* Step 1 — Test Type */}
            {step === 'type' && (
              <View style={styles.typeList}>
                {TEST_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.typeCard}
                    activeOpacity={0.85}
                    onPress={() => handleTypePress(type)}
                  >
                    <LinearGradient
                      colors={type.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.typeIconBox}
                    >
                      <Text style={styles.typeEmoji}>{type.emoji}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeTitle}>{type.title}</Text>
                      <Text style={styles.typeDesc}>{type.desc}</Text>
                      <View style={[styles.typePill, { backgroundColor: type.accent + '18' }]}>
                        <Text style={[styles.typePillText, { color: type.accent }]}>{type.sub}</Text>
                      </View>
                    </View>
                    <View style={[styles.typeArrow, { backgroundColor: type.accent }]}>
                      <Text style={styles.typeArrowText}>→</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Step 2 — Subject */}
            {step === 'subject' && (
              <View style={styles.subjectsGrid}>
                {(subjectsData?.data || SUBJECTS.map(s => ({ id: s.id, name: s.name, chapterCount: s.chapters }))).map((subject: any, idx: number) => {
                  const key = subject.name?.toLowerCase();
                  const emoji = SUBJECT_EMOJI[key] || '📘';
                  const COLORS = [
                    ['#66BB6A', '#43A047'],
                    ['#42A5F5', '#1976D2'],
                    ['#FFB74D', '#F5A623'],
                    ['#EF5350', '#C62828'],
                    ['#AB47BC', '#7B1FA2'],
                  ];
                  const colors = COLORS[idx % COLORS.length] as [string, string];
                  return (
                    <TouchableOpacity
                      key={subject.id}
                      style={styles.subjectCard}
                      activeOpacity={0.85}
                      onPress={() => handleSubjectPress({ ...subject, emoji, colors })}
                    >
                      <LinearGradient
                        colors={colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.subIcon}
                      >
                        <Text style={styles.subEmoji}>{emoji}</Text>
                      </LinearGradient>
                      <Text style={styles.subLabel}>SUBJECT {String(idx + 1).padStart(2, '0')}</Text>
                      <Text style={styles.subName}>{subject.name}</Text>
                      <View style={styles.subMeta}>
                        <Text style={styles.subChapters}>
                          <Text style={styles.subChaptersBold}>{subject.chapterCount ?? '—'}</Text> chapters
                        </Text>
                        <View style={styles.subArrow}>
                          <Text style={styles.subArrowText}>→</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          </View>
        </ScrollView>

        {/* Class Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={showClassModal}
          onRequestClose={() => setShowClassModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowClassModal(false)}>
            <View style={styles.modalBackdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalSheet}>
                  <View style={styles.modalGrip} />

                  <View style={styles.subjectBadgeWrap}>
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>
                        {selectedSubject?.emoji} {selectedSubject?.name?.toUpperCase()} · {selectedType?.title}
                      </Text>

                    </View>
                  </View>

                  <Text style={styles.modalTitle}>Select Your Class</Text>
                  <Text style={styles.modalSub}>Step 3 of 3 — Pick class to load chapters</Text>

                  <View style={styles.classOptions}>
                    {classOptions.map((cls, idx) => {
                      const isSelected = selectedClassId === cls.id;
                      return (
                        <TouchableOpacity
                          key={cls.id}
                          style={[styles.classCard, isSelected && styles.classCardSelected]}
                          activeOpacity={0.85}
                          onPress={() => setSelectedClassId(cls.id)}
                        >
                          <LinearGradient
                            colors={idx % 2 === 0 ? ['#F6C228', '#FFB74D'] : ['#42A5F5', '#1976D2']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.classIcon}
                          >
                            <Text style={styles.classIconText}>{(cls as any).name?.replace('Class ', '') || (idx + 11)}</Text>
                          </LinearGradient>
                          <View style={styles.classTextWrap}>
                            <Text style={styles.classTitle}>{(cls as any).name}</Text>
                          </View>
                          <View style={[styles.classRadio, isSelected && styles.classRadioSelected]}>
                            {isSelected && <Text style={styles.classRadioCheck}>✓</Text>}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TouchableOpacity style={styles.modalCta} onPress={handleContinue} activeOpacity={0.85}>
                    <Text style={styles.modalCtaText}>START TEST →</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingBottom: 0, backgroundColor: '#FFF8E8' },

  yellowSection: { backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111' },

  stepDots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  dot: { width: 22, height: 4, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.15)' },
  dotActive: { backgroundColor: '#111' },
  dotDone: { backgroundColor: '#92400E' },

  headerPanel: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 4 },
  headerGreet: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: -0.3 },

  bodyCard: {
    backgroundColor: '#FFF8E8',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 16, paddingTop: 22, paddingBottom: 120,
  },

  // Test Type list
  typeList: { gap: 14 },
  typeCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  typeIconBox: {
    width: 56, height: 56, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  typeEmoji: { fontSize: 28 },
  typeTitle: { fontSize: 15, fontWeight: '900', color: '#111', marginBottom: 2 },
  typeDesc: { fontSize: 12, color: '#555', marginBottom: 6 },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8,
  },
  typePillText: { fontSize: 10, fontWeight: '700' },
  typeArrow: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  typeArrowText: { color: '#fff', fontSize: 14, fontWeight: '900' },

  // Subject grid
  subjectsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  subjectCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: '#fff', borderRadius: 22, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 16, elevation: 2,
  },
  subIcon: {
    width: 50, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  subEmoji: { fontSize: 26 },
  subLabel: { fontSize: 9.5, fontWeight: '700', color: '#888', letterSpacing: 0.5, marginBottom: 2 },
  subName: { fontSize: 17, fontWeight: '900', color: '#111', marginBottom: 8 },
  subMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subChapters: { fontSize: 11, color: '#666', fontWeight: '600' },
  subChaptersBold: { color: '#111', fontWeight: '800' },
  subArrow: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F6C228', alignItems: 'center', justifyContent: 'center',
  },
  subArrowText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFF8E8', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 22, paddingBottom: 36,
  },
  modalGrip: {
    width: 40, height: 4, borderRadius: 4,
    backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16,
  },
  subjectBadgeWrap: { alignItems: 'center', marginBottom: 12 },
  subjectBadge: { backgroundColor: '#FFF8E1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  subjectBadgeText: { fontSize: 11, fontWeight: '800', color: '#b8860b' },
  modalTitle: { fontSize: 19, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 4 },
  modalSub: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 20 },

  classOptions: { gap: 12, marginBottom: 18 },
  classCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  classCardSelected: { borderColor: '#F6C228', backgroundColor: '#FFFBEA' },
  classIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  classIconText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  classTextWrap: { flex: 1 },
  classTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 2 },
  classDesc: { fontSize: 11, color: '#777' },
  classRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
  },
  classRadioSelected: { backgroundColor: '#F6C228', borderColor: '#F6C228' },
  classRadioCheck: { fontSize: 12, fontWeight: '900', color: '#fff' },

  modalCta: {
    backgroundColor: '#111', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCtaText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
});

export default Tests;
