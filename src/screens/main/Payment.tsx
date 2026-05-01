import { useAuth } from '@/contexts/AuthContext';
import { useCreateAppleIapSubscription } from '@/hooks/api/iap';
import {
  initiateRazorpayPayment,
  useCreateOrder,
  useCreateSubscription,
} from '@/hooks/api/payment';
import { useSendLogReport } from '@/hooks/api/log';
import { useGetProfile } from '@/hooks/api/user';
import {
  fetchAppleSubscriptionProducts,
  formatAppleSubscriptionPeriod,
  isIapAvailable,
  openAppleManageSubscriptions,
  purchaseAppleProduct,
  restoreAppleReceipt,
  type TAppleIapProduct,
} from '@/libs/iap';
import { TPlan } from '@/types/Plan';
import { getPlanAppleProductId } from '@/utils/appleIap';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';

type PaymentScreenProps = {
  navigation: any;
  route?: {
    params?: {
      plan?: TPlan;
    };
  };
};

export const PaymentScreen = ({ navigation, route }: PaymentScreenProps) => {
  const plan = route?.params?.plan;

  if (!plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ color: '#B91C1C', fontSize: 14, lineHeight: 18 }}>
            Plan details not found. Please go back and select a plan again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Web: payments are intentionally disabled (mobile-only: iOS IAP + Android Razorpay).
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ color: '#1F2937', fontSize: 14, lineHeight: 18 }}>
            Payments are not available on web. Please use the iOS or Android app to purchase a
            plan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { setUser, signOut } = useAuth();
  const { refetch: fetchProfile } = useGetProfile({ enabled: false });
  const { mutateAsync: createOrderAsync, isPending: isCreatingOrder } = useCreateOrder();
  const {
    mutateAsync: createRazorpaySubscriptionAsync,
    isPending: isCreatingRazorpaySubscription,
  } = useCreateSubscription();
  const { mutateAsync: createAppleSubscriptionAsync, isPending: isCreatingAppleSubscription } =
    useCreateAppleIapSubscription();
  const sendLogReport = useSendLogReport();

  const appleProductId = getPlanAppleProductId(plan);

  const [isPurchasing, setIsPurchasing] = React.useState(false);
  const [isRestoring, setIsRestoring] = React.useState(false);

  const [storeProduct, setStoreProduct] = React.useState<TAppleIapProduct | null>(null);
  const [isLoadingStoreProduct, setIsLoadingStoreProduct] = React.useState(false);
  const [storeProductError, setStoreProductError] = React.useState<string | null>(null);

  const iapReady = Platform.OS === 'ios' && isIapAvailable();
    const orderOptions = {
    description: 'Credits towards consultation',
    image: 'https://i.imgur.com/3g7nmJC.jpg',
    currency: 'INR',
    key: 'rzp_test_Skbk3DnbPc9I6f',
    amount: '10000',
    name: 'Acme Corp',
    order_id: 'order_SkbtFtFcKdKdcV',//Replace this with an order_id created using Orders API.
    prefill: {
      email: 'gaurav.kumar@example.com',
      contact: '+919876543210',
      name: 'Gaurav Kumar'
    },
    theme: {color: '#53a20e'}
  }
      // const order = {
      //     id: 'order_SkbtFtFcKdKdcV',
      //     amount: 10000,
      //     currency: 'INR',
      //     notes: {
      //       email: 'test@example.com',
      //       name: 'Test User',
      //     },
      //   };
  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (Platform.OS !== 'ios') return;
      if (!iapReady) return;
      if (!appleProductId) return;

      setIsLoadingStoreProduct(true);
      setStoreProductError(null);

      try {
        const products = await fetchAppleSubscriptionProducts([appleProductId]);
        const found = products.find((p) => p.id === appleProductId) ?? products[0] ?? null;
        if (!cancelled) setStoreProduct(found);
      } catch (e: any) {
        const message = String(e?.message || e || 'Failed to load App Store subscription details.');
        if (!cancelled) {
          setStoreProduct(null);
          setStoreProductError(message);
        }
      } finally {
        if (!cancelled) setIsLoadingStoreProduct(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [iapReady, appleProductId]);

  const refreshAuthUser = async () => {
    try {
      const profileResult = await fetchProfile();
      if (profileResult.data?.data) {
        setUser(profileResult.data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const alertDevBuildRequired = () => {
    Alert.alert(
      'Development Build Required',
      'In-app purchases require a development build.\n\n' +
      'Expo Go does not support native IAP modules.\n\n' +
      'To enable IAP:\n' +
      '1. Run: eas build --profile development --platform ios\n' +
      '2. Install the build on your iPhone\n' +
      '3. Run: npx expo start --dev-client'
    );
  };

  const handlePayment = async () => {
    if (Platform.OS === 'android') {
      setIsPurchasing(true);

      try {
        const orderRes = await createOrderAsync(plan.id);
        // const order = {
        //   id: 'order_SkbtFtFcKdKdcV',
        //   amount: 10000,
        //   currency: 'INR',
        //   notes: {
        //     email: 'test@example.com',
        //     name: 'Test User',
        //   },
        // };
        const order = orderRes?.data;
        if (!order) {
          throw new Error('Unable to create order. Please try again.');
        }
        const payment = await initiateRazorpayPayment({ order, plan });

        await createRazorpaySubscriptionAsync({
          planId: plan.id,
          orderId: payment.orderId,
          paymentId: payment.paymentId,
          signature: payment.signature,
        });

        await refreshAuthUser();

        navigation.navigate('SubscriptionMessage', {
          success: true,
          plan,
        });
      } catch (error: any) {
        console.error('Payment error:', error);

        try {
          await sendLogReport.mutateAsync({
            error: String(error?.message || error || 'Payment failed'),
          });
        } catch {
          // noop
        }

        const statusCode = error?.response?.status || error?.status;
        if (statusCode === 401) {
          await signOut();
          Alert.alert(
            'Session Expired',
            'Please log in again to continue.',
            [{ text: 'OK' }]
          );
          return;
        }

        const message = String(error?.message || 'Payment failed. Please try again.');
        Alert.alert('Payment Error', message, [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('SubscriptionMessage', {
                success: false,
                plan,
              }),
          },
          {
            text: 'Back',
            onPress: () => navigation.goBack(),
          },
        ]);
      } finally {
        setIsPurchasing(false);
      }

      return;
    }

    if (Platform.OS !== 'ios') {
      Alert.alert('Not Supported', 'Payments are only available on iOS and Android.');
      return;
    }

    if (!iapReady) {
      alertDevBuildRequired();
      return;
    }

    if (!appleProductId) {
      Alert.alert(
        'Plan Not Available',
        'This plan is not configured for Apple In-App Purchase. Please contact support.'
      );
      return;
    }

    if (!storeProduct) {
      Alert.alert(
        'Price Not Available',
        'Could not load subscription price from the App Store. Please try again later.'
      );
      return;
    }

    setIsPurchasing(true);

    try {
      const purchase = await purchaseAppleProduct(appleProductId, storeProduct.type);
      await createAppleSubscriptionAsync({
        planId: plan.id,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        originalTransactionId: purchase.originalTransactionId,
        environmentIOS: purchase.environmentIOS,
        receipt: purchase.receipt,
      });

      await refreshAuthUser();

      navigation.navigate('SubscriptionMessage', {
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error('Payment error:', error);

      try {
        await sendLogReport.mutateAsync({
          error: String(error?.message || error || 'Payment failed'),
        });
      } catch {
        // noop
      }

      if (error?.message?.includes('In-app purchases are not available')) {
        alertDevBuildRequired();
        return;
      }

      const message = String(error?.message || 'Payment failed. Please try again.');
      Alert.alert('Payment Error', message, [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('SubscriptionMessage', {
              success: false,
              plan,
            }),
        },
        {
          text: 'Back',
          onPress: () => navigation.goBack(),
        },
      ]);
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not Supported', 'Restore purchases is only available on iOS.');
      return;
    }

    if (!iapReady) {
      alertDevBuildRequired();
      return;
    }

    if (!appleProductId) {
      Alert.alert(
        'Plan Not Available',
        'This plan is not configured for Apple In-App Purchase. Please contact support.'
      );
      return;
    }

    setIsRestoring(true);

    try {
      const receipt = await restoreAppleReceipt();

      await createAppleSubscriptionAsync({
        planId: plan.id,
        productId: appleProductId,
        transactionId: null,
        receipt,
      });

      await refreshAuthUser();

      navigation.navigate('SubscriptionMessage', {
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error('Restore error:', error);

      try {
        await sendLogReport.mutateAsync({
          error: String(error?.message || error || 'Restore failed'),
        });
      } catch {
        // noop
      }

      Alert.alert('Restore Error', String(error?.message || 'Unable to restore purchases.'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleManageSubscriptions = async () => {
    if (Platform.OS !== 'ios') return;

    if (!iapReady) {
      alertDevBuildRequired();
      return;
    }

    try {
      await openAppleManageSubscriptions();
    } catch (e: any) {
      Alert.alert('Error', String(e?.message || e || 'Unable to open subscription management.'));
    }
  };

  const isProcessing =
    isPurchasing ||
    isRestoring ||
    isCreatingAppleSubscription ||
    isCreatingOrder ||
    isCreatingRazorpaySubscription ||
    isLoadingStoreProduct;

  const isSubscription = Platform.OS === 'ios' && storeProduct?.type === 'subs';

  const INR_SYMBOL = '\u20B9';
  const gstRate = Number.isFinite(Number(plan.gstRate)) ? Number(plan.gstRate) : 18;
  const totalAmountWithGst = Math.round((Number(plan.amount) || 0) * (1 + gstRate / 100));
  const totalAmountText = `${INR_SYMBOL}${new Intl.NumberFormat('en-IN').format(totalAmountWithGst)}`;

  const validUntilText = `Valid until ${new Date(plan.validUntil).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })}`;

  const billingPeriod = formatAppleSubscriptionPeriod(
    storeProduct?.subscriptionPeriodNumberIOS ?? null,
    storeProduct?.subscriptionPeriodUnitIOS ?? null
  );

  const subscriptionTitle = (storeProduct?.title || '').trim() || plan.name;

  const canPay =
    Platform.OS === 'ios'
      ? iapReady && !!appleProductId && !!storeProduct && !storeProductError
      : Platform.OS === 'android'
        ? true
        : false;

  const payButtonLabel =
    Platform.OS === 'ios' ? (isSubscription ? 'Subscribe' : 'Buy') : Platform.OS === 'android' ? 'Pay' : 'Pay';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subscription</Text>
            <Text style={styles.summaryValue}>{subscriptionTitle}</Text>
          </View>

          {Platform.OS === 'ios' && (
            <>
              {isSubscription ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Billing period</Text>
                  <Text style={styles.summaryValue}>{billingPeriod || 'Auto-renewing'}</Text>
                </View>
              ) : (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Access</Text>
                  <Text style={styles.summaryValue}>{validUntilText}</Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>
                  {storeProduct?.displayPrice ||
                    (storeProductError
                      ? 'Unavailable'
                      : isLoadingStoreProduct
                        ? 'Loading...'
                        : '--')}
                </Text>
              </View>

              {!!storeProductError && <Text style={styles.inlineErrorText}>{storeProductError}</Text>}

              {!appleProductId && (
                <Text style={styles.inlineErrorText}>
                  This plan is not configured for Apple IAP. Please contact support.
                </Text>
              )}

              {!iapReady && (
                <Text style={styles.inlineErrorText}>
                  In-app purchases require a development build (not Expo Go).
                </Text>
              )}
            </>
          )}

          {Platform.OS === 'android' && (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Access</Text>
                <Text style={styles.summaryValue}>{validUntilText}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Price</Text>
                <Text style={styles.summaryValue}>{`${totalAmountText} (incl. ${gstRate}% GST)`}</Text>
              </View>
            </>
          )}

          {Platform.OS !== 'ios' && Platform.OS !== 'android' && (
            <Text style={styles.inlineErrorText}>Payments are only available on iOS and Android.</Text>
          )}
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureTitle}>
              {isSubscription ? 'Auto-Renewable Subscription' : 'In-App Purchase'}
            </Text>
            <Text style={styles.disclosureText}>
              {isSubscription
                ? 'Payment will be charged to your Apple ID at confirmation of purchase. Subscription automatically renews unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscription in Account Settings.'
                : `Payment will be charged to your Apple ID at confirmation of purchase. This purchase does not automatically renew. ${validUntilText}.`}
            </Text>

            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Privacy')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('TermsAndConditions')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {Platform.OS === 'android' && (
          <View style={styles.disclosureCard}>
            <Text style={styles.disclosureTitle}>One-time Payment</Text>
            <Text style={styles.disclosureText}>
              Payment will be processed securely via Razorpay. This purchase does not automatically
              renew. {validUntilText}.
            </Text>

            <View style={styles.linksRow}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Privacy')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('TermsAndConditions')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Terms of Use</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <TouchableOpacity
          onPress={handlePayment}
          // Allow tap to show helpful alerts even when IAP isn't ready (Expo Go, missing config).
          disabled={isProcessing}
          style={[styles.payButton, (!canPay || isProcessing) && styles.payButtonDisabled]}
        >
          {isProcessing ? (
            <View style={styles.payButtonContent}>
              <ActivityIndicator color="white" />
              <Text style={styles.payButtonText}>Processing...</Text>
            </View>
          ) : (
            <Text style={styles.payButtonText}>{payButtonLabel}</Text>
          )}
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity
              onPress={handleRestore}
              // Let users tap to see dev-build guidance even if iapReady is false (Expo Go).
              disabled={isProcessing}
              style={[styles.secondaryButton, (isProcessing || !iapReady) && styles.secondaryDisabled]}
            >
              <Text style={styles.secondaryButtonText}>Restore Purchases</Text>
            </TouchableOpacity>

            {isSubscription && (
              <TouchableOpacity
                onPress={handleManageSubscriptions}
                disabled={isProcessing}
                style={[
                  styles.secondaryButton,
                  (isProcessing || !iapReady) && styles.secondaryDisabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  inlineErrorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  disclosureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  disclosureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  disclosureText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  linkButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  payButton: {
    backgroundColor: '#F1BB3E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  payButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default PaymentScreen;
