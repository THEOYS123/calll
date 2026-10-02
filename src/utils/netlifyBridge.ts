import { BotStatusState, IdentityRecord, OsintSearchHistoryItem } from '../types';
import { INITIAL_INTEL_RECORDS } from '../data/mockIntelDatabase';
import { extractLocationFromNik } from './nikAnalyzer';

const STORAGE_KEY = 'axxosintbot_netlify_state';
const CUSTOM_API_URL_KEY = 'axxosintbot_custom_api_url';

export function getCustomApiUrl(): string {
  try {
    return localStorage.getItem(CUSTOM_API_URL_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomApiUrl(url: string): void {
  try {
    if (url.trim()) {
      localStorage.setItem(CUSTOM_API_URL_KEY, url.trim().replace(/\/$/, ''));
    } else {
      localStorage.removeItem(CUSTOM_API_URL_KEY);
    }
  } catch {
    // ignore storage error
  }
}

export function isNetlifyEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('netlify.app') || host.includes('pages.dev') || host.includes('vercel.app') || host === 'localhost' && window.location.port !== '3000';
}

export function getStoredNetlifyState(defaultState: BotStatusState): BotStatusState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultState,
        ...parsed,
        // Ensure arrays are present
        recentLogs: parsed.recentLogs || defaultState.recentLogs,
        searchHistories: parsed.searchHistories || defaultState.searchHistories,
        activeUsers: parsed.activeUsers || defaultState.activeUsers,
        customCommands: parsed.customCommands || defaultState.customCommands,
        customMenus: parsed.customMenus || defaultState.customMenus
      };
    }
  } catch (e) {
    console.warn('Failed to load Netlify local state:', e);
  }
  return defaultState;
}

export function persistNetlifyState(state: BotStatusState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save Netlify local state:', e);
  }
}

/**
 * Direct Telegram Bot Token verification via Telegram API
 * Enables full validation right from the browser on Netlify!
 */
export async function verifyTelegramTokenDirect(token: string): Promise<{
  valid: boolean;
  botInfo?: any;
  error?: string;
}> {
  const clean = (token || '').trim();
  if (!clean || !/^\d{5,20}:[A-Za-z0-9_-]{20,80}$/.test(clean)) {
    return { valid: false, error: 'Format token bot Telegram tidak valid (contoh: 123456789:ABCdefGhI_jkLmNOPqrstUVwx)' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${clean}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      return {
        valid: true,
        botInfo: {
          id: data.result.id,
          username: data.result.username || '',
          firstName: data.result.first_name || '',
          canJoinGroups: Boolean(data.result.can_join_groups),
          canReadAllGroupMessages: Boolean(data.result.can_read_all_group_messages),
          supportsInlineQueries: Boolean(data.result.supports_inline_queries)
        }
      };
    } else {
      return { valid: false, error: data.description || 'Token ditolak oleh server resmi Telegram' };
    }
  } catch (err: any) {
    return { valid: false, error: `Gagal verifikasi ke Telegram: ${err.message || 'CORS / Jaringan terblokir'}` };
  }
}

/**
 * Client-Side OSINT Engine for Netlify
 * Matches targets against loaded Intel records and generates real search histories
 */
export function executeClientSideOsintSearch(
  target: string,
  currentState: BotStatusState
): {
  results: IdentityRecord[];
  updatedState: BotStatusState;
  historyItem: OsintSearchHistoryItem;
} {
  const cleanQuery = (target || '').trim().toLowerCase();
  const digitsOnly = cleanQuery.replace(/\D/g, '');

  let matched: IdentityRecord[] = [];

  if (cleanQuery) {
    matched = INITIAL_INTEL_RECORDS.filter((rec) => {
      const nameMatch = (rec.fullName || '').toLowerCase().includes(cleanQuery);
      const emailMatch = (rec.email || '').toLowerCase().includes(cleanQuery);
      const addrMatch = (rec.address || '').toLowerCase().includes(cleanQuery);
      const provMatch = (rec.province || '').toLowerCase().includes(cleanQuery);
      const cityMatch = (rec.city || '').toLowerCase().includes(cleanQuery);

      let nikMatch = false;
      let phoneMatch = false;

      if (digitsOnly.length >= 3) {
        const recNikDigits = (rec.nik || '').replace(/\D/g, '');
        const recPhoneDigits = (rec.phone || '').replace(/\D/g, '');
        nikMatch = recNikDigits.includes(digitsOnly);
        phoneMatch = recPhoneDigits.includes(digitsOnly);
      }

      return nameMatch || emailMatch || addrMatch || provMatch || cityMatch || nikMatch || phoneMatch;
    });
  }

  // Format matches with location details
  const enhancedResults = matched.map((r) => ({
    ...r,
    searchCount: (r.searchCount || 0) + 1,
    detectedLocation: extractLocationFromNik(r.nik)
  }));

  const historyItem: OsintSearchHistoryItem = {
    id: `srch_client_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    chatId: 999999,
    userName: 'Admin Web (Netlify)',
    usernameTag: '@operator_axxosint',
    target: target.trim(),
    apiKey: currentState.osintConfig?.apiKeys?.[0]?.key || 'STANDALONE_NETLIFY_KEY',
    timestamp: new Date().toISOString(),
    formattedWib: new Date().toLocaleTimeString('id-ID') + ' WIB',
    totalMatches: enhancedResults.length,
    rawResult: `Pencarian Intelijen untuk "${target}" menghasilkan ${enhancedResults.length} data target.`,
    summaryText: `Pencarian Intelijen untuk "${target}" menghasilkan ${enhancedResults.length} data target.`
  };

  const newHistories = [historyItem, ...(currentState.searchHistories || [])].slice(0, 100);
  const newLogs = [
    {
      id: `log_search_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'incoming' as const,
      chatId: 'Web Netlify',
      fromUser: 'Admin',
      text: `/osint ${target.trim()}`,
      details: `Hasil pencarian client-side: ${enhancedResults.length} record cocok`
    },
    ...(currentState.recentLogs || [])
  ].slice(0, 80);

  const updatedState: BotStatusState = {
    ...currentState,
    searchHistories: newHistories,
    recentLogs: newLogs,
    stats: {
      ...currentState.stats,
      osintSearchesCount: (currentState.stats?.osintSearchesCount || 0) + 1,
      commandsExecuted: (currentState.stats?.commandsExecuted || 0) + 1
    }
  };

  persistNetlifyState(updatedState);

  return {
    results: enhancedResults,
    updatedState,
    historyItem
  };
}
