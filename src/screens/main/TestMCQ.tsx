import { useAuth } from '@/contexts/AuthContext';
import { useGetQuestions } from '@/hooks/api/questions';
import { TQuestion } from '@/types/Question';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type MCQQuestion = {
  id: string;
  subject: string;
  subjectEmoji: string;
  chapterName?: string;
  chapterNum?: string;
  difficulty: string;
  marks: string;
  text: string;
  options: { letter: string; text: string }[];
  correctIndex: number;
};

export type AnswerState = {
  selectedIndex: number | null;
  skipped: boolean;
};

type TestMCQProps = {
  navigation: any;
  route: {
    params?: {
      testName?: string;
      subjectName?: string;
      subjectEmoji?: string;
      subjectId?: string;
      classId?: string;
      chapterId?: string;
      chapterName?: string;
      chapterNum?: string;
      totalTime?: number;
      featureType?: string;
      questionType?: string;
    };
  };
};

const DIFF_COLORS: Record<string, { bg: string; color: string }> = {
  EASY:   { bg: '#E8F5E9', color: '#2E7D32' },
  MEDIUM: { bg: '#FFF3E0', color: '#E65100' },
  HARD:   { bg: '#FFEBEE', color: '#C62828' },
};

const optionLetters = ['A', 'B', 'C', 'D'] as const;

// Map TQuestion from API to MCQQuestion used in UI
const mapToMCQ = (q: TQuestion, subjectEmoji: string, chapterName: string, chapterNum: string): MCQQuestion => ({
  id: q.id,
  subject: (q.Subject?.name || 'Subject').toUpperCase(),
  subjectEmoji,
  chapterName,
  chapterNum,
  difficulty: q.difficulty,
  marks: q.marks,
  text: q.text,
  options: [
    { letter: 'A', text: q.optionA },
    { letter: 'B', text: q.optionB },
    { letter: 'C', text: q.optionC },
    { letter: 'D', text: q.optionD },
  ],
  correctIndex: optionLetters.indexOf(q.correctOption),
});

export const TestMCQ = ({ navigation, route }: TestMCQProps) => {
  const { isGuest } = useAuth();
  const testName    = route?.params?.testName    || 'Daily Practice Test';
  const subjectName = route?.params?.subjectName || 'Subject';
  const subjectEmoji= route?.params?.subjectEmoji|| '📘';
  const subjectId   = route?.params?.subjectId   || '';
  const classId     = route?.params?.classId     || '';
  const chapterId   = route?.params?.chapterId   || '';
  const chapterName = route?.params?.chapterName || '';
  const chapterNum  = route?.params?.chapterNum  || '';
  const totalTime   = route?.params?.totalTime   || 30 * 60;
  const featureType = route?.params?.featureType || '';
  const questionType = route?.params?.questionType || '';

  const { data, isLoading, error } = useGetQuestions(
    { chapterId: chapterId || undefined, subjectId, classId, featureType: featureType || undefined },
    { enabled: Boolean(subjectId && classId) }
  );

  // Filter by questionType if provided
  const filteredByType = questionType
    ? (data?.data || []).filter((q: any) => (q.questionType || 'MCQ') === questionType)
    : (data?.data || []);

  const apiQuestions: MCQQuestion[] = filteredByType.map((q: any) =>
    mapToMCQ(q, subjectEmoji, chapterName, chapterNum)
  );

  const questions = apiQuestions;
  const total = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerState[]>([]);
  const [timeLeft, setTimeLeft] = useState(totalTime);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  // Init answers array when questions load
  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(Array(questions.length).fill(null).map(() => ({ selectedIndex: null, skipped: false })));
    }
  }, [questions.length]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const finishTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const ans = answersRef.current;
    const qs  = questionsRef.current;
    const correct = ans.filter((a, i) => a.selectedIndex === qs[i]?.correctIndex).length;
    const wrong   = ans.filter((a, i) => a.selectedIndex !== null && a.selectedIndex !== qs[i]?.correctIndex).length;
    const skipped = ans.filter((a) => a.selectedIndex === null).length;
    navigation.replace('TestResult', {
      testName,
      subjectName,
      chapterName,
      totalQuestions: qs.length,
      correct,
      wrong,
      skipped,
      answers: ans,
      questions: qs,
    });
  }, [chapterName, navigation, subjectName, testName]);

  useEffect(() => {
    if (total === 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          finishTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const selectOption = (idx: number) => {
    const updated = [...answers];
    updated[currentIdx] = { selectedIndex: idx, skipped: false };
    setAnswers(updated);
  };

  const handleSkip = () => {
    const updated = [...answers];
    updated[currentIdx] = { selectedIndex: null, skipped: true };
    setAnswers(updated);
    if (currentIdx < total - 1) setCurrentIdx(currentIdx + 1);
    else finishTest();
  };

  const handleNext = () => {
    if (currentIdx < total - 1) setCurrentIdx(currentIdx + 1);
    else finishTest();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={['#F5A623', '#FFB74D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quizHeader}>
          <Text style={styles.loadingHeaderText}>{testName}</Text>
        </LinearGradient>
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#F5A623" />
          <Text style={styles.loadingText}>Loading questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No questions
  if (!isLoading && total === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={['#F5A623', '#FFB74D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quizHeader}>
          <Text style={styles.loadingHeaderText}>{testName}</Text>
        </LinearGradient>
        <View style={styles.centerWrap}>
          <Text style={styles.noQText}>📭 No questions available for this chapter yet.</Text>
          <Text style={styles.noQSub}>Ask your admin to add questions from the admin panel.</Text>
          <TouchableOpacity style={styles.backBtn2} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtn2Text}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQ = questions[currentIdx];
  const currentAnswer = answers[currentIdx] || { selectedIndex: null, skipped: false };
  const progressPct = (currentIdx / total) * 100;
  const isWarning = timeLeft < 120;
  const diffStyle = DIFF_COLORS[currentQ?.difficulty] || DIFF_COLORS.MEDIUM;
  const subjectTagLabel = chapterNum
    ? `${subjectEmoji} ${currentQ?.subject} · CH ${chapterNum}`
    : `${subjectEmoji} ${currentQ?.subject}`;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Quiz Header */}
      <LinearGradient
        colors={['#F5A623', '#FFB74D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.quizHeader}
      >
        <View style={styles.quizMetaRow}>
          <View style={styles.quizCounter}>
            <Text style={styles.quizCounterLabel}>Q </Text>
            <Text style={styles.quizCounterNum}>{String(currentIdx + 1).padStart(2, '0')}</Text>
            <Text style={styles.quizCounterLabel}> / {total}</Text>
          </View>
          <View style={[styles.quizTimer, isWarning && styles.quizTimerWarning]}>
            <Text style={[styles.quizTimerText, isWarning && styles.quizTimerWarningText]}>
              ⏱ {formatTime(timeLeft)}
            </Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>
      </LinearGradient>

      {/* Question Area */}
      <ScrollView
        style={styles.questionScroll}
        contentContainerStyle={styles.questionContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tags */}
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.tagText, { color: '#E65100' }]}>{subjectTagLabel}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: diffStyle.bg }]}>
            <Text style={[styles.tagText, { color: diffStyle.color }]}>🔥 {currentQ?.difficulty}</Text>
          </View>
          <View style={[styles.tag, { backgroundColor: '#E8F5E9' }]}>
            <Text style={[styles.tagText, { color: '#2E7D32' }]}>{currentQ?.marks}</Text>
          </View>
        </View>

        {/* Question Text */}
        <View style={styles.qTextBox}>
          <Text style={styles.qText}>{currentQ?.text}</Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {currentQ?.options.map((opt, idx) => {
            const isSelected = currentAnswer.selectedIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.option, isSelected && styles.optionSelected]}
                activeOpacity={0.8}
                onPress={() => selectOption(idx)}
              >
                <View style={[styles.optLetter, isSelected && styles.optLetterSelected]}>
                  <Text style={[styles.optLetterText, isSelected && styles.optLetterTextSelected]}>
                    {opt.letter}
                  </Text>
                </View>
                <Text style={styles.optText}>{opt.text}</Text>
                <View style={[styles.optTick, isSelected && styles.optTickSelected]}>
                  {isSelected && <Text style={styles.optTickMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.quizActions}>
        <TouchableOpacity style={styles.btnOutline} onPress={handleSkip} activeOpacity={0.8}>
          <Text style={styles.btnOutlineText}>⤴ Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSolid} onPress={handleNext} activeOpacity={0.8}>
          <Text style={styles.btnSolidText}>
            {currentIdx === total - 1 ? 'Finish ✓' : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF8E8' },

  quizHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  loadingHeaderText: { fontSize: 17, fontWeight: '800', color: '#111' },
  quizMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  quizCounter: {
    flexDirection: 'row', alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  quizCounterLabel: { fontSize: 11, fontWeight: '800', color: '#F6C228' },
  quizCounterNum: { fontSize: 16, fontWeight: '900', color: '#fff' },
  quizTimer: {
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 3,
  },
  quizTimerWarning: { backgroundColor: '#FFEBEE' },
  quizTimerText: { fontSize: 13, fontWeight: '900', color: '#111' },
  quizTimerWarningText: { color: '#C62828' },
  progressTrack: { height: 6, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 6, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 6 },

  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  noQText: { fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center', marginBottom: 8 },
  noQSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  backBtn2: {
    backgroundColor: '#F5A623', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  backBtn2Text: { fontSize: 14, fontWeight: '800', color: '#fff' },

  questionScroll: { flex: 1, backgroundColor: '#FFF8E8' },
  questionContent: { padding: 16, paddingBottom: 20 },

  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },

  qTextBox: {
    backgroundColor: '#fff', borderRadius: 18, padding: 16,
    marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 14, elevation: 2,
  },
  qText: { fontSize: 14, color: '#111', lineHeight: 22, fontWeight: '600' },

  options: { gap: 10 },
  option: {
    backgroundColor: '#fff', borderWidth: 2, borderColor: 'transparent',
    borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12,
    alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  optionSelected: {
    borderColor: '#F6C228', backgroundColor: '#FFFBEA',
    shadowColor: '#F6C228', shadowOpacity: 0.25, shadowRadius: 16,
  },
  optLetter: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F6F6F6', alignItems: 'center', justifyContent: 'center',
  },
  optLetterSelected: { backgroundColor: '#F6C228' },
  optLetterText: { fontSize: 14, fontWeight: '900', color: '#555' },
  optLetterTextSelected: { color: '#fff' },
  optText: { flex: 1, fontSize: 13, color: '#222', fontWeight: '600' },
  optTick: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#ddd', alignItems: 'center', justifyContent: 'center',
  },
  optTickSelected: { backgroundColor: '#F6C228', borderColor: '#F6C228' },
  optTickMark: { fontSize: 12, fontWeight: '900', color: '#fff' },

  quizActions: {
    flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 18,
    backgroundColor: '#FFF8E8', borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)',
  },
  btnOutline: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e0e0',
    alignItems: 'center', justifyContent: 'center',
  },
  btnOutlineText: { fontSize: 13, fontWeight: '800', color: '#555', letterSpacing: 0.4 },
  btnSolid: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center',
  },
  btnSolidText: { fontSize: 13, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
});

export default TestMCQ;
