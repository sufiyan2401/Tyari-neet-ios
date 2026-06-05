import React from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  source: { uri: string } | { html: string };
  style?: any;
  debugLabel?: string;
  enableDebugLogs?: boolean;
  /**
   * Best-effort content protection for sensitive pages:
   * - Disables screenshots/screen recording at the screen level (see `useContentProtection`).
   * - Disables basic copy/select/context menu inside the WebView via injected JS.
   * - Blocks obvious download/navigation attempts.
   */
  protectedContent?: boolean;
};

const shouldBlockNavigation = (url: string, sourceUrl?: string): boolean => {
  const lower = String(url || '').toLowerCase();
  const clean = lower.split('#')[0].split('?')[0];

  // Allow the initial source URL (even if it's a PDF)
  if (sourceUrl && lower === String(sourceUrl).toLowerCase()) return false;

  // Block common file downloads (except the source itself).
  const blockedExts = [
    '.zip',
    '.rar',
    '.7z',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
  ];
  if (blockedExts.some((ext) => clean.endsWith(ext))) return true;

  // Heuristic for explicit download intent.
  if (lower.includes('download=')) return true;

  return false;
};

const isTopFrameRequest = (req: any): boolean => {
  // iOS provides `isTopFrame` and `mainDocumentURL`. Android provides `isTopFrame`.
  if (typeof req?.isTopFrame === 'boolean') return req.isTopFrame;

  const url = String(req?.url || '');
  const mainDocumentURL = String(req?.mainDocumentURL || '');
  if (mainDocumentURL) return mainDocumentURL === url;

  // If we can't tell, assume top-frame to keep protection behavior.
  return true;
};

const PROTECT_JS = `
(function () {
  try {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '*{ -webkit-user-select:none !important; user-select:none !important; -webkit-touch-callout:none !important; } img{ pointer-events:none !important; -webkit-user-drag:none !important; } @media print{ body{display:none !important;} } [aria-label="Enter fullscreen"],[aria-label="Exit fullscreen"],[aria-label="Fullscreen"],button[class*="fullscreen"],button[class*="Fullscreen"],.fullscreen-button,.fs-button,[data-testid="fullscreen-button"]{ display:none !important; visibility:hidden !important; } ::-webkit-media-controls-fullscreen-button{ display:none !important; }';
    document.documentElement.appendChild(style);

    var events = ['contextmenu','copy','cut','paste','dragstart','selectstart','beforeprint'];
    events.forEach(function(evt){
      document.addEventListener(evt, function(e){ e.preventDefault(); e.stopPropagation(); return false; }, { capture: true });
    });

    // Block long press on images
    document.addEventListener('touchstart', function(e){
      if(e.target && e.target.tagName === 'IMG') { e.target.style.pointerEvents='none'; }
    }, { capture: true, passive: false });

    // Block text selection via touch
    document.addEventListener('selectionchange', function(){
      try { window.getSelection().removeAllRanges(); } catch(x){}
    });

    // Disable developer tools
    document.addEventListener('keydown', function(e){
      if(e.key==='F12'||(e.ctrlKey&&e.shiftKey&&(e.key==='I'||e.key==='J'||e.key==='C'))||(e.ctrlKey&&e.key==='u')){e.preventDefault();}
    }, { capture: true });

    // Hide fullscreen buttons (Canva etc)
    setInterval(function(){
      try{
        var btns = document.querySelectorAll('[aria-label*="fullscreen"],[aria-label*="Fullscreen"],button[class*="fullscreen"],button[class*="Fullscreen"]');
        btns.forEach(function(b){ b.style.display='none'; });
      }catch(x){}
    }, 1000);
  } catch (e) {}
  true;
})();`;

const DEBUG_WEBVIEW_JS = `
(function () {
  try {
    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          payload: payload || {},
          href: String(window.location && window.location.href || '')
        }));
      }
    }

    window.addEventListener('error', function (event) {
      try {
        var target = event && event.target ? event.target : null;
        if (target && target.tagName === 'IMG') {
          post('img_error', {
            src: String(target.currentSrc || target.src || ''),
            alt: String(target.alt || '')
          });
        }
      } catch (_) {}
    }, true);
  } catch (_) {}
  true;
})();`;

const buildInjectedJavaScript = (useProtection: boolean, useDebug: boolean): string | undefined => {
  const scripts: string[] = [];
  if (useProtection) scripts.push(PROTECT_JS);
  if (useDebug) scripts.push(DEBUG_WEBVIEW_JS);
  if (scripts.length === 0) return undefined;
  return scripts.join('\n');
};

export default function PlatformWebView({
  source,
  style,
  protectedContent,
  debugLabel,
  enableDebugLogs,
}: Props) {
  const debugEnabled = Boolean(enableDebugLogs);
  const injectedJS = buildInjectedJavaScript(Boolean(protectedContent), debugEnabled);
  const debugPrefix = debugLabel ? `[PlatformWebView:${debugLabel}]` : '[PlatformWebView]';
  const sourceUrl = 'uri' in source ? source.uri : undefined;

  if (Platform.OS === 'web') {
    // For web, render an iframe for uri sources, or simple HTML wrapper for html
    if ('uri' in source) {
      return (
        <iframe
          src={source.uri}
          style={{ width: '100%', height: '100%', border: 'none', ...(style || {}) }}
          title="webview"
        />
      );
    }

    // html fallback
    return (
      <View style={[styles.webFallback, style]}>
        <Text>HTML content not supported in web fallback.</Text>
      </View>
    );
  }

  try {
    const isCanvaUri = 'uri' in source && /canva\.com/i.test(source.uri);
    const canvaCompatibleUserAgent =
      Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    // Lazy require so web doesn't import native module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require('react-native-webview');

    return (
      <WebView
        source={source as any}
        style={style}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={false}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#F6C228', borderTopColor: 'transparent' }} />
            <Text style={{ marginTop: 10, fontSize: 12, color: '#999' }}>Loading...</Text>
          </View>
        )}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        userAgent={isCanvaUri ? canvaCompatibleUserAgent : undefined}
        scalesPageToFit={true}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        injectedJavaScript={injectedJS}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        textZoom={100}
        decelerationRate="fast"
        overScrollMode="never"
        onLoadStart={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadStart]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onLoadEnd={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadEnd]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onError={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadError]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
            description: event?.nativeEvent?.description || 'unknown',
          });
        }}
        onHttpError={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[HttpError]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
            statusCode: event?.nativeEvent?.statusCode,
            description: event?.nativeEvent?.description || 'unknown',
          });
        }}
        onMessage={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          const raw = event?.nativeEvent?.data;
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            console.log(`${debugPrefix}[Message]`, parsed);
          } catch {
            console.log(`${debugPrefix}[Message]`, raw);
          }
        }}
        onFileDownload={protectedContent ? () => Alert.alert('Download blocked', 'Downloads are disabled.') : undefined}
        onShouldStartLoadWithRequest={
          protectedContent
            ? (req: any) => {
                const url = String(req?.url || '');
                if (debugEnabled && __DEV__) {
                  console.log(`${debugPrefix}[Request]`, {
                    url,
                    isTopFrame: isTopFrameRequest(req),
                  });
                }
                // Important: Allow subresource loads (images/scripts) so embedded lesson
                // pages (e.g. Canva) don't show broken placeholders. Only gate top-frame
                // navigations / downloads.
                if (!isTopFrameRequest(req)) return true;
                if (shouldBlockNavigation(url, sourceUrl)) {
                  Alert.alert('Blocked', 'Downloads are disabled.');
                  return false;
                }
                return true;
              }
            : undefined
        }
      />
    );
  } catch (e) {
    return (
      <View style={[styles.webFallback, style]}>
        <Text>WebView native module is not installed or available.</Text>
        {'uri' in source && (
          <Text style={styles.link} onPress={() => Linking.openURL(source.uri)}>
            Open in browser
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  webFallback: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  link: { marginTop: 8, color: '#0066cc' },
});
