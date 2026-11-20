import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Images,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AuthUser,
  Booking,
  CurrencyCode,
  OwnerSubscription,
  SubscriptionPlan,
  Venue,
  VenueImages,
  VenuePhoto,
  VenueVisualTheme,
} from '../types/venuza';
import {
  CURRENCY_META,
  calculateSubscriptionPricing,
  formatMoney,
} from '../utils/currency';
import {
  buildVenueImagesFromPhotos,
  normalizeVenuePhotos,
  readAndCompressImageFile,
} from '../utils/venuePhotos';
import { VenueMap } from './VenueMap';
import { VenueVisual } from './VenueVisual';

export type OwnerSubTab = 'centres' | 'register' | 'calendar' | 'bookings' | 'subscription';

interface OwnerViewProps {
  user: AuthUser;
  venues: Venue[];
  bookings: Booking[];
  subscription: OwnerSubscription;
  activeSubTab: OwnerSubTab;
  onChangeSubTab: (tab: OwnerSubTab) => void;
  onCreateVenue: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; venue?: Venue }>;
  onUpdateVenue: (
    venueId: string,
    payload: {
      bookingCharge?: number;
      currency?: CurrencyCode;
      bookedDates?: string[];
      images?: VenueImages;
    },
  ) => Promise<{ ok: boolean; error?: string }>;
  onConfirmBooking: (bookingId: string) => Promise<{ ok: boolean; error?: string }>;
  onDisputeBooking: (bookingId: string, reason: string) => Promise<{ ok: boolean; error?: string }>;
  onUpdateSubscription: (plan: SubscriptionPlan) => Promise<void>;
}

const FACILITY_OPTIONS = [
  'Backup Generator',
  'Line-Array Concert Audio',
  '4K LED Stage Wall',
  'Air Conditioning',
  'VIP Green Rooms',
  'Valet Parking',
  'Industrial Kitchen',
  'High-Speed Fiber Wi-Fi',
];

const EVENT_TYPE_OPTIONS = [
  'Conferences',
  'Shows',
  'Weddings',
  'Parties',
];

export const OwnerView: React.FC<OwnerViewProps> = ({
  user,
  venues,
  bookings,
  subscription,
  activeSubTab,
  onChangeSubTab,
  onCreateVenue,
  onUpdateVenue,
  onConfirmBooking,
  onDisputeBooking,
  onUpdateSubscription,
}) => {
  const ownedVenues = useMemo(() => {
    const mine = venues.filter((v) => v.ownerId === user.id || v.ownerId === 'owner-demo');
    return mine.length > 0 ? mine : venues.slice(0, 2);
  }, [venues, user.id]);

  const ownedVenueIds = useMemo(() => new Set(ownedVenues.map((v) => v.id)), [ownedVenues]);
  const ownerBookings = useMemo(
    () => bookings.filter((b) => ownedVenueIds.has(b.venueId) || b.ownerId === 'owner-demo'),
    [bookings, ownedVenueIds],
  );

  // Price editing map
  const [priceDrafts, setPriceDrafts] = useState<Record<string, number>>({});
  const [priceSavedId, setPriceSavedId] = useState<string | null>(null);

  // Calendar management
  const [calendarVenueId, setCalendarVenueId] = useState<string>(ownedVenues[0]?.id || '');
  const activeCalendarVenue =
    ownedVenues.find((v) => v.id === calendarVenueId) || ownedVenues[0] || null;

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regDesc, setRegDesc] = useState('');
  const [regCountry, setRegCountry] = useState('Ghana');
  const [regRegion, setRegRegion] = useState('Greater Accra');
  const [regCity, setRegCity] = useState('Accra');
  const [regAddress, setRegAddress] = useState('');
  const [regCoords, setRegCoords] = useState({ lat: 5.6037, lng: -0.187, mapX: 52, mapY: 48 });
  const [regCapacity, setRegCapacity] = useState(500);
  const [regCharge, setRegCharge] = useState(14000);
  const [regCurrency, setRegCurrency] = useState<CurrencyCode>('GHS');
  const [regTheme, setRegTheme] = useState<VenueVisualTheme>('grand_ballroom');
  const [regFacilities, setRegFacilities] = useState<string[]>([
    'Backup Generator',
    'Air Conditioning',
    'VIP Green Rooms',
  ]);
  const [regEventTypes, setRegEventTypes] = useState<string[]>(['Conferences', 'Weddings']);
  const [regContactName, setRegContactName] = useState(user.name);
  const [regPhone, setRegPhone] = useState('+233 24 510 8822');
  const [regEmail, setRegEmail] = useState('events@myvenue.gh');
  const [regMomo, setRegMomo] = useState('024 510 8822');
  const [regMomoNet, setRegMomoNet] = useState<'MTN MoMo' | 'Telecel Cash'>('MTN MoMo');
  const [regBank, setRegBank] = useState('Ecobank Ghana · 14410099182');
  const [regPhotos, setRegPhotos] = useState<VenuePhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoDragActive, setPhotoDragActive] = useState(false);

  // Existing centre photo manager state
  const [editingPhotosVenueId, setEditingPhotosVenueId] = useState<string | null>(null);
  const [draftPhotosByVenue, setDraftPhotosByVenue] = useState<Record<string, VenuePhoto[]>>({});
  const [gallerySavedId, setGallerySavedId] = useState<string | null>(null);
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1);
  const [botProgressStep, setBotProgressStep] = useState<number>(0);
  const [submittedBotVenue, setSubmittedBotVenue] = useState<Venue | null>(null);
  const [regResult, setRegResult] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [submittingVenue, setSubmittingVenue] = useState(false);

  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');

  useEffect(() => {
    if (!submittedBotVenue || botProgressStep >= 4) return;
    const t = setTimeout(() => {
      setBotProgressStep((s) => Math.min(4, s + 1));
    }, 550);
    return () => clearTimeout(t);
  }, [submittedBotVenue, botProgressStep]);

  const appendUploadedFiles = async (
    files: FileList | File[],
    target: 'registration' | string,
  ) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploadingPhotos(true);
    try {
      const processed: VenuePhoto[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const url = await readAndCompressImageFile(file);
        const angleCycle = (['interior', 'exterior', 'surroundings'] as const)[i % 3];
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        processed.push({
          id: `photo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          url,
          angle: angleCycle,
          caption: cleanName || `Venue View ${i + 1}`,
        });
      }

      if (target === 'registration') {
        setRegPhotos((prev) => [...prev, ...processed]);
      } else {
        setDraftPhotosByVenue((prev) => ({
          ...prev,
          [target]: [...(prev[target] || []), ...processed],
        }));
      }
    } finally {
      setUploadingPhotos(false);
    }
  };

  const loadArchitecturalSamples = () => {
    const baseName = regName.trim() || 'Event Centre';
    setRegPhotos([
      {
        id: `sample-${Date.now()}-1`,
        url: `preset:${regTheme}:interior`,
        angle: 'interior',
        caption: `${baseName} — Main Event Hall`,
      },
      {
        id: `sample-${Date.now()}-2`,
        url: `preset:${regTheme}:exterior`,
        angle: 'exterior',
        caption: `${baseName} — Architectural Entrance`,
      },
      {
        id: `sample-${Date.now()}-3`,
        url: `preset:${regTheme}:surroundings`,
        angle: 'surroundings',
        caption: `${baseName} — Courtyard & Grounds`,
      },
    ]);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || regDesc.trim().length < 25 || !regAddress.trim()) {
      setRegResult({
        type: 'error',
        text: 'Enter a venue name, full street address, and a description of at least 25 characters.',
      });
      return;
    }

    const finalPhotos: VenuePhoto[] =
      regPhotos.length > 0
        ? regPhotos
        : [
            {
              id: `default-${Date.now()}`,
              url: `preset:${regTheme}:interior`,
              angle: 'interior',
              caption: `${regName.trim()} — Main Showcase`,
            },
          ];

    setSubmittingVenue(true);
    setRegResult(null);
    const res = await onCreateVenue({
      name: regName.trim(),
      description: regDesc.trim(),
      country: regCountry,
      region: regRegion,
      city: regCity,
      address: regAddress.trim(),
      coordinates: regCoords,
      capacity: regCapacity,
      bookingCharge: regCharge,
      currency: regCurrency,
      visualTheme: regTheme,
      facilities: regFacilities,
      eventTypes: regEventTypes,
      ownerId: user.id,
      ownerName: user.name,
      planningContact: {
        name: regContactName,
        phone: regPhone,
        email: regEmail,
        momoNumber: regMomo,
        momoNetwork: regMomoNet,
        bankAccount: regBank,
      },
      images: buildVenueImagesFromPhotos(finalPhotos, regTheme),
    });
    setSubmittingVenue(false);

    if (!res.ok) {
      setRegResult({ type: 'error', text: res.error || 'Registration failed.' });
    } else if (res.venue) {
      setSubmittedBotVenue(res.venue);
      setBotProgressStep(1);
      setRegName('');
      setRegDesc('');
      setRegAddress('');
      setRegPhotos([]);
    }
  };

  // ============================================================================
  // SUB-TAB: MULTI-STEP REGISTRATION + REAL-TIME VENUZA VERIFICATION BOT
  // ============================================================================
  if (activeSubTab === 'register') {
    if (submittedBotVenue) {
      return (
        <section className="mx-auto max-w-3xl px-4 sm:px-8 py-8 pb-24">
          <div className="rounded-2xl border border-[#7c5cff]/40 bg-[#121432] p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c04a]">
                  VENUZA Verification Bot
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  {submittedBotVenue.name}
                </h1>
                <p className="text-sm text-[#c5cae3] mt-1">
                  Automated integrity checks running prior to Website Admin review.
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7c5cff]/20 text-[#a78bfa]">
                <Bot className="h-6 w-6" />
              </div>
            </div>

            <div className="space-y-3">
              {submittedBotVenue.botReport.checks.map((chk, idx) => {
                const completed = botProgressStep > idx;
                const active = botProgressStep === idx;
                return (
                  <motion.div
                    key={chk.label}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className={`rounded-xl border p-4 flex items-start gap-3 ${
                      completed
                        ? chk.passed
                          ? 'border-emerald-500/40 bg-emerald-500/10'
                          : 'border-amber-500/40 bg-amber-500/10'
                        : 'border-white/10 bg-[#0a0b1e]'
                    }`}
                  >
                    {completed ? (
                      chk.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      )
                    ) : active ? (
                      <Loader2 className="h-5 w-5 text-[#f5c04a] animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-[#848ab0] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-white">{chk.label}</p>
                      <p className="text-xs text-[#c5cae3] mt-0.5">
                        {completed ? chk.detail : 'Scanning submitted record...'}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {botProgressStep >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[#f5c04a]/40 bg-[#f5c04a]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <p className="text-sm font-semibold text-[#f5c04a]">
                    Routed to Website Admin ({submittedBotVenue.botReport.score}% Bot Score)
                  </p>
                  <p className="text-xs text-[#c5cae3] mt-0.5">
                    {submittedBotVenue.botReport.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedBotVenue(null);
                      setRegStep(1);
                      onChangeSubTab('centres');
                    }}
                    className="min-h-[42px] rounded-xl bg-[#f5c04a] px-4 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166]"
                  >
                    View My Centres
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmittedBotVenue(null);
                      setRegStep(1);
                    }}
                    className="min-h-[42px] rounded-xl border border-white/15 px-4 text-xs font-medium text-white"
                  >
                    Register Another
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>
      );
    }

    const steps = [
      { id: 1 as const, label: '01. Identity' },
      { id: 2 as const, label: '02. Location' },
      { id: 3 as const, label: '03. Payment' },
      { id: 4 as const, label: '04. Photos' },
    ];

    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-8 py-6 pb-24">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[#7c5cff]">
            Centre Owner Onboarding
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
            Register an Event Centre
          </h1>
          <p className="text-sm text-[#c5cae3] mt-1">
            Complete the 4 steps below. The VENUZA Verification Bot validates your data before Admin approval.
          </p>
        </div>

        {/* Interactive Step Switcher */}
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setRegStep(s.id)}
              className={`min-h-[42px] rounded-xl px-3 text-xs font-semibold border transition-colors ${
                regStep === s.id
                  ? 'border-[#f5c04a] bg-[#f5c04a]/15 text-[#f5c04a]'
                  : regStep > s.id
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/10 bg-[#121432] text-[#848ab0]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegisterSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {regStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 sm:p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  1. Centre Name, Capacity & Description
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Centre Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Labone Velvet Auditorium"
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Architectural Style</label>
                    <select
                      value={regTheme}
                      onChange={(e) => setRegTheme(e.target.value as VenueVisualTheme)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    >
                      <option value="grand_ballroom">Grand Ballroom</option>
                      <option value="glass_pavilion">Glass Pavilion</option>
                      <option value="auditorium_stage">Conference Auditorium</option>
                      <option value="rooftop_terrace">Rooftop Terrace</option>
                      <option value="courtyard_garden">Botanical Courtyard</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#c5cae3] block mb-1">
                    Venue Description (min 25 chars for Verification Bot)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={regDesc}
                    onChange={(e) => setRegDesc(e.target.value)}
                    placeholder="Describe stage setup, acoustics, power backup, parking, and catering suites..."
                    className="w-full rounded-xl border border-white/15 bg-[#0a0b1e] p-3.5 text-sm text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Max Guest Capacity</label>
                    <input
                      type="number"
                      min={20}
                      value={regCapacity}
                      onChange={(e) => setRegCapacity(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white font-mono-num"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-[#c5cae3] mb-1.5">Supported Event Types</p>
                    <div className="flex flex-wrap gap-1.5">
                      {EVENT_TYPE_OPTIONS.map((et) => {
                        const active = regEventTypes.includes(et);
                        return (
                          <button
                            key={et}
                            type="button"
                            onClick={() =>
                              setRegEventTypes((prev) =>
                                active ? prev.filter((x) => x !== et) : [...prev, et],
                              )
                            }
                            className={`min-h-[36px] rounded-lg px-2.5 text-xs font-medium border transition-colors ${
                              active
                                ? 'border-[#7c5cff] bg-[#7c5cff]/25 text-white'
                                : 'border-white/10 bg-[#0a0b1e] text-[#c5cae3]'
                            }`}
                          >
                            {et}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {regStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 sm:p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  2. Exact Location & Map Pin
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Country</label>
                    <input
                      type="text"
                      value={regCountry}
                      onChange={(e) => setRegCountry(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Region / State</label>
                    <input
                      type="text"
                      value={regRegion}
                      onChange={(e) => setRegRegion(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">City</label>
                    <input
                      type="text"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#c5cae3] block mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="e.g. 24 Liberation Road, Airport Residential, Accra"
                    className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                  />
                </div>
                <VenueMap
                  venueName={regName || 'New Venue Pin'}
                  city={regCity}
                  region={regRegion}
                  country={regCountry}
                  address={regAddress || 'Click on map above to set exact entrance pin'}
                  mapX={regCoords.mapX}
                  mapY={regCoords.mapY}
                  lat={regCoords.lat}
                  lng={regCoords.lng}
                  editable
                  onPinChange={setRegCoords}
                />
              </motion.div>
            )}

            {regStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 sm:p-6 space-y-4"
              >
                <h2 className="font-display text-lg font-semibold text-white">
                  3. Booking Charge, Contact & Payment Receiving Account
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Booking Charge / Day</label>
                    <input
                      type="number"
                      min={100}
                      value={regCharge}
                      onChange={(e) => setRegCharge(Number(e.target.value))}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Receiving Currency</label>
                    <select
                      value={regCurrency}
                      onChange={(e) => setRegCurrency(e.target.value as CurrencyCode)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    >
                      {(Object.keys(CURRENCY_META) as CurrencyCode[]).map((c) => (
                        <option key={c} value={c}>
                          {CURRENCY_META[c].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Planning Contact Name</label>
                    <input
                      type="text"
                      value={regContactName}
                      onChange={(e) => setRegContactName(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Planning Phone</label>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Planning Email</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Mobile Money Network</label>
                    <select
                      value={regMomoNet}
                      onChange={(e) => setRegMomoNet(e.target.value as 'MTN MoMo' | 'Telecel Cash')}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    >
                      <option value="MTN MoMo">MTN MoMo</option>
                      <option value="Telecel Cash">Telecel Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">MoMo Wallet / Merchant</label>
                    <input
                      type="text"
                      value={regMomo}
                      onChange={(e) => setRegMomo(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#c5cae3] block mb-1">Bank Account</label>
                    <input
                      type="text"
                      value={regBank}
                      onChange={(e) => setRegBank(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-sm text-white"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {regStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-white">
                      4. Upload 1 or More Venue Pictures + Facilities
                    </h2>
                    <p className="text-xs text-[#c5cae3] mt-0.5">
                      Upload 1 picture for a single showcase image, or 2+ pictures to present a formally animated slideshow to bookers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadArchitecturalSamples}
                    className="min-h-[36px] rounded-xl border border-[#7c5cff]/50 bg-[#7c5cff]/15 px-3 text-xs font-medium text-[#c4b5fd] hover:bg-[#7c5cff]/25 transition-colors"
                  >
                    Load 3 Architectural Samples
                  </button>
                </div>

                {/* Multi-File Dropzone */}
                <label
                  onDragOver={(e) => {
                    e.preventDefault();
                    setPhotoDragActive(true);
                  }}
                  onDragLeave={() => setPhotoDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setPhotoDragActive(false);
                    if (e.dataTransfer.files?.length) {
                      appendUploadedFiles(e.dataTransfer.files, 'registration');
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-7 text-center cursor-pointer transition-colors ${
                    photoDragActive
                      ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                      : 'border-white/20 bg-[#0a0b1e] hover:border-[#f5c04a]/70'
                  }`}
                >
                  {uploadingPhotos ? (
                    <Loader2 className="h-7 w-7 text-[#f5c04a] animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7 text-[#f5c04a]" />
                  )}
                  <p className="text-sm font-semibold text-white">
                    {uploadingPhotos
                      ? 'Optimizing uploaded pictures...'
                      : regPhotos.length === 0
                        ? 'Click or drag & drop 1 or more venue pictures'
                        : `Add more pictures (${regPhotos.length} uploaded)`}
                  </p>
                  <p className="text-xs text-[#848ab0]">
                    Select one file or hold Ctrl/Cmd to upload multiple JPG, PNG, or WebP photos at once
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        appendUploadedFiles(e.target.files, 'registration');
                        e.target.value = '';
                      }
                    }}
                    className="sr-only"
                  />
                </label>

                {/* Presentation Mode Status Banner */}
                <div
                  className={`rounded-xl border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
                    regPhotos.length > 1
                      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
                      : regPhotos.length === 1
                        ? 'border-[#F59E0B]/35 bg-[#F59E0B]/10 text-[#fde68a]'
                        : 'border-white/10 bg-[#0a0b1e] text-[#c5cae3]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Images className="h-4 w-4 shrink-0" />
                    {regPhotos.length > 1
                      ? `${regPhotos.length} pictures ready — Bookers will experience a formally animated slideshow with slide controls and filmstrip.`
                      : regPhotos.length === 1
                        ? '1 picture uploaded — Bookers will see a clean single showcase image. Upload 1+ more to unlock the animated slideshow.'
                        : 'No custom pictures uploaded yet — if left blank, 1 architectural sample frame will be attached.'}
                  </span>
                  <span className="font-mono-num font-bold shrink-0">
                    {regPhotos.length} {regPhotos.length === 1 ? 'photo' : 'photos'}
                  </span>
                </div>

                {/* Uploaded Pictures List (Reorder, Tag Angle, Caption, Remove) */}
                {regPhotos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="rounded-xl border border-white/15 bg-[#0a0b1e] overflow-hidden flex flex-col"
                      >
                        <div className="relative h-36 w-full">
                          <VenueVisual
                            src={photo.url}
                            theme={regTheme}
                            angle={photo.angle}
                            venueName={regName || 'Venue Preview'}
                            className="h-full w-full"
                          />
                          <span className="absolute top-2 left-2 rounded-md bg-[#0B0F19]/85 border border-white/15 px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#F59E0B]">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRegPhotos((prev) => prev.filter((item) => item.id !== photo.id))
                            }
                            aria-label={`Remove photo ${idx + 1}`}
                            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B0F19]/85 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="p-3 space-y-2">
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) =>
                              setRegPhotos((prev) =>
                                prev.map((item) =>
                                  item.id === photo.id
                                    ? { ...item, caption: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="Slide caption..."
                            className="w-full rounded-lg border border-white/10 bg-[#121432] px-2.5 py-1.5 text-xs text-white focus:border-[#F59E0B] focus:outline-none"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <select
                              aria-label={`Photo ${idx + 1} angle`}
                              value={photo.angle}
                              onChange={(e) =>
                                setRegPhotos((prev) =>
                                  prev.map((item) =>
                                    item.id === photo.id
                                      ? {
                                          ...item,
                                          angle: e.target.value as
                                            | 'interior'
                                            | 'exterior'
                                            | 'surroundings',
                                        }
                                      : item,
                                  ),
                                )
                              }
                              className="rounded-lg border border-white/10 bg-[#121432] px-2 py-1 text-[11px] text-[#c5cae3]"
                            >
                              <option value="interior">Interior</option>
                              <option value="exterior">Exterior</option>
                              <option value="surroundings">Surroundings</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  setRegPhotos((prev) => {
                                    const copy = [...prev];
                                    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                    return copy;
                                  })
                                }
                                aria-label="Move photo earlier"
                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-white/10 text-white disabled:opacity-30 hover:border-[#F59E0B]"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === regPhotos.length - 1}
                                onClick={() =>
                                  setRegPhotos((prev) => {
                                    const copy = [...prev];
                                    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                    return copy;
                                  })
                                }
                                aria-label="Move photo later"
                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-white/10 text-white disabled:opacity-30 hover:border-[#F59E0B]"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="text-xs text-[#c5cae3] mb-2">Available Facilities</p>
                  <div className="flex flex-wrap gap-2">
                    {FACILITY_OPTIONS.map((fac) => {
                      const active = regFacilities.includes(fac);
                      return (
                        <button
                          key={fac}
                          type="button"
                          onClick={() =>
                            setRegFacilities((prev) =>
                              active ? prev.filter((x) => x !== fac) : [...prev, fac],
                            )
                          }
                          className={`min-h-[38px] rounded-xl px-3 py-1.5 text-xs font-medium border transition-colors ${
                            active
                              ? 'border-[#f5c04a] bg-[#f5c04a]/15 text-[#f5c04a]'
                              : 'border-white/10 bg-[#0a0b1e] text-[#c5cae3]'
                          }`}
                        >
                          {fac}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {regResult && (
            <div
              role="alert"
              className={`rounded-2xl p-4 text-sm border ${
                regResult.type === 'error'
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              }`}
            >
              {regResult.text}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (regStep > 1) setRegStep((s) => (s - 1) as 1 | 2 | 3 | 4);
                else onChangeSubTab('centres');
              }}
              className="min-h-[46px] inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>{regStep === 1 ? 'Cancel' : 'Previous'}</span>
            </button>

            {regStep < 4 ? (
              <button
                type="button"
                onClick={() => setRegStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                className="min-h-[46px] inline-flex items-center gap-2 rounded-xl bg-[#f5c04a] px-6 py-2.5 text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166]"
              >
                <span>Next Step</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submittingVenue}
                className="min-h-[46px] rounded-xl bg-[#f5c04a] px-6 py-2.5 text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] disabled:opacity-60"
              >
                {submittingVenue ? 'Running Verification Bot...' : 'Submit to Verification Bot'}
              </button>
            )}
          </div>
        </form>
      </section>
    );
  }

  // ============================================================================
  // SUB-TAB: CALENDAR AVAILABILITY MANAGER
  // ============================================================================
  if (activeSubTab === 'calendar') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = Array.from({ length: totalDays }, (_, i) => {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(i + 1).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    });

    const confirmedDateSet = new Set(
      bookings
        .filter((b) => b.venueId === activeCalendarVenue?.id && b.status === 'confirmed')
        .map((b) => b.eventDate),
    );

    const toggleDate = async (dateStr: string) => {
      if (!activeCalendarVenue) return;
      if (confirmedDateSet.has(dateStr)) return; // Double-booking lock
      const exists = activeCalendarVenue.bookedDates.includes(dateStr);
      const nextDates = exists
        ? activeCalendarVenue.bookedDates.filter((d) => d !== dateStr)
        : [...activeCalendarVenue.bookedDates, dateStr].sort();
      await onUpdateVenue(activeCalendarVenue.id, { bookedDates: nextDates });
    };

    return (
      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
              Double-Booking Protection
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
              Manage Booked & Available Dates
            </h1>
          </div>
          <select
            aria-label="Select venue calendar"
            value={activeCalendarVenue?.id || ''}
            onChange={(e) => setCalendarVenueId(e.target.value)}
            className="min-h-[44px] rounded-xl border border-white/15 bg-[#121432] px-4 text-sm text-white"
          >
            {ownedVenues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city})
              </option>
            ))}
          </select>
        </div>

        {activeCalendarVenue && (
          <div className="rounded-2xl border border-white/10 bg-[#121432] p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-white">
                {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} —{' '}
                {activeCalendarVenue.name}
              </h2>
              <span className="text-xs text-[#c5cae3]">
                Tap any date to toggle Booked / Available
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((dateStr) => {
                const isBooked = activeCalendarVenue.bookedDates.includes(dateStr);
                const isLockedByBooking = confirmedDateSet.has(dateStr);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isLockedByBooking}
                    onClick={() => toggleDate(dateStr)}
                    className={`min-h-[54px] rounded-xl border p-2 text-left transition-colors ${
                      isLockedByBooking
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 cursor-not-allowed'
                        : isBooked
                          ? 'border-red-500/40 bg-red-500/15 text-red-200 hover:bg-red-500/25'
                          : 'border-white/10 bg-[#0a0b1e] text-white hover:border-[#f5c04a]'
                    }`}
                  >
                    <span className="font-mono-num text-sm font-bold block">
                      {Number(dateStr.slice(-2))}
                    </span>
                    <span className="text-[10px] block mt-0.5 truncate">
                      {isLockedByBooking ? 'Locked' : isBooked ? 'Booked' : 'Open'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  }

  // ============================================================================
  // SUB-TAB: BOOKING REQUESTS & PAYMENT PROOFS
  // ============================================================================
  if (activeSubTab === 'bookings') {
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
            Incoming Reservations
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Verify Payment Proofs & Lock Dates
          </h1>
        </div>

        {ownerBookings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121432] p-10 text-center text-sm text-[#c5cae3]">
            No incoming booking proofs yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {ownerBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-white/10 bg-[#121432] p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">{b.venueName}</h2>
                    <p className="text-xs text-[#c5cae3]">
                      Booker: <strong className="text-white">{b.bookerName}</strong> ·{' '}
                      {b.bookerContact}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      b.status === 'confirmed'
                        ? 'text-emerald-400'
                        : b.status === 'disputed'
                          ? 'text-red-400'
                          : 'text-[#f5c04a]'
                    }`}
                  >
                    {b.status === 'confirmed'
                      ? 'Confirmed'
                      : b.status === 'disputed'
                        ? 'Disputed'
                        : 'Proof Uploaded'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs border-y border-white/10 py-3">
                  <div>
                    <span className="text-[#848ab0] block">Event Date</span>
                    <span className="font-mono-num text-white font-semibold">{b.eventDate}</span>
                  </div>
                  <div>
                    <span className="text-[#848ab0] block">Amount</span>
                    <span className="font-mono-num text-[#f5c04a] font-semibold">
                      {formatMoney(b.amount, b.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#848ab0] block">Ref ID</span>
                    <span className="font-mono-num text-white">{b.paymentReference}</span>
                  </div>
                </div>

                {b.proofImage && (
                  <div className="rounded-xl border border-white/10 bg-[#0a0b1e] p-3">
                    <p className="text-[11px] text-[#848ab0] mb-2">
                      Uploaded Receipt ({b.proofFileName})
                    </p>
                    <img
                      src={b.proofImage}
                      alt={`Receipt ${b.paymentReference}`}
                      referrerPolicy="no-referrer"
                      className="max-h-48 w-full rounded-lg object-contain bg-black/40"
                    />
                  </div>
                )}

                {b.status === 'payment_uploaded' && (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => onConfirmBooking(b.id)}
                      className="flex-1 min-h-[44px] rounded-xl bg-[#f5c04a] px-4 py-2 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166]"
                    >
                      Confirm Receipt & Lock Date
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisputeBookingId(b.id)}
                      className="min-h-[44px] rounded-xl border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/15"
                    >
                      Flag Dispute
                    </button>
                  </div>
                )}

                {disputeBookingId === b.id && (
                  <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <input
                      type="text"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Describe discrepancy (e.g. reference not found in MoMo statement)..."
                      className="w-full rounded-lg border border-white/15 bg-[#0a0b1e] px-3 py-2 text-xs text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDisputeBooking(
                            b.id,
                            disputeReason || 'Payment receipt could not be matched in statement.',
                          );
                          setDisputeBookingId(null);
                          setDisputeReason('');
                        }}
                        className="min-h-[36px] rounded-lg bg-red-500 px-3 text-xs font-semibold text-white"
                      >
                        Escalate to Admin
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisputeBookingId(null)}
                        className="min-h-[36px] px-3 text-xs text-[#c5cae3]"
                      >
                        Cancel
                      </button>
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
  // SUB-TAB: SUBSCRIPTION & PRICING MODEL
  // ============================================================================
  if (activeSubTab === 'subscription') {
    const primaryVenue = ownedVenues[0];
    const sampleCharge = primaryVenue?.bookingCharge || 18500;
    const sampleCurrency = primaryVenue?.currency || 'GHS';
    const pricing = calculateSubscriptionPricing(sampleCharge);

    return (
      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
              Owner Subscription
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
              {subscription.plan === 'super_package'
                ? 'Super Package Active (15 Months)'
                : subscription.plan === 'standard_trial'
                  ? `14-Day Free Trial (${subscription.trialDaysRemaining} days left)`
                  : 'Standard Monthly Plan'}
            </h1>
            <p className="text-xs text-[#c5cae3] mt-1">
              Calculated on {primaryVenue?.name || 'your primary venue'} booking charge of{' '}
              <span className="font-mono-num text-white">
                {formatMoney(sampleCharge, sampleCurrency)}
              </span>
            </p>
          </div>
          <CreditCard className="h-8 w-8 text-[#f5c04a] shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Standard Plan */}
          <div
            className={`rounded-2xl border p-6 flex flex-col justify-between ${
              subscription.plan !== 'super_package'
                ? 'border-[#f5c04a] bg-[#121432]'
                : 'border-white/10 bg-[#121432]'
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c04a]">
                For Single-Season & Growing Centres
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-1">Standard Plan</h2>
              <p className="mt-3 font-mono-num text-3xl font-bold text-white">
                {formatMoney(pricing.monthlyStandard, sampleCurrency)}
                <span className="text-sm font-normal text-[#848ab0]"> / month</span>
              </p>
              <p className="mt-2 text-xs text-[#c5cae3]">
                10% of your listed booking fee per month, starting with a 14-day free trial.
              </p>
              <ul className="mt-5 space-y-2 text-xs text-[#c5cae3]">
                <li>· 14-day free trial before first billing</li>
                <li>· Unlimited booking proof confirmations</li>
                <li>· Real-time calendar double-booking lock</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSubscription('standard_trial')}
              className="mt-6 w-full min-h-[46px] rounded-xl border border-[#f5c04a] px-4 py-2.5 text-sm font-semibold text-[#f5c04a] hover:bg-[#f5c04a] hover:text-[#0a0b1e] transition-colors"
            >
              {subscription.plan === 'standard_trial' ? 'Current Plan (14-Day Trial)' : 'Switch to Standard'}
            </button>
          </div>

          {/* Super Package */}
          <div
            className={`rounded-2xl border p-6 flex flex-col justify-between ${
              subscription.plan === 'super_package'
                ? 'border-[#7c5cff] bg-[#16183d]'
                : 'border-white/15 bg-[#121432]'
            }`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#9c84ff]">
                For Multi-Quarter High-Volume Venues
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-1">
                Super Package (15 Months)
              </h2>
              <p className="mt-3 font-mono-num text-3xl font-bold text-[#f5c04a]">
                {formatMoney(pricing.superPackageTotal, sampleCurrency)}
                <span className="text-sm font-normal text-[#848ab0]"> / 15 months</span>
              </p>
              <p className="mt-2 text-xs text-[#c5cae3]">
                15 months upfront (10% × 15 − 10% discount) — saves{' '}
                <strong className="font-mono-num text-white">
                  {formatMoney(pricing.superPackageDiscount, sampleCurrency)}
                </strong>{' '}
                ({formatMoney(pricing.superPackageEffectiveMonthly, sampleCurrency)}/mo effective).
              </p>
              <ul className="mt-5 space-y-2 text-xs text-[#c5cae3]">
                <li>· 10% total discount on 15-month commitment</li>
                <li>· Priority placement in regional city search</li>
                <li>· Dedicated verification & dispute fast-track</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSubscription('super_package')}
              className="mt-6 w-full min-h-[46px] rounded-xl bg-[#7c5cff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8e72ff] transition-colors"
            >
              {subscription.plan === 'super_package'
                ? 'Super Package Active'
                : 'Activate Super Package'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  // ============================================================================
  // DEFAULT SUB-TAB: MY CENTRES & DYNAMIC PRICING
  // ============================================================================
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
            Centre Owner Workspace
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Your Event Centres & Pricing
          </h1>
        </div>
        <button
          type="button"
          onClick={() => onChangeSubTab('register')}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#f5c04a] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>List New Centre</span>
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-4">
          <span className="text-xs text-[#848ab0]">Listed Centres</span>
          <p className="font-mono-num text-2xl font-bold text-white mt-1">{ownedVenues.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-4">
          <span className="text-xs text-[#848ab0]">Awaiting Proof Check</span>
          <p className="font-mono-num text-2xl font-bold text-[#f5c04a] mt-1">
            {ownerBookings.filter((b) => b.status === 'payment_uploaded').length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-4">
          <span className="text-xs text-[#848ab0]">Confirmed Dates</span>
          <p className="font-mono-num text-2xl font-bold text-emerald-400 mt-1">
            {ownerBookings.filter((b) => b.status === 'confirmed').length}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-4">
          <span className="text-xs text-[#848ab0]">Plan Status</span>
          <p className="text-sm font-semibold text-white mt-2">
            {subscription.plan === 'super_package'
              ? 'Super Package'
              : `Trial (${subscription.trialDaysRemaining}d left)`}
          </p>
        </div>
      </div>

      {/* Venues List with Live Price Editor, Photo Manager & Verification Bot Status */}
      <div className="space-y-4">
        {ownedVenues.map((venue) => {
          const draftPrice = priceDrafts[venue.id] ?? venue.bookingCharge;
          const currentPhotos = normalizeVenuePhotos(venue);
          const isEditingPhotos = editingPhotosVenueId === venue.id;
          const draftPhotos = draftPhotosByVenue[venue.id] ?? currentPhotos;

          return (
            <div
              key={venue.id}
              className="rounded-2xl border border-white/10 bg-[#121432] p-5 space-y-4"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-3 relative">
                  <VenueVisual
                    src={currentPhotos[0]?.url || venue.images.interior}
                    theme={venue.visualTheme}
                    angle={currentPhotos[0]?.angle || 'interior'}
                    venueName={venue.name}
                    className="h-36 w-full rounded-xl"
                  />
                  <span className="absolute bottom-2 right-2 rounded-md border border-white/15 bg-[#0B0F19]/85 px-2 py-0.5 font-mono-num text-[11px] font-medium text-[#F59E0B]">
                    {currentPhotos.length} {currentPhotos.length === 1 ? 'photo' : 'slides'}
                  </span>
                </div>

                <div className="lg:col-span-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`font-semibold inline-flex items-center gap-1 ${
                        venue.status === 'approved'
                          ? 'text-emerald-400'
                          : venue.status === 'pending_approval'
                            ? 'text-[#f5c04a]'
                            : 'text-red-400'
                      }`}
                    >
                      {venue.status === 'approved' ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : venue.status === 'pending_approval' ? (
                        <Clock className="h-3.5 w-3.5" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      )}
                      {venue.status === 'approved'
                        ? 'Live on Venuza'
                        : venue.status === 'pending_approval'
                          ? 'Pending Admin Approval'
                          : venue.status === 'changes_requested'
                            ? 'Changes Requested'
                            : 'Rejected'}
                    </span>
                    <span className="text-[#848ab0]">·</span>
                    <span className="text-[#c5cae3]">
                      {venue.city}, {venue.country}
                    </span>
                  </div>

                  <h2 className="font-display text-xl font-bold text-white">{venue.name}</h2>

                  <div className="rounded-xl border border-white/10 bg-[#0a0b1e] p-3 text-xs text-[#c5cae3] flex items-start gap-2.5">
                    <Bot className="h-4 w-4 text-[#7c5cff] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-white">
                        Verification Bot ({venue.botReport.score}%):
                      </span>{' '}
                      {venue.botReport.summary}
                      {venue.adminNote && (
                        <p className="mt-1 text-[#f5c04a]">Admin note: {venue.adminNote}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-3 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-5">
                  <label className="text-xs text-[#848ab0] block">
                    Update Booking Charge ({venue.currency})
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={100}
                      value={draftPrice}
                      onChange={(e) =>
                        setPriceDrafts((prev) => ({ ...prev, [venue.id]: Number(e.target.value) }))
                      }
                      className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-sm text-white font-mono-num"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await onUpdateVenue(venue.id, { bookingCharge: draftPrice });
                        setPriceSavedId(venue.id);
                        setTimeout(() => setPriceSavedId(null), 2000);
                      }}
                      className="min-h-[42px] rounded-xl bg-[#f5c04a] px-4 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166] whitespace-nowrap shrink-0"
                    >
                      {priceSavedId === venue.id ? 'Saved' : 'Update'}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#848ab0]">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingPhotos) {
                          setEditingPhotosVenueId(null);
                        } else {
                          setDraftPhotosByVenue((prev) => ({
                            ...prev,
                            [venue.id]: currentPhotos,
                          }));
                          setEditingPhotosVenueId(venue.id);
                        }
                      }}
                      className="text-[#a78bfa] hover:underline inline-flex items-center gap-1"
                    >
                      <Images className="h-3.5 w-3.5" />
                      <span>
                        {isEditingPhotos
                          ? 'Close Photos'
                          : `Manage Photos (${currentPhotos.length})`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCalendarVenueId(venue.id);
                        onChangeSubTab('calendar');
                      }}
                      className="text-[#f5c04a] hover:underline inline-flex items-center gap-1"
                    >
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Edit Calendar ({venue.bookedDates.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Multi-Photo Gallery Manager for Existing Venues */}
              {isEditingPhotos && (
                <div className="border-t border-white/10 pt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                        Gallery & Slideshow Manager
                      </p>
                      <p className="text-xs text-[#c5cae3] mt-0.5">
                        {draftPhotos.length > 1
                          ? `${draftPhotos.length} pictures active — bookers see a formally animated slideshow.`
                          : '1 picture active — upload another picture to enable the animated slideshow.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="min-h-[38px] cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-[#f5c04a]/50 bg-[#f5c04a]/10 px-3.5 text-xs font-semibold text-[#f5c04a] hover:bg-[#f5c04a]/20">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Pictures</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              appendUploadedFiles(e.target.files, venue.id);
                              e.target.value = '';
                            }
                          }}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateVenue(venue.id, {
                            images: buildVenueImagesFromPhotos(draftPhotos, venue.visualTheme),
                          });
                          setGallerySavedId(venue.id);
                          setTimeout(() => setGallerySavedId(null), 2000);
                        }}
                        className="min-h-[38px] rounded-xl bg-[#f5c04a] px-4 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166]"
                      >
                        {gallerySavedId === venue.id ? 'Gallery Saved' : 'Save Gallery'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {draftPhotos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="rounded-xl border border-white/10 bg-[#0a0b1e] overflow-hidden"
                      >
                        <div className="relative h-28 w-full">
                          <VenueVisual
                            src={photo.url}
                            theme={venue.visualTheme}
                            angle={photo.angle}
                            venueName={venue.name}
                            className="h-full w-full"
                          />
                          <span className="absolute top-2 left-2 rounded bg-[#0B0F19]/85 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#F59E0B]">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          {draftPhotos.length > 1 && (
                            <button
                              type="button"
                              aria-label="Remove photo"
                              onClick={() =>
                                setDraftPhotosByVenue((prev) => ({
                                  ...prev,
                                  [venue.id]: (prev[venue.id] || draftPhotos).filter(
                                    (item) => item.id !== photo.id,
                                  ),
                                }))
                              }
                              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-md bg-[#0B0F19]/85 border border-red-500/40 text-red-300 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <div className="p-2.5 space-y-1.5">
                          <input
                            type="text"
                            value={photo.caption}
                            onChange={(e) =>
                              setDraftPhotosByVenue((prev) => ({
                                ...prev,
                                [venue.id]: (prev[venue.id] || draftPhotos).map((item) =>
                                  item.id === photo.id
                                    ? { ...item, caption: e.target.value }
                                    : item,
                                ),
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-[#121432] px-2 py-1 text-[11px] text-white"
                          />
                          <div className="flex items-center justify-between gap-1">
                            <select
                              value={photo.angle}
                              onChange={(e) =>
                                setDraftPhotosByVenue((prev) => ({
                                  ...prev,
                                  [venue.id]: (prev[venue.id] || draftPhotos).map((item) =>
                                    item.id === photo.id
                                      ? {
                                          ...item,
                                          angle: e.target.value as
                                            | 'interior'
                                            | 'exterior'
                                            | 'surroundings',
                                        }
                                      : item,
                                  ),
                                }))
                              }
                              className="rounded border border-white/10 bg-[#121432] px-1.5 py-0.5 text-[10px] text-[#c5cae3]"
                            >
                              <option value="interior">Interior</option>
                              <option value="exterior">Exterior</option>
                              <option value="surroundings">Surroundings</option>
                            </select>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() =>
                                  setDraftPhotosByVenue((prev) => {
                                    const copy = [...(prev[venue.id] || draftPhotos)];
                                    [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                                    return { ...prev, [venue.id]: copy };
                                  })
                                }
                                className="h-6 w-6 flex items-center justify-center rounded border border-white/10 text-white disabled:opacity-30"
                              >
                                <ChevronLeft className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === draftPhotos.length - 1}
                                onClick={() =>
                                  setDraftPhotosByVenue((prev) => {
                                    const copy = [...(prev[venue.id] || draftPhotos)];
                                    [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                                    return { ...prev, [venue.id]: copy };
                                  })
                                }
                                className="h-6 w-6 flex items-center justify-center rounded border border-white/10 text-white disabled:opacity-30"
                              >
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
