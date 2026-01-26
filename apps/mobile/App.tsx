import { useRef, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    RefreshControl,
    ScrollView,
    useColorScheme,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { CONFIG } from './config';

const WEB_URL = CONFIG.WEB_URL;

// 다크/라이트 테마 색상
const THEMES = {
    light: {
        background: '#f5f5f5',
        headerBg: '#ffffff',
        headerText: '#1a1a1a',
        border: '#e0e0e0',
        accent: '#06b6d4',
    },
    dark: {
        background: '#0a0a0f',
        headerBg: '#12121a',
        headerText: '#ffffff',
        border: '#1e1e2e',
        accent: '#06b6d4',
    },
};

// 탭 정의
const TABS = [
    { key: 'hot', label: '주도주', path: '/?tab=hot' },
    { key: 'stocks', label: '테마주', path: '/?tab=stocks' },
    { key: 'sectors', label: '주도섹터', path: '/?tab=sectors' },
    { key: 'calendar', label: '캘린더', path: '/?tab=calendar' },
];

export default function App() {
    const colorScheme = useColorScheme();
    const theme = THEMES[colorScheme === 'dark' ? 'dark' : 'light'];
    const webViewRef = useRef<WebView>(null);
    const [activeTab, setActiveTab] = useState('hot');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // 탭 변경
    const handleTabChange = useCallback((tabKey: string, path: string) => {
        setActiveTab(tabKey);
        webViewRef.current?.injectJavaScript(`
            window.location.href = '${path}';
            true;
        `);
    }, []);

    // 새로고침
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        webViewRef.current?.reload();
        setTimeout(() => setRefreshing(false), 1000);
    }, []);

    // WebView에서 URL 변경 감지
    const handleNavigationStateChange = useCallback((navState: any) => {
        const url = navState.url;
        // URL에서 현재 탭 추출
        const tabMatch = url.match(/[?&]tab=(\w+)/);
        if (tabMatch) {
            setActiveTab(tabMatch[1]);
        }
    }, []);

    return (
        <SafeAreaProvider>
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
                <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

                {/* 네이티브 헤더 */}
                <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                    <View style={styles.headerTitle}>
                        <View style={[styles.logo, { backgroundColor: theme.accent }]}>
                            <Text style={styles.logoText}>T</Text>
                        </View>
                        <Text style={[styles.title, { color: theme.headerText }]}>TEBURN</Text>
                        <View style={[styles.badge, { backgroundColor: `${theme.accent}20` }]}>
                            <Text style={[styles.badgeText, { color: theme.accent }]}>BETA</Text>
                        </View>
                    </View>
                </View>

                {/* 네이티브 탭 바 */}
                <View style={[styles.tabBar, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[
                                styles.tab,
                                activeTab === tab.key && styles.activeTab,
                            ]}
                            onPress={() => handleTabChange(tab.key, tab.path)}
                        >
                            <Text
                                style={[
                                    styles.tabText,
                                    { color: activeTab === tab.key ? theme.accent : theme.headerText + '80' },
                                ]}
                            >
                                {tab.label}
                            </Text>
                            {activeTab === tab.key && (
                                <View style={[styles.tabIndicator, { backgroundColor: theme.accent }]} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* WebView */}
                <View style={styles.webViewContainer}>
                    {isLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={theme.accent} />
                            <Text style={[styles.loadingText, { color: theme.headerText }]}>로딩 중...</Text>
                        </View>
                    )}
                    <WebView
                        ref={webViewRef}
                        source={{ uri: `${WEB_URL}/?tab=${activeTab}` }}
                        style={styles.webView}
                        onLoadStart={() => setIsLoading(true)}
                        onLoadEnd={() => setIsLoading(false)}
                        onNavigationStateChange={handleNavigationStateChange}
                        // 성능 최적화
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={false}
                        // 캐시 설정
                        cacheEnabled={true}
                        // iOS 설정
                        allowsBackForwardNavigationGestures={true}
                        // Pull to refresh (iOS)
                        pullToRefreshEnabled={true}
                        // 앱 내 링크 처리
                        onShouldStartLoadWithRequest={(request) => {
                            // 외부 링크는 브라우저에서 열기
                            if (!request.url.startsWith(WEB_URL) && !request.url.startsWith('about:')) {
                                // Linking.openURL(request.url);
                                return false;
                            }
                            return true;
                        }}
                        // 웹에 테마 정보 전달
                        injectedJavaScript={`
                            // 앱에서 열렸음을 알림
                            window.isNativeApp = true;
                            window.nativeColorScheme = '${colorScheme}';

                            // 웹의 헤더와 탭을 숨김 (네이티브로 대체)
                            const style = document.createElement('style');
                            style.textContent = \`
                                header { display: none !important; }
                                .page-header { display: none !important; }
                                .tab-navigation { display: none !important; }
                                [class*="border-b"][class*="bg-"][class*="sticky"] { display: none !important; }
                                main { padding-top: 0 !important; }
                            \`;
                            document.head.appendChild(style);
                            true;
                        `}
                    />
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    logo: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        position: 'relative',
    },
    activeTab: {},
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: '25%',
        right: '25%',
        height: 2,
        borderRadius: 1,
    },
    webViewContainer: {
        flex: 1,
    },
    webView: {
        flex: 1,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
    },
});
