import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Upload,
  Users,
  X,
} from 'lucide-react';
import type {
  AuthUser,
  Booking,
  CurrencyCode,
  PaymentMethod,
  Venue,
  VerifiedReview,
} from '../types/venuza';
import { CURRENCY_META, convertCurrency, formatMoney } from '../utils/currency';
import { normalizeVenuePhotos } from '../utils/venuePhotos';
import { VenueSlideshow } from './VenueSlideshow';
import { VenueMap } from './VenueMap';

interface BookerViewProps {
  user: AuthUser;
  venues: Venue[];
  bookings: Booking[];
  reviews: VerifiedReview[];
  activeSubTab: 'explore' | 'bookings';
  onCreateBooking: (payload: {
    venueId: string;
    bookerId: string;
    bookerName: string;
    bookerContact: string;
    eventDate: string;
    eventType: string;
    guestCount: number;
    paymentMethod: PaymentMethod;
    paymentReference: string;
    proofImage: string;
    proofFileName: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSubmitReview: (payload: {
    venueId: string;
    bookingId: string;
    bookerName: string;
    rating: number;
    comment: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

function getDaysForMonth(year: number, monthIndex: number): string[] {
  const days: string[] = [];
  const total = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    days.push(`${year}-${mm}-${dd}`);
  }
  return days;
}

export const BookerView: React.FC<BookerViewProps> = ({
  user,
  venues,
  bookings,
  reviews,
  activeSubTab,
  onCreateBooking,
  onSubmitReview,
}) => {
  const approvedVenues = useMemo(
    () => venues.filter((v) => v.status === 'approved'),
    [venues],
  );

  // Location Hierarchy & Filters
  const [countryFilter, setCountryFilter] = useState<string>('All');
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [cityFilter, setCityFilter] = useState<string>('All');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [maxPriceConverted, setMaxPriceConverted] = useState<number>(0);
  const [minRating, setMinRating] = useState<number>(0);
  const [availableDateFilter, setAvailableDateFilter] = useState<string>('');
  const [visitorCurrency, setVisitorCurrency] = useState<CurrencyCode>('GHS');
  const [showMobileFilters, setShowMobileFilters] = useState<boolean>(false);

  // Selected Venue Detail & Booking Checkout
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [chosenDate, setChosenDate] = useState<string>('');
  const [eventType, setEventType] = useState<string>('Conferences');
  const [guestCount, setGuestCount] = useState<number>(250);
  const [bookerContact, setBookerContact] = useState<string>(user.identifier || '+233 24 555 0199');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [proofImage, setProofImage] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [bookingFeedback, setBookingFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState<boolean>(false);

  // Review Form State
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Cascading Country -> Region -> City options
  const countries = useMemo(
    () => Array.from(new Set(approvedVenues.map((v) => v.country))).sort(),
    [approvedVenues],
  );
  const regions = useMemo(() => {
    const base =
      countryFilter === 'All'
        ? approvedVenues
        : approvedVenues.filter((v) => v.country === countryFilter);
    return Array.from(new Set(base.map((v) => v.region))).sort();
  }, [approvedVenues, countryFilter]);

  const cities = useMemo(() => {
    const base = approvedVenues.filter(
      (v) =>
        (countryFilter === 'All' || v.country === countryFilter) &&
        (regionFilter === 'All' || v.region === regionFilter),
    );
    return Array.from(new Set(base.map((v) => v.city))).sort();
  }, [approvedVenues, countryFilter, regionFilter]);

  const filteredVenues = useMemo(() => {
    return approvedVenues.filter((v) => {
      if (countryFilter !== 'All' && v.country !== countryFilter) return false;
      if (regionFilter !== 'All' && v.region !== regionFilter) return false;
      if (cityFilter !== 'All' && v.city !== cityFilter) return false;
      if (eventTypeFilter !== 'All' && !v.eventTypes.includes(eventTypeFilter)) return false;
      if (minCapacity > 0 && v.capacity < minCapacity) return false;
      if (minRating > 0 && v.rating < minRating) return false;
      if (maxPriceConverted > 0) {
        const converted = convertCurrency(v.bookingCharge, v.currency, visitorCurrency);
        if (converted > maxPriceConverted) return false;
      }
      if (availableDateFilter) {
        if (v.bookedDates.includes(availableDateFilter)) return false;
        const pendingConflict = bookings.some(
          (b) =>
            b.venueId === v.id &&
            b.eventDate === availableDateFilter &&
            b.status === 'payment_uploaded',
        );
        if (pendingConflict) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${v.name} ${v.city} ${v.region} ${v.country} ${v.description} ${v.eventTypes.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    approvedVenues,
    countryFilter,
    regionFilter,
    cityFilter,
    eventTypeFilter,
    minCapacity,
    minRating,
    maxPriceConverted,
    visitorCurrency,
    availableDateFilter,
    bookings,
    searchQuery,
  ]);

  const selectedVenue = useMemo(
    () => approvedVenues.find((v) => v.id === selectedVenueId) || null,
    [approvedVenues, selectedVenueId],
  );

  // Calendar calculation
  const calendarDate = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + calendarMonthOffset);
    return d;
  }, [calendarMonthOffset]);

  const monthDays = useMemo(
    () => getDaysForMonth(calendarDate.getFullYear(), calendarDate.getMonth()),
    [calendarDate],
  );
  const firstDayWeekday = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofImage(reader.result);
        setProofFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const attachSampleReceipt = () => {
    const svg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220">
        <rect width="420" height="220" rx="14" fill="#0d102a"/>
        <rect x="14" y="14" width="392" height="192" rx="10" fill="#171b40" stroke="#f5c04a" stroke-opacity="0.45"/>
        <text x="30" y="48" fill="#f5c04a" font-family="sans-serif" font-size="13" font-weight="700">${paymentMethod.toUpperCase()} PAYMENT PROOF</text>
        <text x="30" y="82" fill="#ffffff" font-family="monospace" font-size="13">REF: ${paymentRef || 'VZ-TXN-884120'}</text>
        <text x="30" y="110" fill="#c5cae3" font-family="sans-serif" font-size="12">Centre: ${selectedVenue?.name || 'Event Centre'}</text>
        <text x="30" y="138" fill="#c5cae3" font-family="sans-serif" font-size="12">Event Date: ${chosenDate || 'Upcoming'}</text>
        <text x="30" y="170" fill="#22c55e" font-family="sans-serif" font-size="12" font-weight="600">Transfer Confirmed by Sender</text>
      </svg>`,
    )}`;
    setProofImage(svg);
    setProofFileName(`${paymentMethod}-receipt.png`);
    if (!paymentRef) {
      setPaymentRef(`VZ-${Math.floor(100000 + Math.random() * 899999)}`);
    }
  };

  const submitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVenue) return;
    if (!chosenDate) {
      setBookingFeedback({ type: 'error', text: 'Select an available date on the calendar first.' });
      return;
    }
    if (!paymentRef.trim()) {
      setBookingFeedback({ type: 'error', text: 'Enter your MoMo or bank transaction reference ID.' });
      return;
    }
    if (!proofImage) {
      setBookingFeedback({ type: 'error', text: 'Upload a screenshot or photo of your payment receipt.' });
      return;
    }

    setSubmittingBooking(true);
    setBookingFeedback(null);
    const res = await onCreateBooking({
      venueId: selectedVenue.id,
      bookerId: user.id,
      bookerName: user.name,
      bookerContact,
      eventDate: chosenDate,
      eventType,
      guestCount,
      paymentMethod,
      paymentReference: paymentRef.trim(),
      proofImage,
      proofFileName: proofFileName || 'payment-proof.png',
    });
    setSubmittingBooking(false);

    if (!res.ok) {
      setBookingFeedback({ type: 'error', text: res.error || 'Could not submit booking.' });
    } else {
      setBookingFeedback({
        type: 'success',
        text: 'Proof uploaded. The venue owner has been notified to confirm receipt and lock your date.',
      });
      setPaymentRef('');
      setProofImage('');
      setProofFileName('');
    }
  };

  // ============================================================================
  // MY BOOKINGS SUB-TAB
  // ============================================================================
  if (activeSubTab === 'bookings') {
    const myBookings = bookings.filter(
      (b) => b.bookerId === user.id || b.bookerName.toLowerCase() === user.name.toLowerCase(),
    );
    const displayBookings = myBookings.length > 0 ? myBookings : bookings;

    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
              Reservations & Payment Evidence
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
              Your Event Bookings
            </h1>
          </div>
          <span className="font-mono-num text-xs text-[#848ab0]">
            {displayBookings.length} active record(s)
          </span>
        </div>

        {displayBookings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121432] p-10 text-center">
            <Calendar className="mx-auto h-10 w-10 text-[#f5c04a] mb-3" />
            <h2 className="font-display text-xl font-semibold text-white">No bookings yet</h2>
            <p className="mt-2 text-sm text-[#c5cae3]">
              Explore verified event centres and upload your payment proof to reserve a date.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {displayBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white">{b.venueName}</h3>
                      <p className="text-xs text-[#c5cae3] mt-0.5">
                        {b.venueCity} · {b.eventType} · {b.guestCount} guests
                      </p>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        b.status === 'confirmed'
                          ? 'text-emerald-400'
                          : b.status === 'disputed' || b.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-[#f5c04a]'
                      }`}
                    >
                      {b.status === 'confirmed'
                        ? 'Confirmed & Locked'
                        : b.status === 'payment_uploaded'
                          ? 'Awaiting Owner Check'
                          : b.status === 'disputed'
                            ? 'Under Admin Review'
                            : 'Rejected'}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
                    <div>
                      <span className="text-[#848ab0] block">Event Date</span>
                      <span className="font-mono-num text-white font-medium mt-0.5 block">
                        {b.eventDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#848ab0] block">Booking Charge</span>
                      <span className="font-mono-num text-[#f5c04a] font-medium mt-0.5 block">
                        {formatMoney(b.amount, b.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#848ab0] block">Payment Method</span>
                      <span className="text-white mt-0.5 block">
                        {b.paymentMethod === 'mtn_momo'
                          ? 'MTN MoMo'
                          : b.paymentMethod === 'telecel_cash'
                            ? 'Telecel Cash'
                            : 'Bank Transfer'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#848ab0] block">Reference</span>
                      <span className="font-mono-num text-white mt-0.5 block">{b.paymentReference}</span>
                    </div>
                  </div>
                </div>

                {b.proofImage && (
                  <div className="rounded-xl border border-white/10 bg-[#0a0b1e] p-2.5 flex items-center gap-3">
                    <img
                      src={b.proofImage}
                      alt={`Payment receipt ${b.paymentReference}`}
                      referrerPolicy="no-referrer"
                      className="h-14 w-24 rounded-lg object-cover border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">{b.proofFileName}</p>
                      <p className="text-[11px] text-[#848ab0]">Uploaded payment evidence</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  // ============================================================================
  // VENUE DETAIL VIEW
  // ============================================================================
  if (selectedVenue) {
    const venueReviews = reviews.filter((r) => r.venueId === selectedVenue.id);
    const convertedCharge = convertCurrency(
      selectedVenue.bookingCharge,
      selectedVenue.currency,
      visitorCurrency,
    );
    const pendingDates = new Set(
      bookings
        .filter((b) => b.venueId === selectedVenue.id && b.status === 'payment_uploaded')
        .map((b) => b.eventDate),
    );
    const eligibleBookingForReview = bookings.find(
      (b) => b.venueId === selectedVenue.id && b.status === 'confirmed',
    );
    const todayStr = new Date().toISOString().slice(0, 10);

    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24">
        <button
          type="button"
          onClick={() => {
            setSelectedVenueId(null);
            setCheckoutOpen(false);
            setBookingFeedback(null);
          }}
          className="mb-5 min-h-[44px] inline-flex items-center gap-2 text-sm font-medium text-[#c5cae3] hover:text-[#f5c04a] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to all event centres</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Columns: Gallery, Specs, Calendar, Map, Reviews */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#c5cae3] mb-2">
                <span>{selectedVenue.country}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedVenue.region}</span>
                <span aria-hidden="true">·</span>
                <span className="text-[#f5c04a] font-medium">{selectedVenue.city}</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white text-balance">
                {selectedVenue.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-[#c5cae3]">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#f5c04a]" />
                  <span className="font-mono-num">{selectedVenue.capacity.toLocaleString()}</span> guests
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-[#f5c04a] fill-[#f5c04a]" />
                  <span className="font-mono-num">{selectedVenue.rating || 'New'}</span>
                  <span>({selectedVenue.reviewCount} verified reviews)</span>
                </span>
              </div>
            </div>

            {/* Venue Photography Showcase (Single Image or Formally Animated Slideshow) */}
            <VenueSlideshow
              photos={normalizeVenuePhotos(selectedVenue)}
              theme={selectedVenue.visualTheme}
              venueName={selectedVenue.name}
              variant="detail"
            />

            {/* Description & Facilities */}
            <div className="rounded-2xl border border-white/10 bg-[#121432] p-6 space-y-5">
              <div>
                <h2 className="font-display text-lg font-semibold text-white">About this centre</h2>
                <p className="mt-2 text-sm text-[#c5cae3] leading-relaxed">{selectedVenue.description}</p>
              </div>
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#848ab0] mb-3">
                  Facilities & Production Readiness
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-white">
                  {selectedVenue.facilities.map((fac) => (
                    <div key={fac} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#f5c04a] shrink-0" />
                      <span>{fac}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Exact Location Map */}
            <VenueMap
              venueName={selectedVenue.name}
              city={selectedVenue.city}
              region={selectedVenue.region}
              country={selectedVenue.country}
              address={selectedVenue.address}
              mapX={selectedVenue.coordinates.mapX}
              mapY={selectedVenue.coordinates.mapY}
              lat={selectedVenue.coordinates.lat}
              lng={selectedVenue.coordinates.lng}
            />

            {/* Verified Booker Reviews */}
            <div className="rounded-2xl border border-white/10 bg-[#121432] p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold text-white">
                    Verified Booker Reviews
                  </h2>
                  <p className="text-xs text-[#848ab0]">
                    Only bookers with a confirmed reservation can publish reviews.
                  </p>
                </div>
                <ShieldCheck className="h-5 w-5 text-[#f5c04a] shrink-0" />
              </div>

              {venueReviews.length === 0 ? (
                <p className="text-sm text-[#848ab0]">No verified reviews yet for this centre.</p>
              ) : (
                <div className="divide-y divide-white/10">
                  {venueReviews.map((rev) => (
                    <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{rev.bookerName}</span>
                        <span className="font-mono-num text-xs text-[#f5c04a]">
                          {rev.rating}.0 / 5.0
                        </span>
                      </div>
                      <p className="text-xs text-[#848ab0] mt-0.5">{rev.eventType}</p>
                      <p className="mt-2 text-sm text-[#c5cae3]">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {eligibleBookingForReview && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (reviewComment.trim().length < 8) {
                      setReviewError('Please share a brief comment (at least 8 characters).');
                      return;
                    }
                    setReviewError('');
                    const r = await onSubmitReview({
                      venueId: selectedVenue.id,
                      bookingId: eligibleBookingForReview.id,
                      bookerName: user.name,
                      rating: reviewRating,
                      comment: reviewComment,
                    });
                    if (!r.ok) setReviewError(r.error || 'Could not submit review.');
                    else setReviewComment('');
                  }}
                  className="border-t border-white/10 pt-4 space-y-3"
                >
                  <p className="text-xs font-medium text-[#f5c04a]">
                    Leave a verified review for your confirmed {eligibleBookingForReview.eventType}
                  </p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        aria-label={`Rate ${star} stars`}
                        className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 bg-[#0a0b1e]"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            star <= reviewRating ? 'text-[#f5c04a] fill-[#f5c04a]' : 'text-[#848ab0]'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Share acoustic quality, hospitality, and power backup experience..."
                    className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] p-3 text-sm text-white placeholder-[#848ab0] focus:border-[#f5c04a] focus:outline-none"
                  />
                  {reviewError && <p className="text-xs text-red-400">{reviewError}</p>}
                  <button
                    type="submit"
                    className="min-h-[42px] rounded-xl bg-[#7c5cff] px-4 py-2 text-xs font-semibold text-white hover:bg-[#8e72ff] transition-colors"
                  >
                    Publish Verified Review
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Pricing, Interactive Availability Calendar, Contact & Booking */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/12 bg-[#121432] p-6 space-y-5">
              <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <span className="text-xs text-[#848ab0] block">Venue Booking Charge</span>
                  <span className="font-mono-num text-2xl sm:text-3xl font-bold text-[#f5c04a]">
                    {formatMoney(selectedVenue.bookingCharge, selectedVenue.currency)}
                  </span>
                </div>
                {visitorCurrency !== selectedVenue.currency && (
                  <div className="text-right">
                    <span className="text-[11px] text-[#848ab0] block">Approx. in {visitorCurrency}</span>
                    <span className="font-mono-num text-sm font-semibold text-white">
                      {formatMoney(convertedCharge, visitorCurrency)}
                    </span>
                  </div>
                )}
              </div>

              {/* Availability Calendar */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-display text-base font-semibold text-white">
                    {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCalendarMonthOffset((m) => Math.max(0, m - 1))}
                      disabled={calendarMonthOffset === 0}
                      aria-label="Previous month"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-white/10 text-white disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarMonthOffset((m) => m + 1)}
                      aria-label="Next month"
                      className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-white/10 text-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-[#848ab0] mb-1.5">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDayWeekday }).map((_, i) => (
                    <span key={`empty-${i}`} />
                  ))}
                  {monthDays.map((dateStr) => {
                    const isPast = dateStr < todayStr;
                    const isBooked = selectedVenue.bookedDates.includes(dateStr);
                    const isPending = pendingDates.has(dateStr);
                    const isSelected = chosenDate === dateStr;
                    const disabled = isPast || isBooked || isPending;

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setChosenDate(dateStr);
                          setCheckoutOpen(true);
                          setBookingFeedback(null);
                        }}
                        className={`min-h-[38px] rounded-lg font-mono-num text-xs font-medium transition-colors ${
                          isSelected
                            ? 'bg-[#F59E0B] text-[#0B0F19] font-bold ring-2 ring-[#FBBF24]'
                            : isBooked
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30 line-through cursor-not-allowed'
                              : isPending
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 cursor-not-allowed'
                                : isPast
                                  ? 'text-white/20 cursor-not-allowed'
                                  : 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/35 hover:bg-emerald-500/30'
                        }`}
                      >
                        {Number(dateStr.slice(-2))}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-[#c5cae3]">
                  <span className="text-emerald-300">Free Date: Selectable Green</span>
                  <span className="text-red-300">Booked: Locked Red</span>
                  <span className="text-amber-300">Pending Proof: Amber</span>
                </div>
              </div>

              {/* Owner Contact for Planning */}
              <div className="rounded-xl border border-white/10 bg-[#0a0b1e] p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c04a]">
                  Planning Contact
                </p>
                <p className="text-sm font-medium text-white">{selectedVenue.planningContact.name}</p>
                <div className="flex flex-col gap-1 text-xs text-[#c5cae3]">
                  <span className="inline-flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-[#7c5cff]" />
                    <span className="font-mono-num">{selectedVenue.planningContact.phone}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-[#7c5cff]" />
                    <span>{selectedVenue.planningContact.email}</span>
                  </span>
                </div>
              </div>

              {!checkoutOpen ? (
                <button
                  type="button"
                  onClick={() => setCheckoutOpen(true)}
                  className="w-full min-h-[48px] rounded-xl bg-[#f5c04a] px-5 py-3 text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] transition-colors"
                >
                  {chosenDate ? `Reserve ${chosenDate}` : 'Select a Date to Book'}
                </button>
              ) : (
                <form onSubmit={submitCheckout} className="space-y-4 border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold text-white">
                      Direct Payment & Proof Upload
                    </h3>
                    <button
                      type="button"
                      onClick={() => setCheckoutOpen(false)}
                      aria-label="Close booking form"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#848ab0] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#848ab0] block mb-1">Selected Date</label>
                      <input
                        type="date"
                        value={chosenDate}
                        min={todayStr}
                        onChange={(e) => setChosenDate(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2 text-xs text-white font-mono-num"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#848ab0] block mb-1">Guests</label>
                      <input
                        type="number"
                        min={10}
                        max={selectedVenue.capacity}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2 text-xs text-white font-mono-num"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#848ab0] block mb-1">Event Type</label>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2 text-xs text-white"
                      >
                        {selectedVenue.eventTypes.map((et) => (
                          <option key={et} value={et}>
                            {et}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-[#848ab0] block mb-1">Your Contact</label>
                      <input
                        type="text"
                        value={bookerContact}
                        onChange={(e) => setBookerContact(e.target.value)}
                        className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-[11px] text-[#848ab0] block mb-1.5">
                      Pay Venue Directly via
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'mtn_momo', label: 'MTN MoMo' },
                          { id: 'telecel_cash', label: 'Telecel Cash' },
                          { id: 'bank_transfer', label: 'Bank' },
                        ] as const
                      ).map((pm) => (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.id)}
                          className={`min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                            paymentMethod === pm.id
                              ? 'border-[#f5c04a] bg-[#f5c04a]/15 text-[#f5c04a]'
                              : 'border-white/10 bg-[#0a0b1e] text-[#c5cae3]'
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 rounded-xl border border-[#7c5cff]/30 bg-[#7c5cff]/10 p-3 text-xs text-[#c5cae3]">
                      {paymentMethod === 'bank_transfer' ? (
                        <span>
                          Transfer <strong className="text-white">{formatMoney(selectedVenue.bookingCharge, selectedVenue.currency)}</strong> to{' '}
                          <strong className="text-white">{selectedVenue.planningContact.bankAccount}</strong>
                        </span>
                      ) : (
                        <span>
                          Send <strong className="text-white">{formatMoney(selectedVenue.bookingCharge, selectedVenue.currency)}</strong> to{' '}
                          <strong className="text-white">{selectedVenue.planningContact.momoNumber}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#848ab0] block mb-1">
                      Transaction / Receipt Reference ID
                    </label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. MM-2026-441920"
                      className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2.5 text-xs text-white font-mono-num"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] text-[#848ab0]">Proof of Payment Screenshot</label>
                      <button
                        type="button"
                        onClick={attachSampleReceipt}
                        className="text-[11px] font-medium text-[#f5c04a] hover:underline"
                      >
                        Attach sample receipt
                      </button>
                    </div>
                    <label className="flex min-h-[54px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/25 bg-[#0a0b1e] px-4 py-3 text-xs text-[#c5cae3] hover:border-[#f5c04a]">
                      <Upload className="h-4 w-4 text-[#f5c04a]" />
                      <span className="truncate">{proofFileName || 'Upload receipt photo or screenshot'}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
                    </label>
                    {proofImage && (
                      <img
                        src={proofImage}
                        alt="Uploaded payment proof preview"
                        referrerPolicy="no-referrer"
                        className="mt-2 h-24 w-full rounded-xl object-cover border border-white/10"
                      />
                    )}
                  </div>

                  {bookingFeedback && (
                    <p
                      role="alert"
                      className={`text-xs rounded-xl p-3 ${
                        bookingFeedback.type === 'error'
                          ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {bookingFeedback.text}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submittingBooking}
                    className="w-full min-h-[48px] rounded-xl bg-[#f5c04a] px-5 py-3 text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] disabled:opacity-60 transition-colors"
                  >
                    {submittingBooking ? 'Uploading Proof...' : 'Submit Booking & Proof'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ============================================================================
  // BOOKER HOMEPAGE: COUNTRY -> REGION -> CITY + SEARCH & FILTERS
  // ============================================================================
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8 py-6 pb-24 space-y-6">
      {/* Discovery Toolbar */}
      <div className="rounded-2xl border border-white/10 bg-[#121432] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
              Verified Event Centres
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
              Browse by Country, Region & City
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0b1e] px-3 py-2">
              <Globe className="h-4 w-4 text-[#f5c04a]" />
              <label htmlFor="visitor-currency" className="sr-only">
                Display Currency
              </label>
              <select
                id="visitor-currency"
                value={visitorCurrency}
                onChange={(e) => setVisitorCurrency(e.target.value as CurrencyCode)}
                className="bg-transparent text-xs font-semibold text-white focus:outline-none"
              >
                {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code} className="bg-[#0a0b1e]">
                    {code} ({CURRENCY_META[code].symbol})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowMobileFilters((v) => !v)}
              className="lg:hidden min-h-[42px] inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#0a0b1e] px-4 py-2 text-xs font-semibold text-white"
            >
              <SlidersHorizontal className="h-4 w-4 text-[#f5c04a]" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Search + Cascading Location Hierarchy + Event Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#848ab0]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hall, summit, wedding..."
              className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] pl-10 pr-3 text-sm text-white placeholder-[#848ab0] focus:border-[#f5c04a] focus:outline-none"
            />
          </div>

          <select
            aria-label="Filter by country"
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setRegionFilter('All');
              setCityFilter('All');
            }}
            className="min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-sm text-white focus:border-[#f5c04a] focus:outline-none"
          >
            <option value="All">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by region or state"
            value={regionFilter}
            onChange={(e) => {
              setRegionFilter(e.target.value);
              setCityFilter('All');
            }}
            className="min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-sm text-white focus:border-[#f5c04a] focus:outline-none"
          >
            <option value="All">All Regions / States</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by city"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-sm text-white focus:border-[#f5c04a] focus:outline-none"
          >
            <option value="All">All Cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by event type"
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-sm text-white focus:border-[#f5c04a] focus:outline-none"
          >
            <option value="All">All Event Types</option>
            <option value="Conferences">Conferences</option>
            <option value="Shows">Shows</option>
            <option value="Weddings">Weddings</option>
            <option value="Parties">Parties</option>
          </select>
        </div>

        {/* Secondary Capacity, Price, Rating, Date Filters */}
        <div
          className={`${
            showMobileFilters ? 'grid' : 'hidden lg:grid'
          } grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10`}
        >
          <div>
            <label className="text-[11px] text-[#848ab0] block mb-1">Minimum Capacity</label>
            <select
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-xs text-white"
            >
              <option value={0}>Any capacity</option>
              <option value={300}>300+ guests</option>
              <option value={500}>500+ guests</option>
              <option value={800}>800+ guests</option>
              <option value={1000}>1,000+ guests</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[#848ab0] block mb-1">
              Max Budget ({visitorCurrency})
            </label>
            <input
              type="number"
              min={0}
              value={maxPriceConverted || ''}
              onChange={(e) => setMaxPriceConverted(Number(e.target.value || 0))}
              placeholder={`Any (${visitorCurrency})`}
              className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-xs text-white font-mono-num"
            />
          </div>

          <div>
            <label className="text-[11px] text-[#848ab0] block mb-1">Minimum Rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-xs text-white"
            >
              <option value={0}>All ratings</option>
              <option value={4.5}>4.5+ stars</option>
              <option value={4.8}>4.8+ stars</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] text-[#848ab0] block mb-1">Available on Date</label>
            <input
              type="date"
              value={availableDateFilter}
              onChange={(e) => setAvailableDateFilter(e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-xs text-white font-mono-num"
            />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filteredVenues.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-10 text-center">
          <p className="font-display text-xl font-semibold text-white">No event centres match your filters</p>
          <p className="mt-2 text-sm text-[#c5cae3]">
            Reset location or budget constraints to explore all verified centres.
          </p>
          <button
            type="button"
            onClick={() => {
              setCountryFilter('All');
              setRegionFilter('All');
              setCityFilter('All');
              setEventTypeFilter('All');
              setSearchQuery('');
              setMinCapacity(0);
              setMaxPriceConverted(0);
              setMinRating(0);
              setAvailableDateFilter('');
            }}
            className="mt-4 min-h-[44px] rounded-xl bg-[#f5c04a] px-5 py-2.5 text-sm font-semibold text-[#0a0b1e]"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.map((venue) => {
            const converted = convertCurrency(venue.bookingCharge, venue.currency, visitorCurrency);
            const venuePhotos = normalizeVenuePhotos(venue);
            return (
              <article
                key={venue.id}
                className="group rounded-2xl border border-white/10 bg-[#121432] overflow-hidden flex flex-col justify-between transition-colors hover:border-[#f5c04a]/50"
              >
                <div>
                  <VenueSlideshow
                    photos={venuePhotos}
                    theme={venue.visualTheme}
                    venueName={venue.name}
                    variant="card"
                    className="h-52 w-full"
                  />
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#848ab0]">
                      <span className="truncate">
                        {venue.city} · {venue.country}
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono-num text-[#f5c04a] shrink-0">
                        <Star className="h-3.5 w-3.5 fill-[#f5c04a]" />
                        {venue.rating || 'New'}
                      </span>
                    </div>

                    <h2 className="font-display text-xl font-bold text-white mt-1.5 group-hover:text-[#f5c04a] transition-colors">
                      {venue.name}
                    </h2>

                    <p className="mt-1 text-[11px] font-medium text-[#848ab0]">
                      {venue.eventTypes.join(' · ')}
                    </p>

                    <p className="mt-2 text-xs text-[#c5cae3] line-clamp-2 leading-relaxed">
                      {venue.description}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3.5 text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[#c5cae3]">
                        <Users className="h-3.5 w-3.5 text-[#7c5cff]" />
                        <span className="font-mono-num">{venue.capacity.toLocaleString()}</span> cap
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#c5cae3]">
                        <MapPin className="h-3.5 w-3.5 text-[#f5c04a]" />
                        {venue.region}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono-num text-lg font-bold text-[#f5c04a]">
                      {formatMoney(converted, visitorCurrency)}
                      <span className="text-[11px] font-normal text-[#848ab0]"> / day</span>
                    </span>
                    {visitorCurrency !== venue.currency && (
                      <span className="block font-mono-num text-[11px] text-[#848ab0]">
                        {formatMoney(venue.bookingCharge, venue.currency)} listed
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVenueId(venue.id);
                      setEventType(venue.eventTypes[0] || 'Conferences');
                      setChosenDate('');
                    }}
                    className="min-h-[42px] rounded-xl bg-[#f5c04a] px-4 py-2 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166] transition-colors whitespace-nowrap shrink-0"
                  >
                    View & Book
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
