import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { BlurTargetView } from 'expo-blur';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurTargetContext, Glass } from './src/components/Glass';
import { GlassTabBar, type Tab } from './src/components/GlassTabBar';
import { ThemeButton } from './src/components/ThemeButton';
import { DEMO } from './src/lib/demo';
import { planDay } from './src/lib/prayer';
import { useDeviceLocation } from './src/lib/useLocation';
import { useNow } from './src/lib/useNow';
import { QiblaScreen } from './src/screens/QiblaScreen';
import { TimesScreen } from './src/screens/TimesScreen';
import { FONT, THEMES, type Mode, type Theme } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SKY_NIGHT = require('./assets/qibla-night.jpg');
const SKY_MORNING = require('./assets/qibla-morning.jpg');

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
  // Theme follows the clock: night (dark) 6 PM to 6 AM, morning (light) 6 AM to 6 PM.
  // A manual flip holds only until the next 6 o'clock change.
  const period = periodOf(now);
  const [manual, setManual] = useState<{ mode: Mode; period: string } | null>(null);
  const mode: Mode = manual && manual.period === period ? manual.mode : DEMO?.theme ?? (period.endsWith('n') ? 'dark' : 'light');
  const { state, retry, openSettings } = useDeviceLocation();
  const [tab, setTab] = useState<Tab>(DEMO?.tab ?? 'times');

  const place = state.status === 'ready' ? state.place : null;
  const minuteKey = Math.floor(now.getTime() / 60000);
  // Recompute the day once a minute, not every second.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (place ? planDay(place.lat, place.lon, now) : null), [place, minuteKey]);

  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(tab === 'qibla' ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [tab, p]);

  // Theme reveal: the new sky grows as a circle from the switch to the far corner.
  // Only the sky is revealed, inside a circle that is always mounted (radius 0 when
  // idle). Nothing is created at tap time, so there is no first-frame flash; the
  // cards and text sit above the sky and simply take the new colours at the end.
  const { width: W, height: H } = useWindowDimensions();
  const [next, setNext] = useState<Mode | null>(null);
  const reveal = useSharedValue(0);
  const cx = W - 16 - THEME_BTN / 2;
  const cy = insets.top + 12 + THEME_BTN / 2;
  const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4;

  // Base sky switches first; the circle collapses two frames later, after the
  // base has drawn the new sky underneath it.
  const finish = useCallback(
    (to: Mode, forPeriod: string) => {
      setManual({ mode: to, period: forPeriod });
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          reveal.value = 0;
          setNext(null);
        }),
      );
    },
    [reveal],
  );

  const toggleTheme = useCallback(() => {
    if (next) return;
    const to: Mode = mode === 'dark' ? 'light' : 'dark';
    const forPeriod = period;
    setNext(to);
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(finish, to, forPeriod);
    });
  }, [mode, next, period, reveal, finish]);

  const circle = useAnimatedStyle(() => {
    const r = R * reveal.value;
    return { left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r };
  });
  const inner = useAnimatedStyle(() => {
    const r = R * reveal.value;
    return { left: -(cx - r), top: -(cy - r) };
  });

  const revealSky = (
    <Animated.View pointerEvents="none" style={[styles.revealMask, circle]}>
      <Animated.View style={[{ position: 'absolute', width: W, height: H }, inner]}>
        <Image source={SKY_NIGHT} style={[styles.sky, { opacity: next === 'dark' ? 1 : 0 }]} resizeMode="cover" fadeDuration={0} />
        <Image source={SKY_MORNING} style={[styles.sky, { opacity: next === 'light' ? 1 : 0 }]} resizeMode="cover" fadeDuration={0} />
      </Animated.View>
    </Animated.View>
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Layer
        mode={mode}
        tab={tab}
        onTab={setTab}
        onToggleTheme={toggleTheme}
        p={p}
        state={state}
        plan={plan}
        now={now}
        retry={retry}
        openSettings={openSettings}
        revealSky={revealSky}
      />
    </View>
  );
}

const THEME_BTN = 42;

/** '2026-11-25n' for the night that starts 25 Nov 6 PM, '2026-11-25d' for that day's 6 AM to 6 PM. */
function periodOf(d: Date): string {
  const h = d.getHours();
  const day = new Date(d);
  if (h < 6) day.setDate(day.getDate() - 1); // before 6 AM still belongs to last night
  const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
  return h >= 6 && h < 18 ? `${key}d` : `${key}n`;
}

interface LayerProps {
  mode: Mode;
  tab: Tab;
  onTab: (t: Tab) => void;
  onToggleTheme: () => void;
  p: SharedValue<number>;
  state: ReturnType<typeof useDeviceLocation>['state'];
  plan: ReturnType<typeof planDay> | null;
  now: Date;
  retry: () => void;
  openSettings: () => void;
  /** The growing circle of the next theme's sky, drawn just above the base sky. */
  revealSky: React.ReactNode;
}

/** The whole screen in one theme. */
function Layer({ mode, tab, onTab, onToggleTheme, p, state, plan, now, retry, openSettings, revealSky }: LayerProps) {
  const insets = useSafeAreaInsets();
  const theme = THEMES[mode];
  const place = state.status === 'ready' ? state.place : null;

  const timesStyle = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: -28 * p.value }] }));
  const qiblaStyle = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateX: 28 * (1 - p.value) }] }));

  const target = useRef<ComponentRef<typeof View>>(null);
  const bottomPad = insets.bottom + 24;

  return (
    <BlurTargetContext.Provider value={target}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg }]}>

        {/* Everything the glass controls float over; Android blurs this view. */}
        <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
          {/* Sky behind both screens: starry night in dark theme, fresh morning in light.
              Both stay loaded and only their opacity changes, so a theme switch never
              reloads an image (a reload paints one blank frame: the flicker). */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Image source={SKY_NIGHT} style={[styles.sky, { opacity: mode === 'dark' ? 1 : 0 }]} resizeMode="cover" fadeDuration={0} />
            <Image source={SKY_MORNING} style={[styles.sky, { opacity: mode === 'dark' ? 0 : 1 }]} resizeMode="cover" fadeDuration={0} />
            {revealSky}
          </View>

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
                <QiblaScreen lat={place.lat} lon={place.lon} active={tab === 'qibla'} />
              </Animated.View>
            </>
          )}
        </BlurTargetView>

        {/* Header controls, top right: screen switch, then theme switch. */}
        <View style={[styles.headerBtns, { top: insets.top + 12 }]}>
          <GlassTabBar tab={tab} onChange={onTab} theme={theme} />
          <ThemeButton theme={theme} onToggle={onToggleTheme} />
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
      {DEMO ? (
        // Demo screenshots: phone-like status bar and gesture bar spacing on web.
        <SafeAreaInsetsContext.Provider value={{ top: 44, bottom: 20, left: 0, right: 0 }}>
          <Main />
        </SafeAreaInsetsContext.Provider>
      ) : (
        <Main />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 'clip' on web: 'hidden' still lets focus and drags scroll the root sideways.
  root: { flex: 1, overflow: Platform.OS === 'web' ? ('clip' as 'hidden') : 'hidden' },
  headerBtns: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  revealMask: { position: 'absolute', overflow: 'hidden' },
  sky: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { padding: 22, width: '100%', maxWidth: 360 },
  msgTitle: { fontFamily: FONT.semibold, fontSize: 19 },
  msgBody: { fontFamily: FONT.regular, fontSize: 15, lineHeight: 21, marginTop: 8 },
  msgBtn: { marginTop: 18, height: 46, borderRadius: 23, backgroundColor: '#2F62CA', alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { color: '#FFFFFF', fontFamily: FONT.semibold, fontSize: 16 },
});
