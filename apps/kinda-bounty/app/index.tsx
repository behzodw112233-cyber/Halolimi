import { Ionicons } from '@expo/vector-icons';
import { api } from '@halolmia/backend/convex/_generated/api';
import type { Id } from '@halolmia/backend/convex/_generated/dataModel';
import { useAction, useMutation, useQuery } from 'convex/react';
import { Button, Card, Input } from 'heroui-native';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BLUE = '#12A8E8';
const INK = '#071326';
const SLATE = '#8A96AA';
const DISPLAY = 'SpaceGrotesk-Bold';
const DISPLAY_SEMI = 'SpaceGrotesk-SemiBold';
const BODY = 'Inter-Medium';
const BODY_BOLD = 'Inter-Bold';
const HAS_CONVEX = Boolean(process.env.EXPO_PUBLIC_CONVEX_URL);
const bountyApi = (api as any).bounty;
const DEMO_SUBMISSION_UPDATED_AT = 1_785_000_000_000;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type OnboardingSlide = {
  title: string;
  body: string;
  visual: 'grid' | 'duo' | 'phone' | 'money';
};

const onboardingImages: Record<OnboardingSlide['visual'], ImageSourcePropType> = {
  grid: require('../assets/onboarding/inspiration.png'),
  duo: require('../assets/onboarding/make-content.png'),
  phone: require('../assets/onboarding/post-paid.png'),
  money: require('../assets/onboarding/creator-pool.png'),
};

const slides: OnboardingSlide[] = [
  {
    title: 'Scripts that sell Halolmia',
    body: 'Swipe through proven video ideas, hooks, and angles built for real sellers and local creators.',
    visual: 'grid',
  },
  {
    title: 'Remix the idea your way',
    body: 'Copy the structure, bring your own voice, and make the promo feel native to your audience.',
    visual: 'duo',
  },
  {
    title: 'Post once. Track every view.',
    body: 'Publish a short video, submit the link, then watch qualified views and installs move your balance.',
    visual: 'phone',
  },
  {
    title: 'Milestones, not gimmicks',
    body: 'Qualified views unlock rewards. Installs and real marketplace actions unlock the serious upside.',
    visual: 'money',
  },
];

const bountyCards = [
  {
    slug: 'farmers-sell-faster',
    title: 'Farmers sell faster',
    tag: 'Main campaign',
    views: '100k target',
    reward: '$12 + install bonus',
    script: 'Hook: Still selling animals in Telegram groups? Show Halolmia in 20 seconds.',
    color: '#12A8E8',
  },
  {
    slug: 'buyer-seller-skit',
    title: 'Buyer/seller skit',
    tag: 'Comedy format',
    views: '250k target',
    reward: '$35 + activation bonus',
    script: 'Act out the pain of messy DMs, then switch to clean listings and direct chat.',
    color: '#111827',
  },
  {
    slug: 'dealer-trust-badge',
    title: 'Dealer trust badge',
    tag: 'Trust format',
    views: '50k target',
    reward: '$5 + dealer lead bonus',
    script: 'Explain verified sellers, reviews, calls, and why buyers feel safer.',
    color: '#F35B7F',
  },
];

const payoutTiers = [
  ['10k', '$1'],
  ['50k', '$5'],
  ['100k', '$12'],
  ['250k', '$35'],
  ['500k', '$85'],
  ['1M', '$200'],
];

export default function HomeScreen() {
  const [step, setStep] = useState(0);
  const [legalName, setLegalName] = useState('');
  const [phone, setPhone] = useState('');
  const [showDashboard, setShowDashboard] = useState(false);
  const { height, width } = useWindowDimensions();
  const compact = width < 380;
  const visualHeight = Math.min(compact ? 425 : 520, Math.max(365, height * 0.58));

  const progressCount = showDashboard ? 8 : step < slides.length ? 4 : 8;
  const progressIndex = showDashboard ? 7 : step < slides.length ? step : step + 1;

  const canContinue = useMemo(() => {
    if (step === slides.length) return legalName.trim().length > 2;
    if (step === slides.length + 1) return phone.replace(/\D/g, '').length >= 9;
    return true;
  }, [legalName, phone, step]);

  function continueFlow() {
    if (!canContinue) return;
    if (step < slides.length + 1) {
      setStep((value) => value + 1);
      return;
    }
    setShowDashboard(true);
  }

  function goBack() {
    if (showDashboard) {
      setShowDashboard(false);
      setStep(slides.length + 1);
      return;
    }
    setStep((value) => Math.max(0, value - 1));
  }

  if (showDashboard) {
    return (
      <SafeAreaView className="flex-1 bg-[#F5F7FB]">
        <TopChrome
          progressCount={progressCount}
          progressIndex={progressIndex}
          canGoBack
          onBack={goBack}
          onExit={() => setStep(slides.length)}
        />
        <Dashboard legalName={legalName || 'Creator'} phone={phone || '+998'} />
      </SafeAreaView>
    );
  }

  const slide = slides[step];
  const isLegal = step === slides.length;
  const isPhone = step === slides.length + 1;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TopChrome
        progressCount={progressCount}
        progressIndex={progressIndex}
        canGoBack={step > 0}
        onBack={goBack}
        onExit={() => setStep(slides.length)}
      />

      <View className="flex-1 px-7">
        {slide ? (
          <View className="flex-1">
            <View className="justify-center" style={{ height: visualHeight }}>
              <SlideVisual kind={slide.visual} compact={compact} />
            </View>
            <Text style={styles.eyebrow}>Kinda Bounty</Text>
            <Text style={[styles.onboardingTitle, compact && styles.onboardingTitleCompact]}>
              {slide.title}
            </Text>
            <Text style={styles.onboardingBody}>
              {slide.body}
            </Text>
          </View>
        ) : (
          <SetupStep
            isLegal={isLegal}
            isPhone={isPhone}
            legalName={legalName}
            phone={phone}
            onLegalNameChange={setLegalName}
            onPhoneChange={setPhone}
          />
        )}

        <Button
          size="lg"
          isDisabled={!canContinue}
          onPress={continueFlow}
          className="mb-5 h-16 rounded-full bg-[#12A8E8] disabled:bg-[#8DD7F5]"
          style={styles.primaryButton}
        >
          <Button.Label className="text-lg text-white" style={styles.buttonLabel}>
            {isPhone ? 'Enter Bounty' : 'Continue'}
          </Button.Label>
        </Button>
      </View>
    </SafeAreaView>
  );
}

function TopChrome({
  progressCount,
  progressIndex,
  canGoBack,
  onBack,
  onExit,
}: {
  progressCount: number;
  progressIndex: number;
  canGoBack: boolean;
  onBack: () => void;
  onExit: () => void;
}) {
  return (
    <View className="h-16 flex-row items-center justify-between px-7">
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        hitSlop={12}
        className="size-11 items-center justify-center rounded-full"
        style={{ opacity: canGoBack ? 1 : 0 }}
      >
        <Ionicons name="chevron-back" size={25} color="#98A1B2" />
      </Pressable>

      <View className="flex-row items-center gap-1.5">
        {Array.from({ length: progressCount }).map((_, index) => (
          <View
            key={index}
            className="h-1.5 rounded-full"
            style={{
              width: index === progressIndex ? 18 : 14,
              backgroundColor: index === progressIndex ? BLUE : '#E4E8EF',
            }}
          />
        ))}
      </View>

      <Pressable
        onPress={onExit}
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        hitSlop={12}
        className="h-11 min-w-11 items-center justify-center rounded-full px-2"
      >
        <Text style={styles.skipText}>Skip</Text>
      </Pressable>
    </View>
  );
}

function SlideVisual({ kind, compact }: { kind: OnboardingSlide['visual']; compact: boolean }) {
  const { width: screenWidth } = useWindowDimensions();
  const isMoney = kind === 'money';
  const width = Math.min(screenWidth + 42, isMoney ? 500 : 520);
  const height = isMoney ? (compact ? 390 : 480) : compact ? 405 : 500;
  return (
    <View className="items-center justify-center">
      <Image
        source={onboardingImages[kind]}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
        style={{ width, height }}
      />
      <View className="absolute bottom-[-8px] h-24 w-[360px] bg-white" style={styles.visualFade} />
    </View>
  );
}

function SetupStep({
  isLegal,
  isPhone,
  legalName,
  phone,
  onLegalNameChange,
  onPhoneChange,
}: {
  isLegal: boolean;
  isPhone: boolean;
  legalName: string;
  phone: string;
  onLegalNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
}) {
  return (
    <View className="flex-1 pt-12">
      <Text style={styles.formEyebrow}>Payout setup</Text>
      <Text style={styles.formTitle}>
        {isLegal ? "What's your legal name?" : "What's your phone number?"}
      </Text>
      <Text style={styles.formBody}>
        {isLegal
          ? 'For payouts, enter your legal name exactly as shown on your government-issued ID.'
          : "We'll text a verification code to this number so we can set up your payout profile."}
      </Text>

      <View className="mt-6 flex-row gap-2">
        <View style={styles.setupChip}>
          <Ionicons name="shield-checkmark-outline" size={16} color={BLUE} />
          <Text style={styles.setupChipText}>Verified payout</Text>
        </View>
        <View style={styles.setupChip}>
          <Ionicons name="flash-outline" size={16} color={BLUE} />
          <Text style={styles.setupChipText}>Fast review</Text>
        </View>
      </View>

      <View className="mt-9 gap-4">
        {isLegal ? (
          <>
            <Input
              value={legalName}
              onChangeText={onLegalNameChange}
              placeholder="First and last name"
              className="h-16 rounded-2xl border-0 bg-[#F2F4F7] px-6 text-base"
              style={styles.inputText}
            />
            <Input
              placeholder="Country / region"
              value="Uzbekistan"
              editable={false}
              className="h-16 rounded-2xl border-0 bg-[#F2F4F7] px-6 text-base"
              style={styles.inputText}
            />
          </>
        ) : (
          <>
            <View className="h-16 flex-row items-center rounded-2xl bg-[#F2F4F7] px-4">
              <View className="mr-3 size-9 items-center justify-center rounded-full bg-white">
                <Text style={{ fontSize: 18 }}>UZ</Text>
              </View>
              <Input
                value={phone}
                onChangeText={onPhoneChange}
                placeholder="+998 phone number"
                keyboardType="phone-pad"
                className="h-16 flex-1 border-0 bg-transparent px-0 text-base"
                style={styles.inputText}
              />
            </View>
            <Button size="lg" className="h-14 rounded-full bg-[#7DD0F2]" style={styles.secondaryButton}>
              <Button.Label className="text-base text-white" style={styles.buttonLabel}>Send SMS code</Button.Label>
            </Button>
            <Text style={styles.disclaimer}>
              Standard message and data rates may apply.
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

type DashboardTab = 'home' | 'upload';

type BountyCampaign = {
  slug: string;
  title: string;
  tag: string;
  brief: string;
  hook: string;
  targetViews: number;
  accent: string;
  payoutTiers?: readonly { views: number; cents: number }[];
};

type BountySubmission = {
  _id?: Id<'bountySubmissions'> | string;
  campaignSlug: string;
  campaign?: BountyCampaign;
  platform: string;
  url: string;
  canonicalUrl?: string;
  title?: string;
  authorName?: string;
  providerName?: string;
  thumbnailUrl?: string;
  metadataStatus: 'queued' | 'imported' | 'failed';
  metadataError?: string;
  status: 'draft' | 'checking' | 'approved' | 'rejected' | 'paid';
  viewCount: number;
  qualifiedViewCount: number;
  installCount: number;
  activationCount: number;
  rewardCents: number;
  updatedAt: number;
};

type SubmitLinkArgs = {
  campaignSlug: string;
  url: string;
  manualViewCount?: number;
};

type SubmitLinkResult = {
  ok: boolean;
  message: string;
};

function Dashboard({ legalName, phone }: { legalName: string; phone: string }) {
  if (HAS_CONVEX) {
    return <BackendDashboard legalName={legalName} phone={phone} />;
  }

  return <DemoDashboard legalName={legalName} phone={phone} />;
}

function BackendDashboard({ legalName, phone }: { legalName: string; phone: string }) {
  const campaignsQuery = useQuery(bountyApi.campaigns, {});
  const submissionsQuery = useQuery(bountyApi.mySubmissions, { creatorPhone: phone });
  const upsertCreator = useMutation(bountyApi.upsertCreator);
  const submitLink = useMutation(bountyApi.submitLink);
  const refreshMetadata = useAction(bountyApi.refreshSubmissionMetadata);

  useEffect(() => {
    upsertCreator({ legalName, phone, region: 'Uzbekistan' }).catch(() => {});
  }, [legalName, phone, upsertCreator]);

  const campaigns = (campaignsQuery as BountyCampaign[] | undefined) ?? getDemoCampaigns();
  const submissions = (submissionsQuery as BountySubmission[] | undefined) ?? [];

  async function handleSubmit(args: SubmitLinkArgs): Promise<SubmitLinkResult> {
    const submissionId = await submitLink({
      campaignSlug: args.campaignSlug,
      creatorName: legalName,
      creatorPhone: phone,
      manualViewCount: args.manualViewCount,
      url: args.url,
    });
    const result = await refreshMetadata({ submissionId: submissionId as Id<'bountySubmissions'> });
    if (!result.ok) {
      return {
        ok: false,
        message: 'Saved it, but auto-import needs a manual review for this platform.',
      };
    }
    return { ok: true, message: 'Imported. Review queue has the preview and reward estimate.' };
  }

  return (
    <DashboardShell
      campaigns={campaigns}
      legalName={legalName}
      onSubmit={handleSubmit}
      submissions={submissions}
      synced
    />
  );
}

function DemoDashboard({ legalName }: { legalName: string; phone: string }) {
  const campaigns = getDemoCampaigns();
  const [submissions, setSubmissions] = useState<BountySubmission[]>([
    {
      _id: 'demo-1',
      campaign: campaigns[0],
      campaignSlug: campaigns[0].slug,
      platform: 'tiktok',
      providerName: 'TikTok',
      status: 'approved',
      metadataStatus: 'imported',
      title: 'How sellers list cattle faster with Halolmia',
      url: 'https://tiktok.com/@creator/video/demo',
      qualifiedViewCount: 124_000,
      viewCount: 124_000,
      installCount: 318,
      activationCount: 28,
      rewardCents: 4_780,
      updatedAt: DEMO_SUBMISSION_UPDATED_AT,
    },
  ]);

  async function handleSubmit(args: SubmitLinkArgs): Promise<SubmitLinkResult> {
    const campaign = campaigns.find((item) => item.slug === args.campaignSlug) ?? campaigns[0];
    const views = Math.max(0, Math.floor(args.manualViewCount ?? 0));
    const rewardCents = estimateRewardCents(views, 0, 0);
    const platform = detectClientPlatform(args.url);
    setSubmissions((items) => [
      {
        _id: `demo-${Date.now()}`,
        campaign,
        campaignSlug: campaign.slug,
        platform,
        providerName: platformLabel(platform),
        status: 'checking',
        metadataStatus: 'queued',
        title: makeDemoTitle(args.url, campaign.title),
        url: args.url.trim(),
        qualifiedViewCount: views,
        viewCount: views,
        installCount: 0,
        activationCount: 0,
        rewardCents,
        updatedAt: Date.now(),
      },
      ...items,
    ]);
    await new Promise((resolve) => setTimeout(resolve, 420));
    return {
      ok: true,
      message: 'Demo import queued. Add EXPO_PUBLIC_CONVEX_URL to sync it for real.',
    };
  }

  return (
    <DashboardShell
      campaigns={campaigns}
      legalName={legalName}
      onSubmit={handleSubmit}
      submissions={submissions}
      synced={false}
    />
  );
}

function DashboardShell({
  campaigns,
  legalName,
  onSubmit,
  submissions,
  synced,
}: {
  campaigns: BountyCampaign[];
  legalName: string;
  onSubmit: (args: SubmitLinkArgs) => Promise<SubmitLinkResult>;
  submissions: BountySubmission[];
  synced: boolean;
}) {
  const [tab, setTab] = useState<DashboardTab>('home');
  const [selectedCampaign, setSelectedCampaign] = useState(campaigns[0]?.slug ?? 'farmers-sell-faster');
  const [videoUrl, setVideoUrl] = useState('');
  const [viewText, setViewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<SubmitLinkResult | null>(null);

  const campaign = campaigns.find((item) => item.slug === selectedCampaign) ?? campaigns[0];
  const totals = useMemo(() => summarizeSubmissions(submissions), [submissions]);
  const typedViews = parseCount(viewText);
  const previewReward = estimateRewardCents(typedViews, 0, 0);
  const canSubmit = videoUrl.trim().length > 8 && !isSubmitting;

  async function submitVideo() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await onSubmit({
        campaignSlug: campaign.slug,
        manualViewCount: typedViews || undefined,
        url: videoUrl,
      });
      setMessage(result);
      if (result.ok) {
        setVideoUrl('');
        setViewText('');
        setTab('home');
      }
    } catch (error) {
      setMessage({
        ok: false,
        message: error instanceof Error ? error.message : 'Could not import this link yet.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View className="flex-1">
      <View className="px-5 pb-3">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text style={styles.dashboardEyebrow}>Kinda Bounty</Text>
            <Text style={styles.dashboardTitle}>Yo {firstName(legalName)}, get paid</Text>
          </View>
          <View style={[styles.syncBadge, synced ? styles.syncBadgeLive : styles.syncBadgeDemo]}>
            <Ionicons
              name={synced ? 'cloud-done-outline' : 'phone-portrait-outline'}
              size={17}
              color={synced ? '#0B8A48' : '#8A96AA'}
            />
            <Text style={[styles.syncText, synced ? styles.syncTextLive : styles.syncTextDemo]}>
              {synced ? 'Live' : 'Demo'}
            </Text>
          </View>
        </View>
        <SegmentedTabs selected={tab} onSelect={setTab} />
      </View>

      {tab === 'home' ? (
        <HomeTab
          campaigns={campaigns}
          onUploadPress={(slug) => {
            setSelectedCampaign(slug);
            setTab('upload');
          }}
          submissions={submissions}
          totals={totals}
        />
      ) : (
        <UploadTab
          campaign={campaign}
          campaigns={campaigns}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
          message={message}
          onCampaignChange={setSelectedCampaign}
          onSubmit={submitVideo}
          onVideoUrlChange={setVideoUrl}
          onViewTextChange={setViewText}
          previewReward={previewReward}
          typedViews={typedViews}
          videoUrl={videoUrl}
          viewText={viewText}
        />
      )}
    </View>
  );
}

function SegmentedTabs({
  onSelect,
  selected,
}: {
  onSelect: (tab: DashboardTab) => void;
  selected: DashboardTab;
}) {
  return (
    <View style={styles.segmented}>
      <TabButton icon="home-outline" label="Home" selected={selected === 'home'} onPress={() => onSelect('home')} />
      <TabButton
        icon="cloud-upload-outline"
        label="Upload"
        selected={selected === 'upload'}
        onPress={() => onSelect('upload')}
      />
    </View>
  );
}

function TabButton({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tabButton, selected && styles.tabButtonSelected]}
    >
      <Ionicons name={icon} size={18} color={selected ? INK : SLATE} />
      <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

function HomeTab({
  campaigns,
  onUploadPress,
  submissions,
  totals,
}: {
  campaigns: BountyCampaign[];
  onUploadPress: (slug: string) => void;
  submissions: BountySubmission[];
  totals: ReturnType<typeof summarizeSubmissions>;
}) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
      <Card className="overflow-hidden rounded-[28px] border-0 bg-[#071326] p-5" style={styles.darkShadow}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: 8 }).map((_, row) => (
            <View key={row} className="mt-5 flex-row justify-around opacity-20">
              {Array.from({ length: 14 }).map((__, dot) => (
                <View key={dot} className="size-0.5 rounded-full bg-[#67D8FF]" />
              ))}
            </View>
          ))}
        </View>
        <Card.Body>
          <View className="flex-row items-start justify-between">
            <View>
              <Text style={styles.walletLabel}>Estimated balance</Text>
              <Text style={styles.walletValue}>{formatMoney(totals.rewardCents)}</Text>
            </View>
            <View style={styles.walletIcon}>
              <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.walletSubcopy}>
            {totals.nextTier
              ? `${compactNumber(totals.nextTier.views - totals.qualifiedViews)} views until ${formatMoney(totals.nextTier.cents)} tier`
              : 'Top tier unlocked. Now installs and activations carry the bag.'}
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${totals.progressPercent}%` }]} />
          </View>
        </Card.Body>
      </Card>

      <View className="mt-5 flex-row gap-3">
        <Metric label="Qualified views" value={compactNumber(totals.qualifiedViews)} icon="eye-outline" />
        <Metric label="Installs" value={compactNumber(totals.installs)} icon="download-outline" />
      </View>

      <View className="mt-7 flex-row items-center justify-between">
        <Text style={styles.sectionTitle}>Active bounties</Text>
        <Text style={styles.sectionLink}>3 formats</Text>
      </View>
      <View className="mt-3 gap-4">
        {campaigns.map((bounty) => (
          <BountyCard
            key={bounty.slug}
            bounty={bounty}
            onPress={() => onUploadPress(bounty.slug)}
          />
        ))}
      </View>

      <View className="mt-7 flex-row items-center justify-between">
        <Text style={styles.sectionTitle}>Recent submissions</Text>
        <Text style={styles.sectionLink}>{submissions.length} total</Text>
      </View>
      <View className="mt-3 gap-3">
        {submissions.length > 0 ? (
          submissions.slice(0, 4).map((submission) => (
            <SubmissionRow key={String(submission._id ?? submission.url)} submission={submission} />
          ))
        ) : (
          <EmptySubmissions onPress={() => onUploadPress(campaigns[0]?.slug ?? 'farmers-sell-faster')} />
        )}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Payout math</Text>
      <Card className="mt-3 rounded-[24px] border-0 bg-white p-4" style={styles.softShadow}>
        <Card.Body>
          <Text style={styles.mathTitle}>Small per view, spicy at scale</Text>
          <Text style={styles.mathBody}>
            Public views unlock base tiers. Installs add $0.10 each, activations add $1.00 each, then quality review protects the budget.
          </Text>
          <View className="mt-5 flex-row flex-wrap gap-2">
            {payoutTiers.map(([views, reward]) => (
              <View key={views} style={styles.payoutChip}>
                <Text style={styles.payoutViews}>{views}</Text>
                <Text style={styles.payoutReward}>{reward}</Text>
              </View>
            ))}
          </View>
        </Card.Body>
      </Card>
    </ScrollView>
  );
}

function UploadTab({
  campaign,
  campaigns,
  canSubmit,
  isSubmitting,
  message,
  onCampaignChange,
  onSubmit,
  onVideoUrlChange,
  onViewTextChange,
  previewReward,
  typedViews,
  videoUrl,
  viewText,
}: {
  campaign: BountyCampaign;
  campaigns: BountyCampaign[];
  canSubmit: boolean;
  isSubmitting: boolean;
  message: SubmitLinkResult | null;
  onCampaignChange: (slug: string) => void;
  onSubmit: () => void;
  onVideoUrlChange: (value: string) => void;
  onViewTextChange: (value: string) => void;
  previewReward: number;
  typedViews: number;
  videoUrl: string;
  viewText: string;
}) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
      <Card className="overflow-hidden rounded-[28px] border-0 bg-white p-5" style={styles.softShadow}>
        <Card.Body>
          <View className="flex-row items-center gap-4">
            <View style={[styles.importIcon, { backgroundColor: campaign.accent }]}>
              <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
              <View style={styles.importArrow}>
                <Ionicons name="arrow-up-outline" size={14} color={campaign.accent} />
              </View>
            </View>
            <View className="min-w-0 flex-1">
              <Text style={styles.uploadTitle}>Paste video. Pull the details.</Text>
              <Text style={styles.uploadBody}>
                We import the preview, estimate reward, then send it to review.
              </Text>
            </View>
          </View>

          <Text style={styles.inputLabel}>Choose bounty</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-3 px-5">
            <View className="flex-row gap-3">
              {campaigns.map((item) => {
                const selected = item.slug === campaign.slug;
                return (
                  <Pressable
                    key={item.slug}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onCampaignChange(item.slug)}
                    style={[styles.campaignPill, selected && styles.campaignPillSelected]}
                  >
                    <View style={[styles.campaignDot, { backgroundColor: item.accent }]} />
                    <Text style={[styles.campaignPillText, selected && styles.campaignPillTextSelected]}>
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Text style={styles.inputLabel}>Video link</Text>
          <Input
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={onVideoUrlChange}
            placeholder="TikTok, Instagram, YouTube, or Vimeo link"
            value={videoUrl}
            className="mt-3 h-16 rounded-2xl border-0 bg-[#F2F4F7] px-5 text-base"
            style={styles.inputText}
          />

          <Text style={styles.inputLabel}>Public views now</Text>
          <Input
            keyboardType="number-pad"
            onChangeText={onViewTextChange}
            placeholder="Optional, ex: 125000"
            value={viewText}
            className="mt-3 h-16 rounded-2xl border-0 bg-[#F2F4F7] px-5 text-base"
            style={styles.inputText}
          />

          <View style={styles.previewBox}>
            <View className="flex-row items-center justify-between">
              <View>
                <Text style={styles.previewLabel}>Estimated unlock</Text>
                <Text style={styles.previewValue}>{formatMoney(previewReward)}</Text>
              </View>
              <View className="items-end">
                <Text style={styles.previewLabel}>Qualified views</Text>
                <Text style={styles.previewViews}>{compactNumber(typedViews)}</Text>
              </View>
            </View>
            <Text style={styles.previewScript}>{campaign.hook}</Text>
          </View>

          {message ? (
            <View style={[styles.statusBanner, message.ok ? styles.statusBannerOk : styles.statusBannerWarn]}>
              <Ionicons
                name={message.ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={19}
                color={message.ok ? '#0B8A48' : '#A55B00'}
              />
              <Text style={[styles.statusBannerText, message.ok ? styles.statusTextOk : styles.statusTextWarn]}>
                {message.message}
              </Text>
            </View>
          ) : null}
        </Card.Body>
      </Card>

      <Button
        size="lg"
        isDisabled={!canSubmit}
        onPress={onSubmit}
        className="mt-5 h-16 rounded-full bg-[#12A8E8] disabled:bg-[#8DD7F5]"
        style={styles.primaryButton}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={isSubmitting ? 'refresh-outline' : 'cloud-upload-outline'} size={22} color="#FFFFFF" />
          <Button.Label className="text-lg text-white" style={styles.buttonLabel}>
            {isSubmitting ? 'Importing...' : 'Import link'}
          </Button.Label>
        </View>
      </Button>
    </ScrollView>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: IoniconName }) {
  return (
    <Card className="flex-1 rounded-[22px] border-0 bg-white p-4" style={styles.softShadow}>
      <Card.Body>
        <Ionicons name={icon} size={22} color={BLUE} />
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </Card.Body>
    </Card>
  );
}

function BountyCard({ bounty, onPress }: { bounty: BountyCampaign; onPress: () => void }) {
  return (
    <Card className="rounded-[24px] border-0 bg-white p-4" style={styles.softShadow}>
      <Card.Body>
        <View className="flex-row gap-4">
          <View className="h-28 w-20 overflow-hidden rounded-2xl" style={{ backgroundColor: bounty.accent }}>
            <View className="absolute left-3 right-3 top-3 h-1 rounded-full bg-white/35" />
            <View className="absolute left-3 right-3 top-7 h-12 rounded-2xl bg-white/20" />
            <View className="absolute bottom-3 left-3 right-3 h-7 rounded-xl bg-white/25" />
          </View>
          <View className="min-w-0 flex-1">
            <View className="self-start rounded-full bg-[#E5F6FD] px-3 py-1">
              <Text style={styles.bountyTag}>{bounty.tag}</Text>
            </View>
            <Text style={styles.bountyTitle}>{bounty.title}</Text>
            <Text style={styles.bountyMeta}>{compactNumber(bounty.targetViews)} target</Text>
            <Text numberOfLines={2} style={styles.bountyScript}>{bounty.brief}</Text>
          </View>
        </View>
      </Card.Body>
      <Card.Footer className="mt-3 flex-row items-center justify-between">
        <Text style={styles.bountyReward}>Up to {formatMoney(estimateRewardCents(bounty.targetViews, 0, 0))}</Text>
        <Button size="sm" onPress={onPress} className="rounded-full bg-[#071326] px-4">
          <Button.Label className="font-bold text-white" style={styles.buttonLabel}>Upload</Button.Label>
        </Button>
      </Card.Footer>
    </Card>
  );
}

function SubmissionRow({ submission }: { submission: BountySubmission }) {
  const status = submission.status === 'approved' || submission.status === 'paid' ? 'approved' : submission.status;
  return (
    <Card className="rounded-[22px] border-0 bg-white p-4" style={styles.softShadow}>
      <Card.Body>
        <View className="flex-row items-center gap-3">
          {submission.thumbnailUrl ? (
            <Image
              source={{ uri: submission.thumbnailUrl }}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
              style={styles.submissionThumb}
            />
          ) : (
            <View style={styles.submissionThumbFallback}>
              <Ionicons name={platformIcon(submission.platform)} size={22} color={BLUE} />
            </View>
          )}
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} style={styles.submissionTitle}>
              {submission.title ?? submission.campaign?.title ?? 'Imported video'}
            </Text>
            <Text style={styles.submissionMeta}>
              {platformLabel(submission.platform)} - {compactNumber(submission.qualifiedViewCount)} views - {formatMoney(submission.rewardCents)}
            </Text>
          </View>
          <View style={[styles.reviewBadge, status === 'approved' ? styles.reviewBadgeOk : styles.reviewBadgeWait]}>
            <Ionicons
              name={status === 'approved' ? 'checkmark-circle-outline' : 'time-outline'}
              size={15}
              color={status === 'approved' ? '#0B8A48' : '#A55B00'}
            />
            <Text style={[styles.reviewBadgeText, status === 'approved' ? styles.reviewTextOk : styles.reviewTextWait]}>
              {status === 'approved' ? 'OK' : 'Review'}
            </Text>
          </View>
        </View>
      </Card.Body>
    </Card>
  );
}

function EmptySubmissions({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.emptyBox}>
      <Ionicons name="cloud-upload-outline" size={25} color={BLUE} />
      <View className="min-w-0 flex-1">
        <Text style={styles.emptyTitle}>No links yet</Text>
        <Text style={styles.emptyBody}>Paste your first promo video and we will pull the preview.</Text>
      </View>
      <Ionicons name="arrow-forward-outline" size={20} color={SLATE} />
    </Pressable>
  );
}

function getDemoCampaigns(): BountyCampaign[] {
  return bountyCards.map((card) => ({
    accent: card.color,
    brief: card.script,
    hook: card.script.replace('Hook: ', ''),
    payoutTiers: [
      { views: 10_000, cents: 100 },
      { views: 50_000, cents: 500 },
      { views: 100_000, cents: 1_200 },
      { views: 250_000, cents: 3_500 },
      { views: 500_000, cents: 8_500 },
      { views: 1_000_000, cents: 20_000 },
      { views: 5_000_000, cents: 125_000 },
    ],
    slug: card.slug,
    tag: card.tag,
    targetViews: Number.parseInt(card.views.replace(/\D/g, ''), 10) * (card.views.includes('k') ? 1000 : 1),
    title: card.title,
  }));
}

function summarizeSubmissions(submissions: BountySubmission[]) {
  const rewardCents = submissions.reduce((sum, item) => sum + item.rewardCents, 0);
  const qualifiedViews = submissions.reduce((sum, item) => sum + item.qualifiedViewCount, 0);
  const installs = submissions.reduce((sum, item) => sum + item.installCount, 0);
  const tiers = [
    { views: 10_000, cents: 100 },
    { views: 50_000, cents: 500 },
    { views: 100_000, cents: 1_200 },
    { views: 250_000, cents: 3_500 },
    { views: 500_000, cents: 8_500 },
    { views: 1_000_000, cents: 20_000 },
    { views: 5_000_000, cents: 125_000 },
  ];
  const nextTier = tiers.find((tier) => qualifiedViews < tier.views);
  const previousTier = [...tiers].reverse().find((tier) => qualifiedViews >= tier.views) ?? { views: 0 };
  const progressRange = Math.max(1, (nextTier?.views ?? 5_000_000) - previousTier.views);
  const progressPercent = Math.min(100, Math.max(8, ((qualifiedViews - previousTier.views) / progressRange) * 100));

  return {
    installs,
    nextTier,
    progressPercent,
    qualifiedViews,
    rewardCents,
  };
}

function estimateRewardCents(views: number, installs: number, activations: number) {
  const tiers = [
    { views: 5_000_000, cents: 125_000 },
    { views: 1_000_000, cents: 20_000 },
    { views: 500_000, cents: 8_500 },
    { views: 250_000, cents: 3_500 },
    { views: 100_000, cents: 1_200 },
    { views: 50_000, cents: 500 },
    { views: 10_000, cents: 100 },
  ];
  const base = tiers.find((tier) => views >= tier.views)?.cents ?? 0;
  return base + Math.min(installs, 20_000) * 10 + Math.min(activations, 5_000) * 100;
}

function parseCount(value: string) {
  const normalized = value.toLowerCase().replace(/,/g, '').trim();
  const multiplier = normalized.endsWith('m') ? 1_000_000 : normalized.endsWith('k') ? 1_000 : 1;
  const numeric = Number.parseFloat(normalized.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.floor(numeric * multiplier));
}

function compactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1)}k`;
  return String(value);
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', {
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  })}`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || 'creator';
}

function detectClientPlatform(url: string) {
  const lowered = url.toLowerCase();
  if (lowered.includes('tiktok')) return 'tiktok';
  if (lowered.includes('instagram')) return 'instagram';
  if (lowered.includes('youtube') || lowered.includes('youtu.be')) return 'youtube';
  if (lowered.includes('vimeo')) return 'vimeo';
  return 'other';
}

function platformLabel(platform: string) {
  if (platform === 'tiktok') return 'TikTok';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'vimeo') return 'Vimeo';
  return 'Video';
}

function platformIcon(platform: string): IoniconName {
  if (platform === 'youtube') return 'play-circle-outline';
  if (platform === 'instagram') return 'camera-outline';
  if (platform === 'tiktok') return 'musical-notes-outline';
  return 'videocam-outline';
}

function makeDemoTitle(url: string, fallback: string) {
  const platform = platformLabel(detectClientPlatform(url));
  return `${platform} promo - ${fallback}`;
}

const styles = StyleSheet.create({
  eyebrow: {
    color: BLUE,
    fontFamily: DISPLAY_SEMI,
    fontSize: 13,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  onboardingTitle: {
    marginTop: 8,
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 38,
    lineHeight: 40,
    textAlign: 'center',
  },
  onboardingTitleCompact: {
    fontSize: 32,
    lineHeight: 35,
  },
  onboardingBody: {
    alignSelf: 'center',
    maxWidth: 355,
    marginTop: 14,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  skipText: {
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 14,
  },
  primaryButton: {
    shadowColor: BLUE,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  secondaryButton: {
    shadowColor: BLUE,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonLabel: {
    fontFamily: BODY_BOLD,
  },
  visualFade: {
    shadowColor: '#FFFFFF',
    shadowOpacity: 1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -18 },
  },
  formEyebrow: {
    color: BLUE,
    fontFamily: DISPLAY_SEMI,
    fontSize: 13,
    textTransform: 'uppercase',
  },
  formTitle: {
    marginTop: 10,
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 34,
    lineHeight: 37,
  },
  formBody: {
    marginTop: 12,
    maxWidth: 380,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 15,
    lineHeight: 23,
  },
  setupChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#EAF8FE',
    paddingHorizontal: 12,
  },
  setupChipText: {
    color: BLUE,
    fontFamily: BODY_BOLD,
    fontSize: 12,
  },
  inputText: {
    color: INK,
    fontFamily: BODY,
  },
  disclaimer: {
    color: SLATE,
    fontFamily: BODY,
    fontSize: 13,
    lineHeight: 19,
  },
  dashboardEyebrow: {
    color: BLUE,
    fontFamily: DISPLAY_SEMI,
    fontSize: 12,
    textTransform: 'uppercase',
  },
  dashboardTitle: {
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 27,
    lineHeight: 31,
  },
  syncBadge: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  syncBadgeLive: {
    backgroundColor: '#EAFBF2',
  },
  syncBadgeDemo: {
    backgroundColor: '#EEF2F7',
  },
  syncText: {
    fontFamily: BODY_BOLD,
    fontSize: 12,
  },
  syncTextLive: {
    color: '#0B8A48',
  },
  syncTextDemo: {
    color: SLATE,
  },
  segmented: {
    minHeight: 54,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#EAF0F7',
    padding: 6,
  },
  tabButton: {
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 999,
  },
  tabButtonSelected: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  tabLabel: {
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 14,
  },
  tabLabelSelected: {
    color: INK,
  },
  darkShadow: {
    shadowColor: INK,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  walletLabel: {
    color: '#A7DFF5',
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  walletValue: {
    marginTop: 5,
    color: '#FFFFFF',
    fontFamily: DISPLAY,
    fontSize: 48,
    lineHeight: 54,
  },
  walletIcon: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  walletSubcopy: {
    marginTop: 16,
    color: '#C6D4E6',
    fontFamily: BODY_BOLD,
    fontSize: 14,
    lineHeight: 20,
  },
  progressTrack: {
    height: 12,
    marginTop: 14,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BLUE,
  },
  sectionTitle: {
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 21,
    lineHeight: 26,
  },
  sectionLink: {
    color: BLUE,
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  mathTitle: {
    color: INK,
    fontFamily: DISPLAY_SEMI,
    fontSize: 18,
  },
  mathBody: {
    marginTop: 8,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 14,
    lineHeight: 21,
  },
  payoutChip: {
    minWidth: 72,
    borderRadius: 18,
    backgroundColor: '#F2F7FB',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  payoutViews: {
    color: INK,
    fontFamily: BODY_BOLD,
    fontSize: 14,
  },
  payoutReward: {
    marginTop: 2,
    color: BLUE,
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  importIcon: {
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  importArrow: {
    position: 'absolute',
    right: -4,
    top: -4,
    height: 24,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  uploadTitle: {
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 24,
    lineHeight: 28,
  },
  uploadBody: {
    marginTop: 5,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 14,
    lineHeight: 20,
  },
  inputLabel: {
    marginTop: 22,
    color: INK,
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  campaignPill: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#F2F4F7',
    paddingHorizontal: 14,
  },
  campaignPillSelected: {
    backgroundColor: '#E5F6FD',
  },
  campaignDot: {
    height: 9,
    width: 9,
    borderRadius: 5,
  },
  campaignPillText: {
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  campaignPillTextSelected: {
    color: INK,
  },
  previewBox: {
    marginTop: 18,
    borderRadius: 22,
    backgroundColor: '#F7FAFD',
    padding: 16,
  },
  previewLabel: {
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 12,
  },
  previewValue: {
    marginTop: 3,
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 30,
  },
  previewViews: {
    marginTop: 4,
    color: BLUE,
    fontFamily: BODY_BOLD,
    fontSize: 17,
  },
  previewScript: {
    marginTop: 12,
    color: '#4B5563',
    fontFamily: BODY,
    fontSize: 14,
    lineHeight: 20,
  },
  statusBanner: {
    minHeight: 48,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  statusBannerOk: {
    backgroundColor: '#EAFBF2',
  },
  statusBannerWarn: {
    backgroundColor: '#FFF4E5',
  },
  statusBannerText: {
    flex: 1,
    fontFamily: BODY_BOLD,
    fontSize: 13,
    lineHeight: 18,
  },
  statusTextOk: {
    color: '#0B8A48',
  },
  statusTextWarn: {
    color: '#A55B00',
  },
  metricValue: {
    marginTop: 12,
    color: INK,
    fontFamily: DISPLAY,
    fontSize: 28,
    lineHeight: 32,
  },
  metricLabel: {
    marginTop: 2,
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 12,
  },
  bountyTag: {
    color: BLUE,
    fontFamily: BODY_BOLD,
    fontSize: 12,
  },
  bountyTitle: {
    marginTop: 9,
    color: INK,
    fontFamily: DISPLAY_SEMI,
    fontSize: 19,
    lineHeight: 23,
  },
  bountyMeta: {
    marginTop: 2,
    color: SLATE,
    fontFamily: BODY_BOLD,
    fontSize: 13,
  },
  bountyScript: {
    marginTop: 7,
    color: '#4B5563',
    fontFamily: BODY,
    fontSize: 13,
    lineHeight: 18,
  },
  bountyReward: {
    color: INK,
    fontFamily: BODY_BOLD,
    fontSize: 15,
  },
  submissionThumb: {
    height: 54,
    width: 54,
    borderRadius: 18,
    backgroundColor: '#EAF0F7',
  },
  submissionThumbFallback: {
    height: 54,
    width: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EAF8FE',
  },
  submissionTitle: {
    color: INK,
    fontFamily: BODY_BOLD,
    fontSize: 14,
  },
  submissionMeta: {
    marginTop: 4,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 12,
  },
  reviewBadge: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 9,
  },
  reviewBadgeOk: {
    backgroundColor: '#EAFBF2',
  },
  reviewBadgeWait: {
    backgroundColor: '#FFF4E5',
  },
  reviewBadgeText: {
    fontFamily: BODY_BOLD,
    fontSize: 11,
  },
  reviewTextOk: {
    color: '#0B8A48',
  },
  reviewTextWait: {
    color: '#A55B00',
  },
  emptyBox: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  emptyTitle: {
    color: INK,
    fontFamily: BODY_BOLD,
    fontSize: 14,
  },
  emptyBody: {
    marginTop: 3,
    color: SLATE,
    fontFamily: BODY,
    fontSize: 12,
    lineHeight: 17,
  },
  softShadow: {
    shadowColor: '#0B1220',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  blueShadow: {
    shadowColor: BLUE,
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
