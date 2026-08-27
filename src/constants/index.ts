import {
  BattingStyle,
  BowlingStyle,
  PlayingRole,
} from '../types';

export const LEAGUE = {
  name: 'MCL 2026-27',
  season: '2026-27',
  idPrefix: 'MCL-2026-27',
} as const;

export const PLAYER_CATEGORIES = [
  'JUNIOR',
  'SENIOR',
  'EMERGING',
] as const;

export const PLAYER_CATEGORY_LABELS: Record<
  (typeof PLAYER_CATEGORIES)[number],
  string
> = {
  JUNIOR: 'Junior',
  SENIOR: 'Senior',
  EMERGING: 'Emerging',
};

export const KIT_SIZES = [
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL',
  '4XL',
] as const;

export const KIT_SIZE_LABELS: Record<(typeof KIT_SIZES)[number], string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  XL: 'XL',
  '2XL': '2XL',
  '3XL': '3XL',
  '4XL': '4XL',
};

export const PLAYING_ROLES: PlayingRole[] = [
  'Batsman',
  'Bowler',
  'All-Rounder',
  'Wicketkeeper',
];

export const BATTING_STYLES: BattingStyle[] = ['Right Hand', 'Left Hand'];

export const BOWLING_STYLES: BowlingStyle[] = [
  'Right Arm Fast',
  'Right Arm Medium Fast',
  'Right Arm Medium',
  'Left Arm Fast',
  'Left Arm Medium Fast',
  'Left Arm Medium',
  'Right Arm Off Spin',
  'Right Arm Leg Spin',
  'Left Arm Orthodox',
  'Left Arm Chinaman',
  'Do Not Bowl',
];

export const PAKISTAN_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Chakwal',
  'Other',
];

export const COLLECTIONS = {
  USERS: 'users',
  PLAYERS: 'players',
  ADMINS: 'admins',
  SETTINGS: 'settings',
  PUBLIC_PLAYERS: 'publicPlayers',
  COUNTERS: 'counters',
  AUDIT_LOGS: 'auditLogs',
  NOTIFICATIONS: 'notifications',
  FRANCHISES: 'franchises',
  DRAFT_SESSIONS: 'draftSessions',
} as const;

export const DRAFT = {
  MIN_FRANCHISES: 2,
  MAX_FRANCHISES: 16,
  /** Fallback only. Live drafts use added-franchise count × remaining pool. */
  ROUNDS: 0,
  PICKS_PER_FRANCHISE: 0,
  TOTAL_PICKS: 0,
  SESSION_ID: 'mcl-2026-27',
  PICK_CLOCK_MS: 2 * 60 * 1000,
  LOCKS_PER_FRANCHISE: 3,
} as const;

export const SETTINGS_DOC_ID = 'league';

export const MAX_IMAGE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const REGISTRATION_FEE = {
  easypaisaNumber: '03085386894',
  accountTitle: 'Bilal Shafeeq Bhatti',
  method: 'Easypaisa',
  amount: 2500,
  currency: 'PKR',
} as const;

export function formatRegistrationFeeAmount(): string {
  return `${REGISTRATION_FEE.currency} ${REGISTRATION_FEE.amount.toLocaleString('en-PK')}`;
}
