/**
 * The wire contract. Both odys-customer and (eventually) odys-vendor read these
 * shapes, so field names are explicit rather than the prototype's terse keys.
 *
 * All money is THB as a number. All timestamps are ISO 8601 strings.
 */

export interface HostDto {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
}

export interface LocationDto {
  name: string | null;
  address: string | null;
  googleMapLink: string | null;
  directions?: string | null;
}

export interface PriceDto {
  amount: number;
  currency: string;
  type: 'per_person' | 'flat' | string;
}

export interface ExperienceSummaryDto {
  id: string;
  title: string;
  shortDescription: string | null;
  category: string | null;
  tags: string[];
  location: LocationDto | null;
  durationMinutes: number | null;
  price: PriceDto | null;
  rating: number | null;
  reviewCount: number;
  coverImageUrl: string | null;
  host: HostDto | null;
}

export interface ExperienceContentDto {
  about: string | null;
  quickFacts: string[];
  steps: string[];
  included: string[];
  whatToBring: string[];
  goodToKnow: string[];
  meetingPoint: string | null;
  faqs: { question: string; answer: string }[];
}

export interface ReviewSummaryDto {
  average: number | null;
  count: number;
  /** Star value (1-5) to number of reviews. */
  breakdown: Record<string, number>;
}

export interface ExperienceDetailDto extends ExperienceSummaryDto {
  fullDescription: string | null;
  minSpots: number | null;
  maxSpots: number | null;
  minAge: number | null;
  skillLevel: string | null;
  activityLevel: string | null;
  additionalRequirement: string | null;
  guestPreparation: string | null;
  allowRequestForAvailability: boolean;
  images: string[];
  languages: { code: string; name: string }[];
  amenities: { code: string; name: string }[];
  policies: {
    durationMinutes: number | null;
    cancellationDeadlineHours: number | null;
  };
  content: ExperienceContentDto;
  reviewSummary: ReviewSummaryDto;
}

export interface SlotDto {
  id: string;
  experienceId: string;
  startsAt: string;
  endsAt: string;
  mode: 'group' | 'private' | string;
  capacity: number;
  bookedCount: number;
  spotsLeft: number;
  isSoldOut: boolean;
  price: number;
  currency: string;
  status: string;
}

/** Slots grouped by local (Asia/Bangkok) calendar day, for the booking calendar. */
export interface SlotDayDto {
  /** YYYY-MM-DD */
  date: string;
  slots: SlotDto[];
}

export interface ReviewDto {
  id: string;
  rating: number;
  body: string;
  createdAt: string;
  author: { id: string; fullName: string | null; avatarUrl: string | null } | null;
}

export interface PriceBreakdownDto {
  unit: number;
  guests: number;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  currency: string;
}

export interface RefundQuoteDto {
  tier: 'full' | 'partial' | 'none';
  feePct: number;
  feeThb: number;
  refundThb: number;
  cancelLabel: string;
  modifyLabel: string;
  cancelDetail: string;
  modifyDetail: string;
  hoursUntilStart: number;
}

export interface BookingDto {
  id: string;
  status: 'pending' | 'booked' | 'experienced' | 'cancelled' | string;
  mode: string;
  guests: number;
  subtotalThb: number;
  discountThb: number;
  taxThb: number;
  totalThb: number;
  promoCode: string | null;
  preparationNote: string | null;
  createdAt: string;
  cancelledAt: string | null;
  slot: SlotDto | null;
  experience: ExperienceSummaryDto | null;
  paymentMethod: PaymentMethodDto | null;
  /** What cancelling right now would cost. Null once already cancelled/past. */
  refund: RefundQuoteDto | null;
}

export interface PaymentMethodDto {
  id: string;
  kind: string;
  brand: string | null;
  label: string;
  last4: string | null;
  isDefault: boolean;
}

export interface ProfileDto {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  avatarUrl: string | null;
  bio: string | null;
  initial: string;
  reviewCount: number;
  bookingCount: number;
  savedCount: number;
}

export interface PromoValidationDto {
  valid: boolean;
  code: string;
  description: string | null;
  discountThb: number;
  message: string | null;
}
