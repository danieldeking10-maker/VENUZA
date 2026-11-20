export type UserRole = 'booker' | 'owner' | 'admin';

export type CurrencyCode = 'GHS' | 'USD' | 'GBP' | 'NGN' | 'EUR';

export type VenueVisualTheme =
  | 'grand_ballroom'
  | 'glass_pavilion'
  | 'auditorium_stage'
  | 'rooftop_terrace'
  | 'courtyard_garden';

export type VenueStatus = 'approved' | 'pending_approval' | 'changes_requested' | 'rejected';

export type PaymentMethod = 'mtn_momo' | 'telecel_cash' | 'bank_transfer';

export type BookingStatus = 'payment_uploaded' | 'confirmed' | 'disputed' | 'rejected';

export type SubscriptionPlan = 'standard_trial' | 'standard' | 'super_package';

export interface AuthUser {
  id: string;
  name: string;
  identifier: string; // email or phone
  role: UserRole;
  avatarInitials: string;
}

export interface VerificationBotCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface VerificationBotReport {
  recommendation: 'recommend_approval' | 'flag_for_review';
  score: number; // 0-100 internal completeness score used by bot
  summary: string;
  checks: VerificationBotCheck[];
  checkedAt: string;
}

export interface VenuePhoto {
  id: string;
  url: string;
  angle: 'interior' | 'exterior' | 'surroundings';
  caption: string;
}

export interface VenueImages {
  interior: string;
  exterior: string;
  surroundings: string;
  gallery?: VenuePhoto[];
}

export interface Venue {
  id: string;
  name: string;
  description: string;
  country: string;
  region: string;
  city: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
    mapX: number; // 0-100 percentage on interactive map canvas
    mapY: number; // 0-100 percentage on interactive map canvas
  };
  capacity: number;
  eventTypes: string[];
  facilities: string[];
  bookingCharge: number;
  currency: CurrencyCode;
  planningContact: {
    name: string;
    phone: string;
    email: string;
    momoNumber: string;
    momoNetwork: 'MTN MoMo' | 'Telecel Cash';
    bankAccount: string;
  };
  visualTheme: VenueVisualTheme;
  images: VenueImages;
  bookedDates: string[]; // YYYY-MM-DD
  status: VenueStatus;
  adminNote?: string;
  botReport: VerificationBotReport;
  rating: number;
  reviewCount: number;
  ownerId: string;
  ownerName: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  venueCity: string;
  ownerId: string;
  bookerId: string;
  bookerName: string;
  bookerContact: string;
  eventDate: string; // YYYY-MM-DD
  eventType: string;
  guestCount: number;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: PaymentMethod;
  paymentReference: string;
  proofImage: string;
  proofFileName: string;
  status: BookingStatus;
  disputeReason?: string;
  resolutionNote?: string;
  createdAt: string;
}

export interface VerifiedReview {
  id: string;
  venueId: string;
  bookingId: string;
  bookerName: string;
  rating: number;
  comment: string;
  eventType: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole | 'all';
  title: string;
  message: string;
  channel: 'In-App' | 'SMS' | 'Email';
  read: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
  createdAt: string;
}

export interface OwnerSubscription {
  ownerId: string;
  plan: SubscriptionPlan;
  trialDaysRemaining: number;
  status: 'trialing' | 'active';
  nextBillingDate: string;
}

export interface VenuzaDatabase {
  venues: Venue[];
  bookings: Booking[];
  reviews: VerifiedReview[];
  notifications: AppNotification[];
  auditLogs: AuditLogEntry[];
  subscriptions: OwnerSubscription[];
}
