import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type TLeaderboardEntry = {
  rank: number;
  userId: string;
  totalScore: number;
  totalXP: number;
  testsPlayed: number;
  avgPercentage: number;
  User: {
    id: string;
    name: string;
    email: string;
    profilePicture: string | null;
  };
};

export const useGetLeaderboard = (period: 'weekly' | 'daily' = 'weekly', limit = 50) =>
  useQuery({
    queryKey: ['leaderboard', period, limit],
    queryFn: () => api.get<{ data: TLeaderboardEntry[] }>('/api/v1/leaderboard', { params: { period, limit } }),
    staleTime: 5 * 60 * 1000,
  });

export type TMyScore = {
  id: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skipped: number;
  score: number;
  percentage: number;
  timeTaken: number | null;
  xp: number;
  testType: string;
  createdAt: string;
  Subject?: { id: string; name: string } | null;
  Chapter?: { id: string; name: string } | null;
};

export const useGetMyScores = (enabled = true) =>
  useQuery({
    queryKey: ['my-scores'],
    queryFn: () => api.get<{ data: TMyScore[] }>('/api/v1/leaderboard/my'),
    enabled: Boolean(enabled),
    staleTime: 2 * 60 * 1000,
  });
