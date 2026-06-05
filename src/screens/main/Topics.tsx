import { getGuestTopicsByChapterAndSubject } from '@/constants/guestData';
import { useAuth } from '@/contexts/AuthContext';
import { useGetFavorites } from '@/hooks/api/favorites';
import { useGetTopicsByChapterIdAndSubjectId } from '@/hooks/api/topics';
import { useProgress } from '@/hooks/useProgress';
import { isPaidSubscriptionActive, isPremiumServiceType } from '@/lib/subscription';
import { TTopic } from '@/types/Topic';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Lock } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TopicsScreenProps = {
  navigation: any;
  route: {
    params?: {
      chapterId?: string;
      subjectId?: string;
      chapterTitle?: string;
      subjectTitle?: string;
      chapterNumber?: number;
      featureName?: string;
      freeOnly?: boolean;
    };
  };
};

const THUMB_GRADIENTS = [
  ['#FFB74D', '#92400E'],
  ['#66BB6A', '#43A047'],
  ['#42A5F5', '#1976D2'],
  ['#AB47BC', '#6A1B9A'],
];

const THUMB_EMOJIS = ['📘', '⚡', '🔌', '🌐', '🧲', '🧮', '📐', '🧪', '⚗️', '🌿'];

const pickFromId = (id: string, len: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % len;
};

const Topics = ({ navigation, route }: TopicsScreenProps) => {
  const chapterId = route?.params?.chapterId;
  const subjectId = route?.params?.subjectId;
  const chapterTitle = route?.params?.chapterTitle || 'Topics';
  const subjectTitle = route?.params?.subjectTitle;
  const chapterNumber = route?.params?.chapterNumber;
  const featureName = route?.params?.featureName;
  const freeOnly = route?.params?.freeOnly ?? false;

  const { isGuest, user } = useAuth();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  if (!chapterId || !subjectId) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>Missing chapter or subject information</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { data, isLoading, error } = useGetTopicsByChapterIdAndSubjectId(
    { chapterId, subjectId },
    { enabled: !isGuest }
  );
  const { isLoading: favoritesLoading } = useGetFavorites({ enabled: !isGuest });

  const allTopics: TTopic[] = isGuest
    ? getGuestTopicsByChapterAndSubject(chapterId, subjectId)
    : data?.data || [];
  const topicsList: TTopic[] = freeOnly
    ? allTopics.filter((t) => !isPremiumServiceType(t.serviceType))
    : allTopics;

  const { isCompleted, getCompletedCount, setChapterTopics } = useProgress();

  // Save chapter total + topic IDs whenever the topics list changes (so Chapters screen can show real progress).
  useEffect(() => {
    if (topicsList.length > 0) {
      setChapterTopics(chapterId, topicsList.map((t) => t.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, topicsList.length]);

  const completedCount = getCompletedCount(topicsList.map((t) => t.id));
  const progressPct =
    topicsList.length > 0
      ? Math.round((completedCount / topicsList.length) * 100)
      : 0;

  const handleTopicPress = (topic: TTopic) => {
    if (isPremiumServiceType(topic.serviceType)) {
      if (isGuest || !isPaidSubscriptionActive(user?.subscription)) {
        setShowPremiumModal(true);
        return;
      }
    }
    navigation.navigate('TopicContent', { topic, featureName });
  };

  if (!isGuest && (isLoading || favoritesLoading)) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <ActivityIndicator size="large" color="#F4B95F" />
        <Text style={styles.loadingText}>Loading topics...</Text>
      </SafeAreaView>
    );
  }

  if (!isGuest && error) {
    return (
      <SafeAreaView style={styles.centered} edges={['top']}>
        <Text style={styles.errorText}>Unable to load topics</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const numLabel = chapterNumber ? `Ch ${String(chapterNumber).padStart(2, '0')} · ` : '';

  return (
    <LinearGradient colors={['#F5A623', '#F9C45A', '#FCDA3E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.safeArea}>
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      {/* Yellow header */}
      <View style={styles.yellowHeader}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {numLabel}{chapterTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, backgroundColor: '#FFF8E8' }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Banner */}
        {topicsList.length > 0 && (
          <View style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Text style={{ fontSize: 20 }}>📖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {completedCount} of {topicsList.length} topics done
              </Text>
              <Text style={styles.bannerSub}>
                {topicsList.length - completedCount} topics left to finish chapter
              </Text>
            </View>
            <Text style={styles.bannerStat}>{progressPct}%</Text>
          </View>
        )}

        {/* Lessons */}
        {topicsList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No Topics Found</Text>
            <Text style={styles.emptySub}>This chapter doesn't have any topics yet</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {topicsList.map((topic, i) => {
              const gradIdx = pickFromId(topic.id, THUMB_GRADIENTS.length);
              const emojiIdx = pickFromId(topic.id + '-e', THUMB_EMOJIS.length);
              const grad = THUMB_GRADIENTS[gradIdx];
              const isPremium = isPremiumServiceType(topic.serviceType);
              const done = isCompleted(topic.id);

              return (
                <TouchableOpacity
                  key={topic.id}
                  style={styles.lessonCard}
                  activeOpacity={0.85}
                  onPress={() => handleTopicPress(topic)}
                >
                  <View style={styles.lessonNum}>
                    <Text style={styles.lessonNumText}>{String(i + 1).padStart(2, '0')}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.lessonTitle} numberOfLines={2}>
                      Topic {i + 1} · {topic.name}
                    </Text>
                    <View style={styles.lessonMeta}>
                      <Text style={styles.metaText}>⏱ {(emojiIdx + 6)} min</Text>

                      {/* Access tag: FREE or PAID */}
                      <View
                        style={[
                          styles.tag,
                          isPremium ? styles.tagPaid : styles.tagFree,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            isPremium ? styles.tagTextPaid : styles.tagTextFree,
                          ]}
                        >
                          {isPremium ? '🔒 PAID PLAN' : '✓ FREE'}
                        </Text>
                      </View>

                      {/* Completion tag */}
                      {done && (
                        <View style={[styles.tag, styles.tagDone]}>
                          <Text style={[styles.tagText, styles.tagTextDone]}>COMPLETED</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={showPremiumModal}
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPremiumModal(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {isGuest ? 'Sign in required' : "You don't have a premium subscription!"}
                </Text>
                <Text style={styles.modalBody}>
                  {isGuest
                    ? 'Sign in to subscribe and access premium content.'
                    : 'Access premium content with a premium subscription'}
                </Text>
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => {
                    setShowPremiumModal(false);
                    if (isGuest) {
                      navigation.navigate('MainTabs', { screen: 'ProfileTab' });
                    } else {
                      navigation.navigate('Plans');
                    }
                  }}
                >
                  <Text style={styles.upgradeText}>{isGuest ? 'Go to Profile' : 'Upgrade To Pro'}</Text>
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
  centered: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF8E8', paddingHorizontal: 16,
  },
  yellowHeader: { backgroundColor: 'transparent' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },

  scroll: { padding: 16, paddingBottom: 120 },

  banner: {
    backgroundColor: '#FFFBEA',
    borderWidth: 1.5, borderColor: '#FFE082',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  bannerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', color: '#111' },
  bannerSub: { fontSize: 11, color: '#666' },
  bannerStat: { fontSize: 18, fontWeight: '900', color: '#92400E' },

  lessonCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lessonNum: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#FFB74D',
    alignItems: 'center', justifyContent: 'center',
  },
  lessonNumText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  lessonTitle: { fontSize: 13, fontWeight: '800', color: '#111', marginBottom: 3 },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaText: { fontSize: 10.5, color: '#777' },
  tag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  tagDone: { backgroundColor: '#E3F2FD' },
  tagFree: { backgroundColor: '#E8F5E9' },
  tagPaid: { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#92400E' },
  tagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  tagTextDone: { color: '#1565C0' },
  tagTextFree: { color: '#2E7D32' },
  tagTextPaid: { color: '#8B6914' },
  lockBadge: {
    position: 'absolute',
    top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#92400E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#666', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#999' },

  errorText: { fontSize: 16, color: '#EF4444', marginBottom: 12, textAlign: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  retryButton: {
    backgroundColor: '#F4B95F',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalCard: { backgroundColor: '#fff', width: '85%', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalBody: { color: '#6B7280', textAlign: 'center', marginBottom: 16 },
  upgradeButton: { backgroundColor: '#F4B95F', borderRadius: 8, paddingVertical: 12 },
  upgradeText: { textAlign: 'center', fontSize: 16, fontWeight: '600' },
});

export default Topics;
