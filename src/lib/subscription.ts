import type { TSubscription } from '@/types/Subscription';

export const isPaidSubscriptionActive = (
  subscription: TSubscription | null | undefined,
  nowMs: number = Date.now()
): boolean => {
  if (!subscription) return false;

  const paymentStatus = String(subscription.paymentStatus || '').toUpperCase();
  if (paymentStatus && paymentStatus !== 'SUCCESS') return false;

  const endMs = subscription.endDate ? Date.parse(subscription.endDate) : NaN;
  if (!Number.isFinite(endMs)) return false;
  if (endMs <= nowMs) return false;

  return true;
};

export const isPremiumServiceType = (serviceType: unknown): boolean => {
  const normalized = String(serviceType || '')
    .trim()
    .toUpperCase();

  if (!normalized) return false;
  if (normalized === 'FREE') return false;

  return (
    normalized === 'PREMIUM' ||
    normalized === 'PAID' ||
    normalized === 'PRO' ||
    normalized.includes('PREMIUM')
  );
};
