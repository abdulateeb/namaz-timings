import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { BlurTargetView } from 'expo-blur';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurTargetContext, Glass } from './src/components/Glass';
import { GlassTabBar, type Tab } from './src/components/GlassTabBar';
import { ThemeButton } from './src/components/ThemeButton';
import { planDay } from './src/lib/prayer';
import { useDeviceLocation } from './src/lib/useLocation';
import { useNow } from './src/lib/useNow';
import { QiblaScreen } from './src/screens/QiblaScreen';
import { TimesScreen } from './src/screens/TimesScreen';
import { FONT, THEMES, type Mode, type Theme } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Message({ theme, title, body, action, onAction }: { theme: Theme; title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.centerFill}>
      <Glass variant={theme.glass} style={styles.msg}>
        <Text style={[styles.msgTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.msgBody, { color: theme.sub }]}>{body}</Text>
        {action && (
          <Pressable onPress={onAction} style={({ pressed }) => [styles.msgBtn, pressed && { opacity: 0.8 }]}>
            <Text style={styles.msgBtnText}>{action}</Text>
          </Pressable>
        )}
      </Glass>
    </View>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const system = useColorScheme();
  const [mode, setMode] = useState<Mode>(system === 'light' ? 'light' : 'dark');
  const theme = THEMES[mode];
  const { state, retry, openSettings } = useDeviceLocation();
  const [tab, setTab] = useState<Tab>('times');

  const place = state.status === 'ready' ? state.place : null;
  const minuteKey = Math.floor(now.getTime() / 60000);
  // Recompute the day once a minute, not every second.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (place ? planDay(place.lat, place.lon, now) : null), [place, minuteKey]);

  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(tab === 'qibla' ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [tab, p]);
  const timesStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: -28 * p.value }] }));
  const qiblaStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: 28 * (1 - p.value) }] }));

  const target = useRef<ComponentRef<typeof View>>(null);
  const bottomPad = insets.bottom + 24;

  return (
    <BlurTargetContext.Provider value={target}>
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        <StatusBar style={theme.statusBar} />

        {/* Everything the glass controls float over; Android blurs this view. */}
        <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
          {state.status === 'loading' && (
            <View style={styles.centerFill}>
              <ActivityIndicator color={theme.text} />
            </View>
          )}
          {state.status === 'denied' && (
            <Message
              theme={theme}
              title="Location is off"
              body="Namaz needs your location to work out exact prayer times and the Qibla direction. It never leaves your phone."
              action="Open settings"
              onAction={openSettings}
            />
          )}
          {state.status === 'error' && <Message theme={theme} title="Could not find you" body={state.message} action="Try again" onAction={retry} />}

          {place && plan && (
            <>
              <Animated.View style={[StyleSheet.absoluteFill, timesStyle]} pointerEvents={tab === 'times' ? 'auto' : 'none'}>
                <ScrollView
                  contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: bottomPad }}
                  showsVerticalScrollIndicator={false}
                >
                  <TimesScreen plan={plan} now={now} place={place} theme={theme} />
                </ScrollView>
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 56, paddingBottom: bottomPad }, qiblaStyle]}
                pointerEvents={tab === 'qibla' ? 'auto' : 'none'}
              >
                <QiblaScreen lat={place.lat} lon={place.lon} active={tab === 'qibla'} theme={theme} />
              </Animated.View>
            </>
          )}
        </BlurTargetView>

        {/* Header controls, top right: screen switch, then theme switch. */}
        <View style={[styles.headerBtns, { top: insets.top + 12 }]}>
          <GlassTabBar tab={tab} onChange={setTab} theme={theme} />
          <ThemeButton theme={theme} onToggle={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))} />
        </View>
      </View>
    </BlurTargetContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 'clip' on web: 'hidden' still lets focus and drags scroll the root sideways.
  root: { flex: 1, overflow: Platform.OS === 'web' ? ('clip' as 'hidden') : 'hidden' },
  headerBtns: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { padding: 22, width: '100%', maxWidth: 360 },
  msgTitle: { fontFamily: FONT.semibold, fontSize: 19 },
  msgBody: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 21, marginTop: 8 },
  msgBtn: { marginTop: 18, height: 46, borderRadius: 23, backgroundColor: '#2F62CA', alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { color: '#FFFFFF', fontFamily: FONT.semibold, fontSize: 16 },
});
