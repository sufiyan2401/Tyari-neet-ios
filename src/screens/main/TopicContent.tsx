import PlatformWebView from '@/components/PlatformWebView';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/contexts/FeatureContext';
import { useGetTopicById } from '@/hooks/api/topics';
import { useContentProtection } from '@/hooks/useContentProtection';
import { useProgress } from '@/hooks/useProgress';
import { isPaidSubscriptionActive, isPremiumServiceType } from '@/lib/subscription';
import { TTopic } from '@/types/Topic';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TopicHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <View style={topicHeaderStyles.header}>
    <TouchableOpacity onPress={onBack} style={topicHeaderStyles.backBtn} activeOpacity={0.7}>
      <ChevronLeft size={22} color="#111" />
    </TouchableOpacity>
    <Text style={topicHeaderStyles.title} numberOfLines={1}>{title}</Text>
  </View>
);

const topicHeaderStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5A623',
    paddingHorizontal: 18, paddingVertical: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(146,64,14,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '800', color: '#111', flex: 1 },
});

const FEATURE_CONTENT_MAP: Record<string, keyof TTopic> = {
  'Explanation': 'explanationContent',
  'Revision Recall Station': 'revisionContent',
  'Hidden Links': 'hiddenLinksContent',
  'Exercise Revival': 'exerciseRevivalContent',
  'Master Exemplar': 'masterExemplarContent',
  'Previous Year Questions': 'pyqContent',
  'Chapter Check Point': 'chapterCheckpointContent',
};

type TopicContentProps = {
  navigation: any;
  route: {
    params?: {
      topic?: TTopic;
      featureName?: string;
    };
  };
};

export const TopicContent = ({ navigation, route }: TopicContentProps) => {
  const { isGuest, user } = useAuth();
  const { activeFeature, setActiveFeature } = useFeature();
  const topic = route?.params?.topic;
  const featureName = route?.params?.featureName;
  const topicId = topic?.id || '';
  const isPremiumTopic = isPremiumServiceType(topic?.serviceType);
  const hasPremium = isPaidSubscriptionActive(user?.subscription);
  const { markCompleted } = useProgress();

  // Clear the selected feature once user leaves this screen so the next browse
  // (without coming via Home box) starts clean.
  React.useEffect(() => {
    return () => {
      setActiveFeature(null);
    };
  }, [setActiveFeature]);

  // Mark topic as completed once when the user can actually view it.
  React.useEffect(() => {
    if (!topicId) return;
    if (isPremiumTopic && !hasPremium) return;
    markCompleted(topicId, topic?.name);
  }, [topicId, isPremiumTopic, hasPremium, markCompleted, topic?.name]);

  // Protect lesson content from screenshots / screen recordings (best-effort).
  // NOTE: Web cannot be reliably protected, so keep this native-only.
  useContentProtection({ enabled: Platform.OS !== 'web', key: 'topic-content', appSwitcherBlurIntensity: 0.65 });

  const {
    data: topicResponse,
    isLoading: isLoadingTopic,
    error: topicError,
    refetch,
  } = useGetTopicById(topicId, {
    enabled: !isGuest && !!topicId && (!isPremiumTopic || hasPremium),
    retry: false,
  });

  const effectiveTopic = !isGuest ? topicResponse?.data || topic : topic;

  // If user came via a Home feature box, prefer that feature's content slot.
  // Two paths: (a) activeFeature from FeatureContext, (b) legacy featureName route param.
  const FEATURE_TO_FIELD: Record<string, keyof TTopic> = {
    explanation: 'explanationContent' as keyof TTopic,
    revision_recall: 'revisionContent' as keyof TTopic,
    hidden_links: 'hiddenLinksContent' as keyof TTopic,
    exercise_revival: 'exerciseRevivalContent' as keyof TTopic,
    master_exemplar: 'masterExemplarContent' as keyof TTopic,
    pyq: 'pyqContent' as keyof TTopic,
    chapter_checkpoint: 'chapterCheckpointContent' as keyof TTopic,
  };
  const slotField = activeFeature
    ? FEATURE_TO_FIELD[activeFeature]
    : (featureName ? FEATURE_CONTENT_MAP[featureName] : undefined);
  const slotValue = slotField ? String((effectiveTopic as any)?.[slotField] || '').trim() : '';

  // Slot can be either a URL or HTML/rich text. Detect URL.
  const slotIsURL = /^https?:\/\//i.test(slotValue);
  const richContent = slotValue && !slotIsURL ? slotValue : '';
  const hasRichContent = richContent.length > 0;
  const rawURL = (slotIsURL ? slotValue : String(effectiveTopic?.contentURL || '')).trim();
  const isCanvaContent = /canva\.com/i.test(rawURL);
  const isInsecureRemoteUrl = /^http:\/\//i.test(rawURL) && !/^http:\/\/(localhost|127\.0\.0\.1)/i.test(rawURL);
  const secureURL = isInsecureRemoteUrl ? rawURL.replace(/^http:\/\//i, 'https://') : rawURL;
  // Android can't render PDFs in WebView — use server-generated HTML version
  const normalizedURL = /\.pdf(\?|$)/i.test(secureURL) ? secureURL.replace(/\.pdf(\?|$)/i, '/index.html$1') : secureURL;

  // Keep hook execution order stable across all render branches.
  React.useEffect(() => {
    if (!__DEV__) return;
    console.log('[TopicContent][URL]', {
      topicId: effectiveTopic?.id,
      topicName: effectiveTopic?.name,
      platform: Platform.OS,
      originalUrl: rawURL,
      normalizedURL,
      isCanvaContent,
    });
  }, [effectiveTopic?.id, effectiveTopic?.name, isCanvaContent, normalizedURL, rawURL]);

  if (!topic) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF8E8' }} edges={['top']}>
        <TopicHeader title="Error" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center' }}>
            Topic data not found. Please try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isGuest && isPremiumTopic && !hasPremium) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <TopicHeader title={topic?.name || 'Topic'} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
            Premium subscription required
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#6B7280',
              textAlign: 'center',
              marginBottom: 16,
              lineHeight: 20,
            }}
          >
            Subscribe to unlock premium content.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Plans')}
            style={{
              backgroundColor: '#F4B95F',
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // For signed-in users, fetch the topic via the protected endpoint.
  // Backend will reject premium topics if the user has no active subscription.
  if (!isGuest) {
    if (isLoadingTopic) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
          <TopicHeader title={topic?.name || 'Topic'} onBack={() => navigation.goBack()} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#F4B95F" />
            <Text style={{ marginTop: 12, color: '#6B7280' }}>Loading topic...</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (topicError) {
      const message = String((topicError as any)?.userMessage || (topicError as any)?.message || '');
      const isNotSubscribed = message.toLowerCase().includes('not subscribed');

      if (isNotSubscribed) {
        return (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
            <TopicHeader title={topic?.name || 'Topic'} onBack={() => navigation.goBack()} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>
                Premium subscription required
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
                Subscribe to unlock premium content.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Plans')}
                style={{
                  backgroundColor: '#F4B95F',
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: 10,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>View Plans</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        );
      }

      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
          <TopicHeader title={topic?.name || 'Topic'} onBack={() => navigation.goBack()} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center', marginBottom: 12 }}>
              {message || 'Unable to load topic. Please try again.'}
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                paddingHorizontal: 18,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: '#F9FAFB',
              }}
            >
              <Text style={{ fontWeight: '700', color: '#111827' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
  }

  // Rich HTML content from admin — render directly in WebView
  if (hasRichContent) {
    const htmlPage = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>html,body,*{-webkit-user-select:none;-webkit-touch-callout:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.8;color:#1a1a1a;padding:20px;background:#fff;}h1,h2,h3{color:#1a1a1a;margin-top:24px;margin-bottom:8px;}h2{font-size:20px;}h3{font-size:17px;}p{margin:0 0 14px;}ul,ol{padding-left:24px;margin:0 0 14px;}li{margin-bottom:6px;}img{max-width:100%;border-radius:8px;margin:10px 0;-webkit-user-drag:none;pointer-events:none;}strong{font-weight:700;}em{font-style:italic;}u{text-decoration:underline;}</style><script>document.addEventListener('contextmenu',function(e){e.preventDefault();return false;});document.addEventListener('selectstart',function(e){e.preventDefault();return false;});document.addEventListener('copy',function(e){e.preventDefault();return false;});</script></head><body>${richContent}</body></html>`;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <TopicHeader title={effectiveTopic?.name || 'Topic'} onBack={() => navigation.goBack()} />
        <PlatformWebView
          source={{ html: htmlPage }}
          style={{ flex: 1 }}
          protectedContent={true}
          debugLabel={effectiveTopic?.name || 'RichContent'}
          enableDebugLogs={__DEV__}
        />
      </SafeAreaView>
    );
  }

  if (!normalizedURL) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        <TopicHeader title={effectiveTopic?.name || 'Topic'} onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center' }}>
            Content URL is missing for this topic.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const webViewSource = { uri: normalizedURL };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <TopicHeader title={effectiveTopic?.name || 'Topic'} onBack={() => navigation.goBack()} />

      <PlatformWebView
        source={webViewSource}
        style={{ flex: 1 }}
        protectedContent={!isCanvaContent}
        debugLabel={effectiveTopic?.name || 'TopicContent'}
        enableDebugLogs={__DEV__}
      />
    </SafeAreaView>
  );
};

export default TopicContent;
