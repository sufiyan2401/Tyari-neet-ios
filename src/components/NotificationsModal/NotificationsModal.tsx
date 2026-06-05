import { useAuth } from '@/contexts/AuthContext';
import { useGetNotifications, useMarkNotificationRead, TNotification } from '@/hooks/api/notifications';
import { Bell, X } from 'lucide-react-native';
import React from 'react';
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

type Props = {
  visible: boolean;
  onClose: () => void;
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const NotificationsModal = ({ visible, onClose }: Props) => {
  const { isGuest } = useAuth();
  const { data, isLoading } = useGetNotifications(!isGuest && visible);
  const { mutate: markRead } = useMarkNotificationRead();

  const notifications: TNotification[] = (data as any)?.data?.notifications ?? [];
  const unreadCount: number = (data as any)?.data?.unreadCount ?? 0;

  const handlePress = (n: TNotification) => {
    if (!n.isRead) {
      markRead(n.id);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheet}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Bell size={20} color="#111" />
                  <Text style={styles.title}>Notifications</Text>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.list}
                contentContainerStyle={{ paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
              >
                {isLoading ? (
                  <View style={styles.empty}>
                    <ActivityIndicator size="small" color="#F5A623" />
                  </View>
                ) : isGuest ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyText}>Sign in to see notifications</Text>
                  </View>
                ) : notifications.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={{ fontSize: 36, marginBottom: 8 }}>🔔</Text>
                    <Text style={styles.emptyTitle}>No notifications yet</Text>
                    <Text style={styles.emptyText}>Notifications from admin will appear here</Text>
                  </View>
                ) : (
                  notifications.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[styles.item, !n.isRead && styles.itemUnread]}
                      activeOpacity={0.8}
                      onPress={() => handlePress(n)}
                    >
                      <View style={styles.iconWrap}>
                        <Text style={{ fontSize: 22 }}>{n.icon || '🔔'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.itemTopRow}>
                          <Text style={styles.itemTitle} numberOfLines={1}>{n.title}</Text>
                          {!n.isRead && <View style={styles.dot} />}
                        </View>
                        <Text style={styles.itemMsg} numberOfLines={3}>{n.message}</Text>
                        <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#111' },
  badge: {
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f3f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingTop: 10 },
  item: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#fafafa',
  },
  itemUnread: { backgroundColor: '#FFF8E1' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#111', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#92400E' },
  itemMsg: { fontSize: 12, color: '#555', lineHeight: 16, marginBottom: 4 },
  itemTime: { fontSize: 10, color: '#999', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 4 },
  emptyText: { fontSize: 12, color: '#999' },
});

export default NotificationsModal;
