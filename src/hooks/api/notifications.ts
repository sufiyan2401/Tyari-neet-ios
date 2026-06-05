import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type TNotification = {
  id: string;
  title: string;
  message: string;
  icon: string | null;
  type: string | null;
  isGlobal: boolean;
  isRead: boolean;
  createdAt: string;
};

type TNotificationsResponse = {
  data: {
    notifications: TNotification[];
    unreadCount: number;
  };
};

export const useGetNotifications = (enabled = true) =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<TNotificationsResponse>('/api/v1/notifications'),
    enabled: Boolean(enabled),
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

export const useMarkNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.put(`/api/v1/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};
