import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BRAND_BLUE } from '../../constants/theme';

// Telegram-ish palette
const BG = '#E5EBF1';
const OUT_BUBBLE = '#EFFDDE'; // outgoing (light green)
const IN_BUBBLE = '#FFFFFF';
const CHECK = '#4FAE4E';

interface Msg {
  id: string;
  text: string;
  time: string;
  mine: boolean;
}

const INITIAL: Msg[] = [
  { id: 'm1', text: 'Assalomu alaykum!', time: '14:02', mine: false },
  { id: 'm2', text: 'Vaalaykum assalom! Sigir hali sotuvdami?', time: '14:03', mine: true },
  { id: 'm3', text: 'Ha, bor. Qiziqyapsizmi?', time: '14:03', mine: false },
  { id: 'm4', text: 'Ha. Oxirgi narxi qancha boʻladi?', time: '14:04', mine: true },
  { id: 'm5', text: '18 million, biroz kelishsa ham boʻladi 🙂', time: '14:05', mine: false },
  { id: 'm6', text: 'Koʻrsam boʻladimi? Qayerda joylashgan?', time: '14:06', mine: true },
  { id: 'm7', text: 'Toshkent, Yunusobod. Istalgan vaqt keling.', time: '14:06', mine: false },
];

export default function Conversation() {
  const router = useRouter();
  const { name = 'Sotuvchi' } = useLocalSearchParams<{ name?: string }>();
  const [messages, setMessages] = useState<Msg[]>(INITIAL);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    const time = new Date().toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
    setMessages((m) => [...m, { id: String(Date.now()), text: t, time, mine: true }]);
    setText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: BG }}>
      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center border-b border-border bg-background px-2 py-2">
          <Pressable onPress={() => router.back()} hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color={BRAND_BLUE} />
          </Pressable>
          <View className="mr-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_BLUE }}>
            <AppText className="font-semibold text-base text-white">
              {String(name).charAt(0).toUpperCase()}
            </AppText>
          </View>
          <View className="flex-1">
            <AppText className="font-semibold text-base text-foreground" numberOfLines={1}>{name}</AppText>
            <AppText className="text-xs" style={{ color: BRAND_BLUE }}>onlayn</AppText>
          </View>
          <Pressable hitSlop={10} className="h-9 w-9 items-center justify-center">
            <Ionicons name="call-outline" size={22} color={BRAND_BLUE} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            {/* Date pill */}
            <View className="mb-3 items-center">
              <View className="rounded-full bg-black/10 px-3 py-1">
                <AppText className="text-xs text-white">Bugun</AppText>
              </View>
            </View>

            {messages.map((m) => (
              <View
                key={m.id}
                className="mb-1.5 max-w-[80%]"
                style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start' }}
              >
                <View
                  className="rounded-2xl px-3 py-2"
                  style={{
                    backgroundColor: m.mine ? OUT_BUBBLE : IN_BUBBLE,
                    borderBottomRightRadius: m.mine ? 4 : 16,
                    borderBottomLeftRadius: m.mine ? 16 : 4,
                    shadowColor: '#000',
                    shadowOpacity: 0.06,
                    shadowRadius: 1,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                  }}
                >
                  <AppText className="text-[15px] leading-5 text-foreground">{m.text}</AppText>
                  <View className="mt-0.5 flex-row items-center justify-end">
                    <AppText className="text-[11px]" style={{ color: '#8896A6' }}>{m.time}</AppText>
                    {m.mine && (
                      <Ionicons name="checkmark-done" size={15} color={CHECK} style={{ marginLeft: 3 }} />
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Input bar */}
          <View className="flex-row items-center gap-2 border-t border-border bg-background px-2 py-2">
            <Pressable hitSlop={8} className="h-10 w-10 items-center justify-center">
              <Ionicons name="attach" size={24} color="#9ca3af" />
            </Pressable>
            <View className="flex-1 flex-row items-center rounded-3xl bg-surface-secondary px-4">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Xabar yozing..."
                placeholderTextColor="#9ca3af"
                multiline
                className="flex-1 text-base text-foreground"
                style={{
                  fontFamily: 'Inter-Regular',
                  maxHeight: 100,
                  paddingTop: Platform.OS === 'ios' ? 10 : 8,
                  paddingBottom: Platform.OS === 'ios' ? 10 : 8,
                  textAlignVertical: 'center',
                }}
              />
            </View>
            <Pressable
              onPress={send}
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND_BLUE }}
            >
              <Ionicons name={text.trim() ? 'send' : 'mic'} size={20} color="white" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
