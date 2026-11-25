import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { BlurTargetView } from 'expo-blur';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurTargetContext, Glass } from './src/components/Glass';
import { PinIcon } from './src/components/Icons';
import { Sky } from './src/components/Sky';
import { TabToggle, type Tab } from './src/components/TabToggle';
import { formatDate, formatHijri, planDay } from './src/lib/prayer';
import { useDeviceLocation } from './src/lib/useLocation';
import { useNow } from './src/lib/useNow';
import { QiblaScreen } from './src/screens/QiblaScreen';
import { TimesScreen } from './src/screens/TimesScreen';
import { FONT, PALETTES, phaseFor, TEXT, type Phase } from './src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Message({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.centerFill}>
      <Glass style={styles.msg}>
        <Text style={styles.msgTitle}>{title}</Text>
        <Text style={styles.msgBody}>{body}</Text>
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
  const { state, retry, openSettings } = useDeviceLocation();
  const [tab, setTab] = useState<Tab>('times');

  const place = state.status === 'ready' ? state.place : null;
  const minuteKey = Math.floor(now.getTime() / 60000);
  // Recompute the day once a minute, not every second.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan = useMemo(() => (place ? planDay(place.lat, place.lon, now) : null), [place, minuteKey]);
  // Browser preview only: ?phase=night|dawn|day|golden|dusk to inspect each sky.
  const forced = Platform.OS === 'web' ? (new URLSearchParams(window.location.search).get('phase') as Phase | null) : null;
  const phase = forced && forced in PALETTES ? forced : phaseFor(plan, now);
  const hijri = useMemo(() => formatHijri(now), [Math.floor(minuteKey / 60)]); // eslint-disable-line react-hooks/exhaustive-deps

  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(tab === 'qibla' ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [tab, p]);
  const timesStyle = useAnimatedStyle(() => ({
    opacity: 1 - p.value,
    transform: [{ translateX: -24 * p.value }, { scale: 1 - 0.03 * p.value }],
  }));
  const qiblaStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: 24 * (1 - p.value) }, { scale: 0.97 + 0.03 * p.value }],
  }));

  const target = useRef<ComponentRef<typeof View>>(null);

  return (
    <BlurTargetContext.Provider value={target}>
      <View style={styles.root}>
        <BlurTargetView ref={target} style={StyleSheet.absoluteFill}>
          <Sky phase={phase} />
        </BlurTargetView>

        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={{ flex: 1 }}>
            <Glass radius={18} style={styles.pill}>
              <PinIcon size={14} />
              <Text style={styles.pillText} numberOfLines={1}>
                {place ? place.label : 'Locatingâ€¦'}
              </Text>
            </Glass>
            <Text style={styles.date}>{formatDate(now)}</Text>
            {hijri && <Text style={styles.hijri}>{hijri}</Text>}
          </View>
          <TabToggle tab={tab} onChange={setTab} />
        </View>

        {state.status === 'loading' && (
          <View style={styles.centerFill}>
            <ActivityIndicator color="#fff" />
          </View>
        )}
        {state.status === 'denied' && (
          <Message
            title="Location is off"
            body="Namaz needs your location to work out exact prayer times and the Qibla direction. It is never sent anywhere."
            action="Open settings"
            onAction={openSettings}
          />
        )}
        {state.status === 'error' && (
          <Message title="Could not find you" body={state.message} action="Try again" onAction={retry} />
        )}

        {place && plan && (
          <View style={{ flex: 1 }}>
            <Animated.View style={[StyleSheet.absoluteFill, timesStyle]} pointerEvents={tab === 'times' ? 'auto' : 'none'}>
              <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
                <TimesScreen plan={plan} now={now} />
              </ScrollView>
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, qiblaStyle]} pointerEvents={tab === 'qibla' ? 'auto' : 'none'}>
              <QiblaScreen lat={place.lat} lon={place.lon} active={tab === 'qibla'} />
            </Animated.View>
          </View>
        )}
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
      <StatusBar style="light" />
      <Main />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // 'clip' on web: 'hidden' still lets focus and drags scroll the root sideways.
  root: { flex: 1, backgroundColor: '#04060F', overflow: Platform.OS === 'web' ? ('clip' as 'hidden') : 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, gap: 12 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 13, height: 36, maxWidth: '100%' },
  pillText: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 14, flexShrink: 1 },
  date: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 13, marginTop: 9, marginLeft: 4 },
  hijri: { color: TEXT.secondary, fontFamily: FONT.medium, fontSize: 12, marginTop: 2, marginLeft: 4 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  msg: { padding: 22, width: '100%', maxWidth: 360 },
  msgTitle: { color: TEXT.primary, fontFamily: FONT.semibold, fontSize: 19 },
  msgBody: { color: TEXT.secondary, fontFamily: FONT.regular, fontSize: 15, lineHeight: 21, marginTop: 8 },
  msgBtn: { marginTop: 18, height: 46, borderRadius: 23, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  msgBtnText: { color: '#11131A', fontFamily: FONT.semibold, fontSize: 16 },
});
