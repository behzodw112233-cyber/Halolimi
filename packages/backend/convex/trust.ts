/**
 * Shared seller-trust flags used by feed cards, listing detail, and seller profile.
 *
 * "Tasdiqlangan sotuvchi" is earned only when:
 *   1) the phone was confirmed by Telegram contact share, and
 *   2) a Telegram account is linked to that same user.
 *
 * Manual phone login alone is NOT verification.
 */

const ONLINE_MS = 3 * 60 * 1000;
const RECENT_MS = 24 * 60 * 60 * 1000;

export type SellerTrustSource = {
  phone?: string;
  telegramId?: string;
  phoneVerifiedAt?: number;
  verifiedAt?: number;
  lastSeen?: number;
  ratingSum?: number;
  ratingCount?: number;
  isDealer?: boolean;
  soldCount?: number;
};

export function computeSellerTrust(
  seller: SellerTrustSource,
  opts: { reportCount: number; now?: number }
) {
  const now = opts.now ?? Date.now();
  const ratingCount = seller.ratingCount ?? 0;
  const rating = ratingCount ? (seller.ratingSum ?? 0) / ratingCount : 0;

  // Legacy users who already have telegramId were linked via Telegram contact
  // before phoneVerifiedAt/verifiedAt existed — treat them as verified.
  const phoneVerified = !!seller.phoneVerifiedAt || !!seller.telegramId;
  const telegramLinked = !!seller.telegramId;
  const verified = !!seller.verifiedAt || (phoneVerified && telegramLinked);

  const activeRecently = !!seller.lastSeen && now - seller.lastSeen < RECENT_MS;
  const goodReviews = ratingCount > 0 && rating >= 4;
  const noReports = opts.reportCount === 0;

  return {
    phoneVerified,
    telegramLinked,
    activeRecently,
    noReports,
    goodReviews,
    verified,
    isDealer: !!seller.isDealer,
    reportCount: opts.reportCount,
    rating,
    ratingCount,
    soldCount: seller.soldCount ?? 0,
    lastSeen: seller.lastSeen,
    online: !!seller.lastSeen && now - seller.lastSeen < ONLINE_MS,
  };
}
