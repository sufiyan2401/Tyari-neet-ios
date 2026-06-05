import { FeatureDetailModal, FeatureDetail } from '@/components/FeatureDetailModal/FeatureDetailModal';
import { NotificationsModal } from '@/components/NotificationsModal/NotificationsModal';
import { StreakCalendar } from '@/components/StreakCalendar/StreakCalendar';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/contexts/FeatureContext';
import { useGetProfile } from '@/hooks/api/user';
import { useProgress } from '@/hooks/useProgress';
import { useStreak } from '@/hooks/useStreak';
import { useGetHomeContent } from '@/hooks/api/homecontent';
import { useContentProtection } from '@/hooks/useContentProtection';
import { useGetLeaderboard, useGetMyScores } from '@/hooks/api/leaderboard';
import type { TFeatureType } from '@/hooks/api/topics';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

const defaultHeroBanner = require('../../../assets/hero-new.png');
const avatarLogo = require('../../../assets/icon.png');
const defaultFooterImage = require('../../../assets/footer.png');

const { width } = Dimensions.get('window');

type HomeScreenProps = {
  navigation: any;
};

type DefaultFeature = {
  icon: string;
  num: string;
  name: string;
  desc: string;
  featureType: TFeatureType;
};

const DEFAULT_FEATURES: DefaultFeature[] = [
  { icon: '💡', num: '1.', name: 'Explanation', desc: 'Detailed explanation of every topic', featureType: 'explanation' },
  { icon: '🧠', num: '2.', name: 'Revision Recall Station', desc: 'Smart revision to retain better', featureType: 'revision_recall' },
  { icon: '🔗', num: '3.', name: 'Hidden Links', desc: 'Connect concepts unlock clarity', featureType: 'hidden_links' },
  { icon: '📋', num: '4.', name: 'Exercise Revival', desc: 'From Back exercise to Mastery', featureType: 'exercise_revival' },
  { icon: '🏆', num: '5.', name: 'Master Exemplar', desc: 'Exemplar Deep Practice Zone', featureType: 'master_exemplar' },
  { icon: '📖', num: '6.', name: 'Previous Year Questions', desc: 'PYQ to Question Mastery', featureType: 'pyq' },
  { icon: '🛡️', num: '7.', name: 'Chapter Check Point', desc: 'Full chapter test to check your real preparation', featureType: 'chapter_checkpoint' },
];

// Map admin-configured titles back to a feature type, so admin can rename freely
// while we still know which content slot to load.
const FEATURE_TYPE_BY_INDEX: TFeatureType[] = [
  'explanation',
  'revision_recall',
  'hidden_links',
  'exercise_revival',
  'master_exemplar',
  'pyq',
  'chapter_checkpoint',
];


export const Home = ({ navigation }: HomeScreenProps) => {
  const { isGuest } = useAuth();
  const { data: profile } = useGetProfile({ enabled: !isGuest });
  const { data: homeContent, isSuccess: homeContentLoaded } = useGetHomeContent();
  const { data: leaderboardData } = useGetLeaderboard('weekly', 50);
  const { data: myScoresData } = useGetMyScores(!isGuest);

  const heroImageUrl = useMemo(() => {
    if (homeContentLoaded && Array.isArray(homeContent?.data)) {
      const hero = homeContent.data.find((i: any) => i.section === 'hero' && i.isActive && i.imageUrl);
      if (hero?.imageUrl) return hero.imageUrl;
    }
    return null;
  }, [homeContent, homeContentLoaded]);

  const footerImageUrl = useMemo(() => {
    if (homeContentLoaded && Array.isArray(homeContent?.data)) {
      const footer = homeContent.data.find((i: any) => i.section === 'footer' && i.isActive && i.imageUrl);
      if (footer?.imageUrl) return footer.imageUrl;
    }
    return null;
  }, [homeContent, homeContentLoaded]);

  const heroBanner = heroImageUrl ? { uri: heroImageUrl } : defaultHeroBanner;
  const footerImage = footerImageUrl ? { uri: footerImageUrl } : defaultFooterImage;

  const FEATURES = useMemo(() => {
    // Trust API once it has responded — empty array means admin hid them all.
    if (homeContentLoaded && Array.isArray(homeContent?.data)) {
      const apiFeatures = homeContent.data
        .filter((i: any) => i.section === 'feature' && i.isActive !== false);
      return apiFeatures.map((f: any, i: number) => ({
        icon: f.icon || '📚',
        num: `${i + 1}.`,
        name: f.title,
        desc: f.description || '',
        // Position-based mapping: admin's nth feature card opens nth content slot.
        featureType: FEATURE_TYPE_BY_INDEX[i] ?? 'explanation',
      }));
    }
    // Show defaults only while API hasn't loaded yet (offline / first paint).
    return DEFAULT_FEATURES;
  }, [homeContent, homeContentLoaded]);


  const displayName = isGuest
    ? 'Future Doctor'
    : profile?.data?.name
      ? profile.data.name.charAt(0).toUpperCase() + profile.data.name.slice(1)
      : 'Future Doctor';

  const goToFreeContent = () => {
    navigation.navigate('SubjectSelect', { freeOnly: true });
  };

  useContentProtection({ key: 'home-screen' });

  const { setActiveFeature: setActiveFeatureType } = useFeature();
  const { currentStreak, longestStreak, visitedDates, totalDaysStudied } = useStreak();
  const [streakModalOpen, setStreakModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [progressModal, setProgressModal] = useState<'topics' | 'studytime' | null>(null);
  const [activeFeature, setActiveFeature] = useState<(FeatureDetail & { featureType?: TFeatureType }) | null>(null);

  const handleFeatureStart = () => {
    if (activeFeature?.featureType) {
      setActiveFeatureType(activeFeature.featureType);
    }
    const fname = activeFeature?.name || '';
    const ftype = activeFeature?.featureType || 'explanation';
    setActiveFeature(null);
    navigation.navigate('FeatureContent', { featureType: ftype, featureName: fname });
  };

  const { completedTopics, topicNames } = useProgress();
  const studyStats = useMemo(() => {
    const covered = completedTopics.length;
    const myScores: any[] = (myScoresData as any)?.data ?? [];
    const totalSeconds = myScores.reduce((sum: number, s: any) => sum + (s.timeTaken ?? 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const studyTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    const testsPlayed = myScores.length;
    return {
      covered,
      studyTime,
      testsPlayed,
      hasData: covered > 0 || testsPlayed > 0,
    };
  }, [completedTopics, myScoresData]);

  return (
    <LinearGradient
      colors={['#F5A623', '#F9C45A', '#FCDA3E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientWrapper}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Yellow Header */}
        <View style={styles.yellowHeader}>
          <View style={styles.topNav}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => setNotifOpen(true)}
              activeOpacity={0.85}
            >
              <Bell size={20} color="#000" />
              <View style={styles.bellDot} />
            </TouchableOpacity>
          </View>

          {/* Greeting Strip */}
          <View style={styles.greetStrip}>
            <View style={styles.greetLeft}>
              <Image source={avatarLogo} style={styles.greetAvatar} resizeMode="contain" />
              <View>
                <Text style={styles.greetHi}>Namaste! 👋</Text>
                <Text style={styles.greetName}>{displayName}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.streakBadge}
              onPress={() => setStreakModalOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.streakText}>🔥 {currentStreak} Day Streak</Text>
            </TouchableOpacity>
          </View>

          {/* Hero Banner */}
          <TouchableOpacity
            style={styles.hero}
            activeOpacity={0.9}
            onPress={goToFreeContent}
          >
            <Image source={heroBanner} style={styles.heroBannerImg} />
          </TouchableOpacity>
        </View>

        {/* White Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.scrollContent}>
          {/* 8 Features */}
          <View style={styles.section}>
            <View style={styles.featGrid}>
              {FEATURES.map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.featCard}
                  activeOpacity={0.7}
                  onPress={() => setActiveFeature(f)}
                >
                  <Text style={styles.featIco} selectable={false}>{f.icon}</Text>
                  <Text style={styles.featNum} selectable={false}>{f.num} {f.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>


          {/* 3 Levels of Test */}
          <View style={styles.section}>
            <View style={styles.secRow}>
              <View style={styles.secTitleWrap}>
                <Text style={styles.pulseIcon}>〰</Text>
                <Text style={styles.secTitle}>Challenge Your Knowledge</Text>
              </View>
            </View>
            <View style={styles.testGrid}>
              {[
                { icon: '📅', name: 'Daily Practice Test', desc: 'Everyday concept strengthening', bg: '#E8F5E9', btn: '#2E7D32' },
                { icon: '📊', name: 'Weekly Test', desc: 'Revision + performance tracking', bg: '#E3F2FD', btn: '#1565C0' },
                { icon: '📄', name: 'Full Syllabus Test', desc: 'Real exam simulation', bg: '#F3E5F5', btn: '#6A1B9A' },
              ].map((t, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.testCard, { backgroundColor: t.bg }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('MainTabs', { screen: 'TestsTab' })}
                >
                  <Text style={styles.tIco}>{t.icon}</Text>
                  <Text style={styles.tName}>{t.name}</Text>
                  <Text style={styles.tDesc}>{t.desc}</Text>
                  <View style={[styles.tBtn, { backgroundColor: t.btn }]}>
                    <Text style={styles.tBtnText}>→</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Ranking Board */}
          <View style={styles.section}>
            <View style={styles.secRow}>
              <View style={styles.secTitleWrap}>
                <Text style={styles.pulseIcon}>🏆</Text>
                <Text style={styles.secTitle}>Weekly Rankings</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard')}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {(() => {
              const entries = (leaderboardData as any)?.data ?? [];
              if (entries.length === 0) {
                return (
                  <View style={styles.lbEmpty}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🎯</Text>
                    <Text style={styles.lbEmptyTitle}>No rankings yet!</Text>
                    <Text style={styles.lbEmptyText}>Take a test this week to appear on the leaderboard</Text>
                  </View>
                );
              }
              const MEDAL_DATA = [
                { medal: '🥇', bg: ['#FFF8DC', '#FFD700'] as [string,string], border: '#FFD700', rankColor: '#B8860B' },
                { medal: '🥈', bg: ['#F5F5F5', '#C0C0C0'] as [string,string], border: '#C0C0C0', rankColor: '#708090' },
                { medal: '🥉', bg: ['#FFF0E6', '#CD7F32'] as [string,string], border: '#CD7F32', rankColor: '#8B4513' },
              ];
              const AVATAR_COLORS = ['#F6C228', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0'];
              return (
                <View style={styles.lbWrap}>
                  {/* Top 3 podium */}
                  {entries.slice(0, 3).map((entry: any, i: number) => {
                    const md = MEDAL_DATA[i];
                    return (
                      <LinearGradient
                        key={entry.userId}
                        colors={md.bg}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.lbTopRow, { borderColor: md.border }]}
                      >
                        <Text style={styles.lbTopMedal}>{md.medal}</Text>
                        <View style={[styles.lbTopAvatar, { backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }]}>
                          <Text style={styles.lbTopAvatarText}>
                            {(entry.User?.name || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.lbTopName} numberOfLines={1}>
                            {entry.User?.name || 'Student'}
                          </Text>
                          <Text style={styles.lbTopSub}>{entry.testsPlayed} tests · {Math.round(entry.avgPercentage ?? 0)}% avg</Text>
                        </View>
                        <View style={styles.lbTopScoreWrap}>
                          <Text style={[styles.lbTopScore, { color: md.rankColor }]}>{Math.round(entry.totalScore ?? 0)}</Text>
                          <Text style={[styles.lbTopPts, { color: md.rankColor }]}>pts</Text>
                        </View>
                      </LinearGradient>
                    );
                  })}
                  {/* Ranks 4-5 */}
                  {entries.slice(3, 5).map((entry: any, i: number) => (
                    <View key={entry.userId} style={styles.lbRow}>
                      <View style={styles.lbRankBadge}>
                        <Text style={styles.lbRankNum}>#{i + 4}</Text>
                      </View>
                      <View style={[styles.lbAvatar, { backgroundColor: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length] }]}>
                        <Text style={styles.lbAvatarText}>
                          {(entry.User?.name || 'U').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.lbName} numberOfLines={1}>{entry.User?.name || 'Student'}</Text>
                        <Text style={styles.lbSub}>{entry.testsPlayed} tests · {Math.round(entry.avgPercentage ?? 0)}% avg</Text>
                      </View>
                      <Text style={styles.lbScore}>{Math.round(entry.totalScore ?? 0)} pts</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>

          {/* Study Progress */}
          <View style={styles.section}>
            <View style={styles.secRow}>
              <Text style={styles.secTitle}>Your Study Progress</Text>
            </View>
            <View style={styles.progGrid}>
              <TouchableOpacity style={styles.progCard} activeOpacity={0.85} onPress={() => setProgressModal('topics')}>
                <Text style={styles.pIco}>📖</Text>
                <Text style={styles.pLabel}>Topics Covered</Text>
                <Text style={styles.pVal}>{studyStats.covered}</Text>
                <Text style={styles.pSub}>
                  {studyStats.covered > 0 ? 'topics read' : 'start learning'}
                </Text>
                <View style={styles.pBar}>
                  <View style={[styles.pFill, { backgroundColor: '#EF5350', width: `${Math.min(studyStats.covered * 2, 100)}%` }]} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.progCard} activeOpacity={0.85} onPress={() => setStreakModalOpen(true)}>
                <Text style={styles.pIco}>🔥</Text>
                <Text style={styles.pLabel}>Day Streak</Text>
                <Text style={styles.pVal}>{currentStreak}</Text>
                <Text style={[styles.pSub, currentStreak > 0 && styles.pSubOk]}>
                  {currentStreak > 0 ? 'Keep it up!' : 'start today'}
                </Text>
                <View style={styles.pBar}>
                  <View style={[styles.pFill, { backgroundColor: '#43A047', width: `${Math.min(currentStreak * 10, 100)}%` }]} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.progCard} activeOpacity={0.85} onPress={() => setProgressModal('studytime')}>
                <Text style={styles.pIco}>🕐</Text>
                <Text style={styles.pLabel}>Study Time</Text>
                <Text style={[styles.pVal, { fontSize: 16 }]}>{studyStats.studyTime}</Text>
                <Text style={styles.pSub}>{studyStats.testsPlayed > 0 ? `${studyStats.testsPlayed} tests` : 'no tests yet'}</Text>
                <View style={styles.pBar}>
                  <View style={[styles.pFill, { backgroundColor: '#92400E', width: `${Math.min(studyStats.testsPlayed * 5, 100)}%` }]} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          </View>
          <TouchableOpacity activeOpacity={0.9} onPress={goToFreeContent} style={styles.footerWrap}>
            <Image source={footerImage} style={styles.footerImg} />
          </TouchableOpacity>
      </View>
      </ScrollView>

      <StreakCalendar
        visible={streakModalOpen}
        onClose={() => setStreakModalOpen(false)}
        visitedDates={visitedDates}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        totalDaysStudied={totalDaysStudied}
      />

      <NotificationsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
      />

      <FeatureDetailModal
        visible={activeFeature !== null}
        feature={activeFeature}
        onClose={() => setActiveFeature(null)}
        onStart={handleFeatureStart}
      />

      {/* Progress Detail Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={progressModal !== null}
        onRequestClose={() => setProgressModal(null)}
      >
        <TouchableWithoutFeedback onPress={() => setProgressModal(null)}>
          <View style={styles.pmBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.pmSheet}>
                <View style={styles.pmGrip} />
                {progressModal === 'topics' && (
                  <>
                    <Text style={styles.pmTitle}>📖 Topics Covered</Text>
                    <Text style={styles.pmSub}>{completedTopics.length} lessons completed</Text>
                    {completedTopics.length === 0 ? (
                      <View style={styles.pmEmpty}>
                        <Text style={styles.pmEmptyText}>No topics covered yet. Start reading to track your progress!</Text>
                      </View>
                    ) : (
                      <ScrollView style={styles.pmList} showsVerticalScrollIndicator={false}>
                        {completedTopics.map((id, i) => (
                          <View key={id} style={styles.pmItem}>
                            <View style={styles.pmItemNum}><Text style={styles.pmItemNumText}>{i + 1}</Text></View>
                            <Text style={styles.pmItemText} numberOfLines={1}>{topicNames[id] || `Topic ${i + 1}`}</Text>
                            <Text style={styles.pmItemCheck}>✓</Text>
                          </View>
                        ))}
                      </ScrollView>
                    )}
                  </>
                )}
                {progressModal === 'studytime' && (() => {
                  const myScores: any[] = (myScoresData as any)?.data ?? [];
                  const totalSec = myScores.reduce((s: number, t: any) => s + (t.timeTaken ?? 0), 0);
                  const h = Math.floor(totalSec / 3600);
                  const m = Math.floor((totalSec % 3600) / 60);
                  return (
                    <>
                      <Text style={styles.pmTitle}>🕐 Study Time</Text>
                      <Text style={styles.pmSub}>{h > 0 ? `${h}h ${m}m` : `${m}m`} total · {myScores.length} tests played</Text>
                      {myScores.length === 0 ? (
                        <View style={styles.pmEmpty}>
                          <Text style={styles.pmEmptyText}>No tests taken yet. Take a test to see your study time!</Text>
                        </View>
                      ) : (
                        <ScrollView style={styles.pmList} showsVerticalScrollIndicator={false}>
                          {myScores.slice(0, 20).map((s: any, i: number) => {
                            const mins = Math.round((s.timeTaken ?? 0) / 60);
                            const date = new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                            return (
                              <View key={s.id || i} style={styles.pmItem}>
                                <View style={[styles.pmItemNum, { backgroundColor: '#92400E' }]}><Text style={styles.pmItemNumText}>{mins}m</Text></View>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.pmItemText} numberOfLines={1}>{s.Subject?.name || s.testType || 'Test'}</Text>
                                  <Text style={styles.pmItemSub}>{date} · {s.correctAnswers}/{s.totalQuestions} correct · {Math.round(s.percentage)}%</Text>
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>
                      )}
                    </>
                  );
                })()}
                <TouchableOpacity style={styles.pmCloseBtn} onPress={() => setProgressModal(null)}>
                  <Text style={styles.pmCloseBtnText}>Close</Text>
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
  gradientWrapper: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  yellowHeader: {
    paddingBottom: 0,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
  },
  iconBtn: { padding: 4 },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#92400E',
  },
  greetStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  greetLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greetAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  greetHi: { fontSize: 12, fontWeight: '600', color: '#555' },
  greetName: { fontSize: 15, fontWeight: '800', color: '#111' },
  streakBadge: {
    backgroundColor: '#92400E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#92400E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  streakText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  hero: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginHorizontal: 14,
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroBannerImg: {
    width: width - 28,
    height: ((width - 28) * 1024) / 1536,
    borderRadius: 14,
    resizeMode: 'contain',
  },
  cardBody: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  scrollContent: { paddingTop: 18, paddingHorizontal: 14, paddingBottom: 0 },
  section: { paddingBottom: 18 },
  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  secTitle: { fontSize: 14, fontWeight: '800', color: '#111' },
  pulseIcon: { color: '#92400E', fontSize: 15, fontWeight: '800' },
  viewAll: { fontSize: 11.5, fontWeight: '700', color: '#92400E' },

  /* Feature Grid */
  featGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featCard: {
    width: (width - 28 - 24) / 4,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#efefef',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  featIco: { fontSize: 24, marginBottom: 6 },
  featNum: {
    fontSize: 9,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 3,
  },
  featDesc: { fontSize: 8, color: '#777', textAlign: 'center', lineHeight: 11 },

  /* Test Grid */
  testGrid: { flexDirection: 'row', gap: 9 },
  testCard: {
    flex: 1,
    borderRadius: 14,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 42,
    minHeight: 130,
  },
  tIco: { fontSize: 28, marginBottom: 7 },
  tName: { fontSize: 10.5, fontWeight: '800', color: '#111', marginBottom: 3, lineHeight: 13 },
  tDesc: { fontSize: 8.5, color: '#555', lineHeight: 11 },
  tBtn: {
    position: 'absolute',
    bottom: 9,
    right: 9,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  /* Progress Grid */
  progGrid: { flexDirection: 'row', gap: 9 },
  progCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#efefef',
    borderRadius: 14,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 1,
  },
  pIco: { fontSize: 20, marginBottom: 5 },
  pLabel: { fontSize: 8.5, color: '#888', fontWeight: '600', marginBottom: 3 },
  pVal: { fontSize: 19, fontWeight: '900', color: '#111', marginBottom: 2 },
  pSub: { fontSize: 8, color: '#aaa', marginBottom: 7 },
  pSubOk: { color: '#2E7D32', fontWeight: '700' },
  pBar: { height: 4, borderRadius: 4, backgroundColor: '#eee', overflow: 'hidden' },
  pFill: { height: '100%', borderRadius: 4 },

  /* Quick Actions */
  quickRow: { gap: 10, paddingBottom: 6 },
  qItem: { alignItems: 'center', gap: 5, minWidth: 56 },
  qBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F9C45A',
    borderWidth: 1.5,
    borderColor: '#f0e5b0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qLabel: { fontSize: 9, color: '#444', fontWeight: '600', textAlign: 'center', lineHeight: 12 },

  /* Leaderboard */
  lbWrap: { gap: 8 },
  lbTopRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  lbTopMedal: { fontSize: 26, width: 30 },
  lbTopAvatar: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  lbTopAvatarText: { fontSize: 16, fontWeight: '900', color: '#fff' },
  lbTopName: { fontSize: 13, fontWeight: '900', color: '#111' },
  lbTopSub: { fontSize: 10, color: '#666', marginTop: 1 },
  lbTopScoreWrap: { alignItems: 'flex-end' },
  lbTopScore: { fontSize: 18, fontWeight: '900' },
  lbTopPts: { fontSize: 9, fontWeight: '700', marginTop: -2 },
  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  lbRankBadge: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  lbRankNum: { fontSize: 11, fontWeight: '900', color: '#555' },
  lbAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  lbAvatarText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  lbName: { fontSize: 12, fontWeight: '800', color: '#111' },
  lbSub: { fontSize: 10, color: '#888', marginTop: 1 },
  lbScore: { fontSize: 13, fontWeight: '900', color: '#92400E' },
  lbEmpty: {
    backgroundColor: '#fff', borderRadius: 18, paddingVertical: 32,
    alignItems: 'center', borderWidth: 1, borderColor: '#f0f0f0',
  },
  lbEmptyTitle: { fontSize: 14, fontWeight: '900', color: '#111', marginBottom: 4 },
  lbEmptyText: { fontSize: 11, color: '#999', textAlign: 'center', paddingHorizontal: 20 },

  /* Progress Modal */
  pmBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  pmSheet: {
    backgroundColor: '#FFF8E8', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 30, maxHeight: '70%',
  },
  pmGrip: { width: 40, height: 4, borderRadius: 4, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 14 },
  pmTitle: { fontSize: 18, fontWeight: '900', color: '#111', textAlign: 'center', marginBottom: 4 },
  pmSub: { fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 14 },
  pmEmpty: { paddingVertical: 30, alignItems: 'center' },
  pmEmptyText: { fontSize: 12, color: '#999', textAlign: 'center' },
  pmList: { maxHeight: 300 },
  pmItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#f0f0f0',
  },
  pmItemNum: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#F6C228',
    alignItems: 'center', justifyContent: 'center',
  },
  pmItemNumText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  pmItemText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#111' },
  pmItemSub: { fontSize: 10, color: '#888', marginTop: 1 },
  pmItemCheck: { fontSize: 14, fontWeight: '900', color: '#2E7D32' },
  pmCloseBtn: { backgroundColor: '#111', borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 10 },
  pmCloseBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  /* Footer */
  footerWrap: {
    backgroundColor: '#fff',
    marginBottom: 0,
    overflow: 'hidden',
  },
  footerImg: {
    width: width,
    height: (width * 529) / 1504,
    resizeMode: 'stretch',
    marginBottom: 0,
  },
});

export default Home;
