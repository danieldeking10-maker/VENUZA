import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  Calendar,
  Compass,
  CreditCard,
  FileCheck,
  PlusCircle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react';
import type {
  AuthUser,
  CurrencyCode,
  PaymentMethod,
  SubscriptionPlan,
  UserRole,
  VenueImages,
  VenuzaDatabase,
} from './types/venuza';
import { Welcome3DExperience } from './components/Welcome3DExperience';
import { BookerView } from './components/BookerView';
import { OwnerView, type OwnerSubTab } from './components/OwnerView';
import { AdminView, type AdminSubTab } from './components/AdminView';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showWelcome3D, setShowWelcome3D] = useState<boolean>(true);
  const [db, setDb] = useState<VenuzaDatabase | null>(null);
  const [loadingDb, setLoadingDb] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string>('');

  // Role sub-navigation states
  const [bookerTab, setBookerTab] = useState<'explore' | 'bookings'>('explore');
  const [ownerTab, setOwnerTab] = useState<OwnerSubTab>('centres');
  const [adminTab, setAdminTab] = useState<AdminSubTab>('approvals');
  const [notifOpen, setNotifOpen] = useState<boolean>(false);

  const fetchDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error('Failed to load Venuza database.');
      const data = (await res.json()) as VenuzaDatabase;
      setDb(data);
      setApiError('');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to reach Venuza backend.');
    } finally {
      setLoadingDb(false);
    }
  }, []);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  const handleEnterWorkspace = (enteredUser: AuthUser) => {
    setUser(enteredUser);
    setShowWelcome3D(false);
    window.scrollTo({ top: 0 });
  };

  const switchRole = (role: UserRole) => {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            id: role === 'owner' ? 'owner-demo' : role === 'admin' ? 'admin-demo' : 'booker-demo',
            role,
          }
        : {
            id: role === 'owner' ? 'owner-demo' : role === 'admin' ? 'admin-demo' : 'booker-demo',
            name: 'Efua Darko',
            identifier: 'efua.darko@venuza.app',
            role,
            avatarInitials: 'ED',
          },
    );
    setNotifOpen(false);
  };

  // ============================================================================
  // DATABASE MUTATION HANDLERS
  // ============================================================================
  const handleCreateBooking = async (payload: {
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
  }) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Booking failed.' };
    await fetchDatabase();
    return { ok: true };
  };

  const handleSubmitReview = async (payload: {
    venueId: string;
    bookingId: string;
    bookerName: string;
    rating: number;
    comment: string;
  }) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Could not submit review.' };
    await fetchDatabase();
    return { ok: true };
  };

  const handleCreateVenue = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Venue registration failed.' };
    await fetchDatabase();
    return { ok: true, venue: data };
  };

  const handleUpdateVenue = async (
    venueId: string,
    payload: {
      bookingCharge?: number;
      currency?: CurrencyCode;
      bookedDates?: string[];
      images?: VenueImages;
    },
  ) => {
    const res = await fetch(`/api/venues/${venueId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Update failed.' };
    await fetchDatabase();
    return { ok: true };
  };

  const handleConfirmBooking = async (bookingId: string) => {
    const res = await fetch(`/api/bookings/${bookingId}/confirm`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Confirmation failed.' };
    await fetchDatabase();
    return { ok: true };
  };

  const handleDisputeBooking = async (bookingId: string, reason: string) => {
    const res = await fetch(`/api/bookings/${bookingId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || 'Dispute failed.' };
    await fetchDatabase();
    return { ok: true };
  };

  const handleReviewVenue = async (
    venueId: string,
    decision: 'approved' | 'changes_requested' | 'rejected',
    note: string,
  ) => {
    await fetch(`/api/admin/venues/${venueId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision, note }),
    });
    await fetchDatabase();
  };

  const handleResolveDispute = async (
    bookingId: string,
    resolution: 'confirmed' | 'rejected',
    note: string,
  ) => {
    await fetch(`/api/admin/disputes/${bookingId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, note }),
    });
    await fetchDatabase();
  };

  const handleUpdateSubscription = async (plan: SubscriptionPlan) => {
    await fetch('/api/owner/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: user?.id || 'owner-demo', plan }),
    });
    await fetchDatabase();
  };

  const markNotificationsRead = async () => {
    if (!user) return;
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: user.role }),
    });
    await fetchDatabase();
  };

  const roleNotifications = useMemo(() => {
    if (!db || !user) return [];
    return db.notifications.filter((n) => n.targetRole === user.role || n.targetRole === 'all');
  }, [db, user]);

  const unreadCount = useMemo(
    () => roleNotifications.filter((n) => !n.read).length,
    [roleNotifications],
  );

  // ============================================================================
  // WELCOME 3D EXPERIENCE
  // ============================================================================
  if (showWelcome3D || !user) {
    return <Welcome3DExperience onEnterWorkspace={handleEnterWorkspace} />;
  }

  // ============================================================================
  // ACTIVE WORKSPACE SHELL (DESKTOP + MOBILE TOUCH APP)
  // ============================================================================
  const activeRole = user.role;
  const ownerSubscription = db?.subscriptions.find((s) => s.ownerId === user.id) ||
    db?.subscriptions[0] || {
      ownerId: user.id,
      plan: 'standard_trial' as const,
      trialDaysRemaining: 14,
      status: 'trialing' as const,
      nextBillingDate: '',
    };

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0b1e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-8 h-14 sm:h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => setShowWelcome3D(true)}
            className="font-display text-lg font-bold tracking-[0.2em] text-white hover:text-[#f5c04a] transition-colors whitespace-nowrap shrink-0"
          >
            VENUZA
          </button>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {activeRole === 'booker' && (
              <>
                <button
                  type="button"
                  onClick={() => setBookerTab('explore')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    bookerTab === 'explore'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Explore Centres
                </button>
                <button
                  type="button"
                  onClick={() => setBookerTab('bookings')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    bookerTab === 'bookings'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  My Bookings
                </button>
              </>
            )}

            {activeRole === 'owner' && (
              <>
                <button
                  type="button"
                  onClick={() => setOwnerTab('centres')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    ownerTab === 'centres'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  My Centres
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('calendar')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    ownerTab === 'calendar'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('bookings')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    ownerTab === 'bookings'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Payment Proofs
                </button>
                <button
                  type="button"
                  onClick={() => setOwnerTab('subscription')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    ownerTab === 'subscription'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Plan & Billing
                </button>
              </>
            )}

            {activeRole === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setAdminTab('approvals')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    adminTab === 'approvals'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Approvals
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('disputes')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    adminTab === 'disputes'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Disputes
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('listings')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    adminTab === 'listings'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Listings
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab('audit')}
                  className={`transition-colors whitespace-nowrap shrink-0 ${
                    adminTab === 'audit'
                      ? 'text-[#f5c04a] underline underline-offset-8'
                      : 'text-[#c5cae3] hover:text-white'
                  }`}
                >
                  Audit Log
                </button>
              </>
            )}
          </nav>

          {/* Zone 3: Single Primary Contextual Action */}
          <div className="shrink-0">
            {activeRole === 'booker' ? (
              <button
                type="button"
                onClick={() => {
                  switchRole('owner');
                  setOwnerTab('register');
                }}
                className="min-h-[40px] rounded-xl bg-[#f5c04a] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] transition-colors whitespace-nowrap shrink-0"
              >
                List a Venue
              </button>
            ) : activeRole === 'owner' ? (
              <button
                type="button"
                onClick={() => setOwnerTab('register')}
                className="min-h-[40px] rounded-xl bg-[#f5c04a] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0a0b1e] hover:bg-[#ffd166] transition-colors whitespace-nowrap shrink-0"
              >
                Register Centre
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchRole('booker')}
                className="min-h-[40px] rounded-xl border border-white/20 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:border-[#f5c04a] transition-colors whitespace-nowrap shrink-0"
              >
                View Live Site
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Workspace Control Toolbar (Role Switcher, Notifications, 3D Stage Link) */}
      <div className="border-b border-white/10 bg-[#0d0f27]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-8 py-2.5">
          <div className="flex items-center gap-1 rounded-xl bg-[#0a0b1e] p-1 border border-white/10">
            {(
              [
                { id: 'booker', label: 'Booker' },
                { id: 'owner', label: 'Centre Owner' },
                { id: 'admin', label: 'Admin' },
              ] as const
            ).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => switchRole(r.id)}
                className={`min-h-[34px] rounded-lg px-3 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeRole === r.id
                    ? 'bg-[#7c5cff] text-white'
                    : 'text-[#c5cae3] hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen && unreadCount > 0) {
                  markNotificationsRead();
                }
              }}
              className="relative min-h-[38px] inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0b1e] px-3 text-xs font-medium text-[#c5cae3] hover:text-white"
            >
              <Bell className="h-4 w-4 text-[#f5c04a]" />
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="font-mono-num text-[11px] font-bold text-[#f5c04a]">
                  ({unreadCount})
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowWelcome3D(true)}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0b1e] px-3 text-xs font-medium text-[#c5cae3] hover:text-[#f5c04a]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#f5c04a]" />
              <span className="hidden sm:inline">3D Welcome</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#c5cae3]">
              <UserCircle2 className="h-4 w-4 text-[#7c5cff]" />
              <span className="truncate max-w-[140px]">{user.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Drawer */}
      {notifOpen && (
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8 pt-4">
          <div className="rounded-2xl border border-[#f5c04a]/30 bg-[#121432] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#f5c04a]">
                Notifications ({activeRole})
              </p>
              <button
                type="button"
                onClick={() => setNotifOpen(false)}
                aria-label="Close notifications"
                className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-[#848ab0] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {roleNotifications.length === 0 ? (
              <p className="text-xs text-[#848ab0]">No notifications for this workspace yet.</p>
            ) : (
              <div className="divide-y divide-white/10">
                {roleNotifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-white">
                        {n.title}{' '}
                        <span className="font-normal text-[#848ab0]">· {n.channel}</span>
                      </p>
                      <p className="text-[#c5cae3] mt-0.5">{n.message}</p>
                    </div>
                    <span className="font-mono-num text-[11px] text-[#848ab0] shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {loadingDb ? (
          <div className="mx-auto max-w-6xl px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl border border-white/10 bg-[#121432] animate-pulse"
              />
            ))}
          </div>
        ) : apiError || !db ? (
          <div className="mx-auto max-w-xl px-4 py-16 text-center">
            <p className="text-sm text-red-300">{apiError || 'Unable to load database.'}</p>
            <button
              type="button"
              onClick={fetchDatabase}
              className="mt-4 min-h-[44px] rounded-xl bg-[#f5c04a] px-5 text-sm font-semibold text-[#0a0b1e]"
            >
              Retry Connection
            </button>
          </div>
        ) : activeRole === 'booker' ? (
          <BookerView
            user={user}
            venues={db.venues}
            bookings={db.bookings}
            reviews={db.reviews}
            activeSubTab={bookerTab}
            onCreateBooking={handleCreateBooking}
            onSubmitReview={handleSubmitReview}
          />
        ) : activeRole === 'owner' ? (
          <OwnerView
            user={user}
            venues={db.venues}
            bookings={db.bookings}
            subscription={ownerSubscription}
            activeSubTab={ownerTab}
            onChangeSubTab={setOwnerTab}
            onCreateVenue={handleCreateVenue}
            onUpdateVenue={handleUpdateVenue}
            onConfirmBooking={handleConfirmBooking}
            onDisputeBooking={handleDisputeBooking}
            onUpdateSubscription={handleUpdateSubscription}
          />
        ) : (
          <AdminView
            venues={db.venues}
            bookings={db.bookings}
            auditLogs={db.auditLogs}
            subscriptions={db.subscriptions}
            activeSubTab={adminTab}
            onReviewVenue={handleReviewVenue}
            onResolveDispute={handleResolveDispute}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Tab Bar (Thumb-Zone Navigation, <= 15% Viewport Height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0b1e]/95 backdrop-blur-md"
      >
        {activeRole === 'booker' && (
          <div className="grid grid-cols-3 h-16 items-center">
            <button
              type="button"
              onClick={() => setBookerTab('explore')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] font-medium ${
                bookerTab === 'explore' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <Compass className="h-5 w-5 mb-0.5" />
              <span>Explore</span>
            </button>
            <button
              type="button"
              onClick={() => setBookerTab('bookings')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[11px] font-medium ${
                bookerTab === 'bookings' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <Calendar className="h-5 w-5 mb-0.5" />
              <span>Bookings</span>
            </button>
            <button
              type="button"
              onClick={() => switchRole('owner')}
              className="flex flex-col items-center justify-center min-h-[44px] text-[11px] font-medium text-[#848ab0]"
            >
              <Building2 className="h-5 w-5 mb-0.5" />
              <span>Owner Mode</span>
            </button>
          </div>
        )}

        {activeRole === 'owner' && (
          <div className="grid grid-cols-4 h-16 items-center">
            <button
              type="button"
              onClick={() => setOwnerTab('centres')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                ownerTab === 'centres' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <Building2 className="h-5 w-5 mb-0.5" />
              <span>Centres</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnerTab('calendar')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                ownerTab === 'calendar' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <Calendar className="h-5 w-5 mb-0.5" />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnerTab('bookings')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                ownerTab === 'bookings' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <FileCheck className="h-5 w-5 mb-0.5" />
              <span>Proofs</span>
            </button>
            <button
              type="button"
              onClick={() => setOwnerTab('subscription')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                ownerTab === 'subscription' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <CreditCard className="h-5 w-5 mb-0.5" />
              <span>Plan</span>
            </button>
          </div>
        )}

        {activeRole === 'admin' && (
          <div className="grid grid-cols-4 h-16 items-center">
            <button
              type="button"
              onClick={() => setAdminTab('approvals')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                adminTab === 'approvals' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <ShieldCheck className="h-5 w-5 mb-0.5" />
              <span>Approvals</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('disputes')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                adminTab === 'disputes' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <ShieldAlert className="h-5 w-5 mb-0.5" />
              <span>Disputes</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('listings')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                adminTab === 'listings' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <Building2 className="h-5 w-5 mb-0.5" />
              <span>Listings</span>
            </button>
            <button
              type="button"
              onClick={() => setAdminTab('audit')}
              className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
                adminTab === 'audit' ? 'text-[#f5c04a]' : 'text-[#848ab0]'
              }`}
            >
              <PlusCircle className="h-5 w-5 mb-0.5" />
              <span>Audit</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
