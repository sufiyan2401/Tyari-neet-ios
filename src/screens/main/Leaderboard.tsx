import { useGetLeaderboard, TLeaderboardEntry } from '@/hooks/api/leaderboard';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type Period = 'daily' | 'weekly' | 'monthly';

const TABS: { id: Period; label: string }[] = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const MEDAL_DATA = [
  { medal: '🥇', bg: ['#FFFDE7', '#FFF9C4'] as [string, string], border: '#FFD700', scoreColor: '#B8860B', rankBg: '#FFD700' },
  { medal: '🥈', bg: ['#FAFAFA', '#F5F5F5'] as [string, string], border: '#C0C0C0', scoreColor: '#607D8B', rankBg: '#B0BEC5' },
  { medal: '🥉', bg: ['#FFF8F0', '#FFE0CC'] as [string, string], border: '#CD7F32', scoreColor: '#8B4513', rankBg: '#CD7F32' },
];

const AVATAR_COLORS = ['#F6C228', '#4CAF50', '#2196F3', '#E91E63', '#9C27B0', '#FF5722', '#00BCD4', '#8BC34A'];

type Props = { navigation: any };

export const Leaderboard = ({ navigation }: Props) => {
  const [period, setPeriod] = useState<Period>('weekly');
  const { data, isLoading } = useGetLeaderboard(period === 'monthly' ? 'weekly' : period, 50);

  const entries: TLeaderboardEntry[] = (data as any)?.data ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <LinearGradient
      colors={['#F5A623', '#F9C45A', '#FCDA3E']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <ChevronLeft size={22} color="#111" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>🏆 Ranking Board</Text>
            <Text style={styles.headerSub}>Top 50 students this {period}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Period Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, period === tab.id && styles.tabActive]}
              onPress={() => setPeriod(tab.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, period === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1, backgroundColor: '#FFF8E8' }}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#F5A623" />
            </View>
          ) : entries.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={{ fontSize: 56, marginBottom: 12 }}>🎯</Text>
              <Text style={styles.emptyTitle}>No rankings yet!</Text>
              <Text style={styles.emptySub}>
                Take a test to appear on the {period} leaderboard
              </Text>
            </View>
          ) : (
            <>
              {/* Podium — Top 3 */}
              {top3.length > 0 && (
                <View style={styles.podiumSection}>
                  <Text style={styles.podiumLabel}>TOP PERFORMERS</Text>
                  {top3.map((entry, i) => {
                    const md = MEDAL_DATA[i];
                    return (
                      <LinearGradient
                        key={entry.userId}
                        colors={md.bg}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.podiumRow, { borderColor: md.border }]}
                      >
                        {/* Rank badge */}
                        <View style={[styles.podiumRankBadge, { backgroundColor: md.rankBg }]}>
                          <Text style={styles.podiumMedal}>{md.medal}</Text>
                        </View>
                        {/* Avatar */}
                        <View style={[styles.podiumAvatar, { backgroundColor: AVATAR_COLORS[i] }]}>
                          <Text style={styles.podiumAvatarText}>
                            {(entry.User?.name || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {/* Info */}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.podiumName} numberOfLines={1}>
                            {entry.User?.name || 'Student'}
                          </Text>
                          <View style={styles.podiumMeta}>
                            <Text style={styles.podiumMetaText}>📝 {entry.testsPlayed} tests</Text>
                            <Text style={styles.podiumMetaDot}>·</Text>
                            <Text style={styles.podiumMetaText}>
                              {Math.round(entry.avgPercentage ?? 0)}% avg
                            </Text>
                          </View>
                        </View>
                        {/* Score */}
                        <View style={styles.podiumScoreWrap}>
                          <Text style={[styles.podiumScore, { color: md.scoreColor }]}>
                            {Math.round(entry.totalScore ?? 0)}
                          </Text>
                          <Text style={[styles.podiumPts, { color: md.scoreColor }]}>pts</Text>
                        </View>
                      </LinearGradient>
                    );
                  })}
                </View>
              )}

              {/* Rest — #4 to #50 */}
              {rest.length > 0 && (
                <View style={styles.restSection}>
                  <Text style={styles.restLabel}>OTHER RANKINGS</Text>
                  <View style={styles.restCard}>
                    {rest.map((entry, i) => (
                      <View
                        key={entry.userId}
                        style={[styles.restRow, i < rest.length - 1 && styles.restRowBorder]}
                      >
                        <View style={styles.restRankBadge}>
                          <Text style={styles.restRankNum}>#{i + 4}</Text>
                        </View>
                        <View style={[styles.restAvatar, { backgroundColor: AVATAR_COLORS[(i + 3) % AVATAR_COLORS.length] }]}>
                          <Text style={styles.restAvatarText}>
                            {(entry.User?.name || 'U').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.restName} numberOfLines={1}>
                            {entry.User?.name || 'Student'}
                          </Text>
                          <Text style={styles.restSub}>
                            {entry.testsPlayed} tests · {Math.round(entry.avgPercentage ?? 0)}% avg
                          </Text>
                        </View>
                        <View style={styles.restScoreWrap}>
                          <Text style={styles.restScore}>{Math.round(entry.totalScore ?? 0)}</Text>
                          <Text style={styles.restPts}>pts</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#111' },
  headerSub: { fontSize: 11, color: '#555', marginTop: 1 },

  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 0,
    backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 14, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 11, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#92400E' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#92400E' },
  tabTextActive: { color: '#fff' },

  scroll: { padding: 16, paddingBottom: 120 },

  loadingWrap: { paddingVertical: 80, alignItems: 'center' },
  emptyWrap: { paddingVertical: 80, alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: '#111', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 19 },

  /* Podium */
  podiumSection: { marginBottom: 16 },
  podiumLabel: {
    fontSize: 10, fontWeight: '800', color: '#92400E',
    letterSpacing: 1.2, marginBottom: 10,
  },
  podiumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 14, marginBottom: 8,
    borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  podiumRankBadge: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  podiumMedal: { fontSize: 22 },
  podiumAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 2,
  },
  podiumAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  podiumName: { fontSize: 14, fontWeight: '900', color: '#111', marginBottom: 3 },
  podiumMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  podiumMetaText: { fontSize: 10.5, color: '#555' },
  podiumMetaDot: { fontSize: 10, color: '#bbb' },
  podiumScoreWrap: { alignItems: 'flex-end' },
  podiumScore: { fontSize: 22, fontWeight: '900' },
  podiumPts: { fontSize: 10, fontWeight: '700', marginTop: -3 },

  /* Rest */
  restSection: { marginBottom: 16 },
  restLabel: {
    fontSize: 10, fontWeight: '800', color: '#888',
    letterSpacing: 1.2, marginBottom: 10,
  },
  restCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f0f0f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  restRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
  },
  restRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  restRankBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  restRankNum: { fontSize: 11, fontWeight: '900', color: '#555' },
  restAvatar: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  restAvatarText: { fontSize: 14, fontWeight: '900', color: '#fff' },
  restName: { fontSize: 12, fontWeight: '800', color: '#111' },
  restSub: { fontSize: 10, color: '#888', marginTop: 1 },
  restScoreWrap: { alignItems: 'flex-end' },
  restScore: { fontSize: 14, fontWeight: '900', color: '#92400E' },
  restPts: { fontSize: 9, fontWeight: '700', color: '#92400E', marginTop: -1 },
});

export default Leaderboard;
