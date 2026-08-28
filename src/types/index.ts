export type UserRole = 'PLAYER' | 'SUPER_ADMIN' | 'FRANCHISE_ADMIN';

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PlayerCategory = 'JUNIOR' | 'SENIOR' | 'EMERGING';

export type KitSize = 'S' | 'M' | 'L' | 'XL' | '2XL' | '3XL' | '4XL';

export type PlayingRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';

export type BattingStyle = 'Right Hand' | 'Left Hand';

export type BowlingStyle =
  | 'Right Arm Fast'
  | 'Right Arm Medium Fast'
  | 'Right Arm Medium'
  | 'Left Arm Fast'
  | 'Left Arm Medium Fast'
  | 'Left Arm Medium'
  | 'Right Arm Off Spin'
  | 'Right Arm Leg Spin'
  | 'Left Arm Orthodox'
  | 'Left Arm Chinaman'
  | 'Do Not Bowl';

export interface User {
  uid: string;
  email: string;
  role: UserRole;
  franchiseId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  userId: string;
  playerId: string;
  fullName: string;
  fatherName: string;
  profileImage?: string;
  phone: string;
  email: string;
  cnic: string;
  dateOfBirth: string;
  age: number;
  city: string;
  address?: string;
  role: PlayingRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  yearsOfExperience: number;
  previousClub?: string;
  achievements?: string;
  shirtNumber?: string;
  kitSize?: KitSize;
  currentClub?: string;
  description?: string;
  videoUrl?: string;
  status: RegistrationStatus;
  category?: PlayerCategory;
  rejectionReason?: string;
  draftEligible: boolean;
  draftedFranchiseId?: string;
  draftPickNumber?: number;
  draftedAt?: Date;
  lockedFranchiseId?: string;
  lockedAt?: Date;
  feeReceiptUrl?: string;
  feeReceiptSubmittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  suspendedAt?: Date;
  suspendedBy?: string;
  fcmToken?: string;
}

export interface PublicPlayer {
  playerId: string;
  fullName: string;
  profileImage?: string;
  age: number;
  city: string;
  role: PlayingRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  yearsOfExperience: number;
}

export interface LeagueSettings {
  leagueName: string;
  season: string;
  registrationOpen: boolean;
  registrationDeadline?: string;
  publicPlayerListEnabled: boolean;
  maxRegistrations?: number;
  updatedAt: Date;
  updatedBy?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  playerId?: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

export interface RegistrationFormData {
  fullName: string;
  fatherName: string;
  phone: string;
  email: string;
  cnic: string;
  dateOfBirth: string;
  age: number;
  city: string;
  address: string;
  role: PlayingRole;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  yearsOfExperience: number;
  previousClub?: string;
  achievements?: string;
  shirtNumber?: string;
  kitSize?: KitSize;
  currentClub?: string;
  description?: string;
  videoUrl?: string;
}

export interface PlayerFilters {
  status?: RegistrationStatus;
  category?: PlayerCategory | 'UNASSIGNED';
  role?: PlayingRole;
  city?: string;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  draftEligible?: boolean;
  ageMin?: number;
  ageMax?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface DashboardStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

export type DraftSessionStatus = 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';

export interface Franchise {
  id: string;
  name: string;
  orderIndex: number;
  shortCode?: string;
  adminUserId?: string;
  adminEmail?: string;
  lockedPlayerIds: string[];
  /** Player doc id of the franchise captain (owner or locked player). */
  captainPlayerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DraftSession {
  id: string;
  status: DraftSessionStatus;
  franchiseOrder: string[];
  totalRounds: number;
  picksPerFranchise: number;
  totalPicks: number;
  currentPickNumber: number;
  pickClockRunning: boolean;
  pickClockStartedAt?: Date;
  pickClockForPickNumber?: number;
  pickClockDurationMs: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  squadSlideshowFranchiseId?: string;
  squadSlideshowToken?: number;
}

export interface DraftPick {
  id: string;
  pickNumber: number;
  round: number;
  positionInRound: number;
  franchiseId: string;
  franchiseName: string;
  playerDocId: string;
  playerId: string;
  playerName: string;
  playerRole: PlayingRole;
  playerCategory?: PlayerCategory;
  shirtNumber?: string;
  kitSize?: KitSize;
  profileImage?: string;
  pickedAt: Date;
  pickedBy: string;
  isAutoPick?: boolean;
  isLock?: boolean;
}
