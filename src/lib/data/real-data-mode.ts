/**
 * When the user has uploaded TikTok earnings data, the app runs in "real data mode":
 * TikTok metrics come from Excel uploads; demo seed numbers are suppressed.
 * Bank accounts / balances / imported transactions are still shown.
 */

import { hasAffiliateAccounts } from "@/lib/tiktok/accounts";
import { hasTikTokUploads } from "@/lib/tiktok/store";

export function isRealDataMode(): boolean {
  return hasTikTokUploads() || hasAffiliateAccounts();
}
