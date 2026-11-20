import React, { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  AuditLogEntry,
  Booking,
  OwnerSubscription,
  Venue,
} from '../types/venuza';
import { formatMoney } from '../utils/currency';
import { normalizeVenuePhotos } from '../utils/venuePhotos';
import { VenueSlideshow } from './VenueSlideshow';

export type AdminSubTab = 'approvals' | 'disputes' | 'listings' | 'audit';

interface AdminViewProps {
  venues: Venue[];
  bookings: Booking[];
  auditLogs: AuditLogEntry[];
  subscriptions: OwnerSubscription[];
  activeSubTab: AdminSubTab;
  onReviewVenue: (
    venueId: string,
    decision: 'approved' | 'changes_requested' | 'rejected',
    note: string,
  ) => Promise<void>;
  onResolveDispute: (
    bookingId: string,
    resolution: 'confirmed' | 'rejected',
    note: string,
  ) => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = ({
  venues,
  bookings,
  auditLogs,
  subscriptions,
  activeSubTab,
  onReviewVenue,
  onResolveDispute,
}) => {
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [disputeNotes, setDisputeNotes] = useState<Record<string, string>>({});

  const pendingVenues = venues.filter(
    (v) => v.status === 'pending_approval' || v.status === 'changes_requested',
  );
  const disputedBookings = bookings.filter((b) => b.status === 'disputed');

  if (activeSubTab === 'disputes') {
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
            Escrow & Payment Evidence
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Disputes & Receipt Verification
          </h1>
        </div>

        {disputedBookings.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121432] p-10 text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
            <h2 className="font-display text-xl font-semibold text-white">Zero active disputes</h2>
            <p className="mt-2 text-sm text-[#c5cae3]">
              All uploaded Mobile Money and bank payment proofs are currently reconciled.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {disputedBookings.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-red-500/30 bg-[#121432] p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">{b.venueName}</h2>
                    <p className="text-xs text-[#c5cae3]">
                      Booker: {b.bookerName} · Date: <span className="font-mono-num">{b.eventDate}</span>
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-red-400">Disputed</span>
                </div>

                <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  Reason: {b.disputeReason || 'Payment proof requires verification.'}
                </p>

                {b.proofImage && (
                  <img
                    src={b.proofImage}
                    alt={`Disputed proof ${b.paymentReference}`}
                    referrerPolicy="no-referrer"
                    className="max-h-48 w-full rounded-xl object-contain bg-[#0a0b1e] border border-white/10"
                  />
                )}

                <input
                  type="text"
                  value={disputeNotes[b.id] || ''}
                  onChange={(e) =>
                    setDisputeNotes((prev) => ({ ...prev, [b.id]: e.target.value }))
                  }
                  placeholder="Resolution note for audit log..."
                  className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3 text-xs text-white"
                />

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      onResolveDispute(
                        b.id,
                        'confirmed',
                        disputeNotes[b.id] || 'Payment verified against evidence; date locked.',
                      )
                    }
                    className="flex-1 min-h-[42px] rounded-xl bg-emerald-500 px-4 text-xs font-semibold text-white hover:bg-emerald-400"
                  >
                    Approve Payment & Lock Date
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onResolveDispute(
                        b.id,
                        'rejected',
                        disputeNotes[b.id] || 'Invalid payment evidence; date released.',
                      )
                    }
                    className="flex-1 min-h-[42px] rounded-xl border border-red-500/40 px-4 text-xs font-semibold text-red-300 hover:bg-red-500/15"
                  >
                    Reject & Release Date
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (activeSubTab === 'listings') {
    return (
      <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
            Platform Directory
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            All Centres, Owners & Subscriptions
          </h1>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121432]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-[#848ab0]">
              <tr>
                <th className="px-4 py-3.5 font-medium">Event Centre</th>
                <th className="px-4 py-3.5 font-medium">Location</th>
                <th className="px-4 py-3.5 font-medium">Owner</th>
                <th className="px-4 py-3.5 font-medium text-right">Booking Fee</th>
                <th className="px-4 py-3.5 font-medium">Status</th>
                <th className="px-4 py-3.5 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-white">
              {venues.map((v) => {
                const sub = subscriptions.find((s) => s.ownerId === v.ownerId);
                return (
                  <tr key={v.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3.5 font-semibold">{v.name}</td>
                    <td className="px-4 py-3.5 text-[#c5cae3]">
                      {v.city}, {v.country}
                    </td>
                    <td className="px-4 py-3.5 text-[#c5cae3]">{v.ownerName}</td>
                    <td className="px-4 py-3.5 text-right font-mono-num text-[#f5c04a]">
                      {formatMoney(v.bookingCharge, v.currency)}
                    </td>
                    <td className="px-4 py-3.5 capitalize">
                      <span
                        className={
                          v.status === 'approved'
                            ? 'text-emerald-400'
                            : v.status === 'pending_approval'
                              ? 'text-[#f5c04a]'
                              : 'text-red-400'
                        }
                      >
                        {v.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[#c5cae3]">
                      {sub?.plan === 'super_package' ? 'Super (15 mo)' : '14-Day Trial / 10%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  if (activeSubTab === 'audit') {
    return (
      <section className="mx-auto max-w-5xl px-4 sm:px-8 py-6 pb-24 space-y-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#7c5cff]">
            Security & Compliance
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Administrator Audit Log
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#121432] divide-y divide-white/10">
          {auditLogs.map((entry) => (
            <div key={entry.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono-num font-semibold text-[#f5c04a]">{entry.action}</span>
                  <span className="text-[#848ab0]">·</span>
                  <span className="font-medium text-white">{entry.target}</span>
                  <span className="text-[#848ab0]">by {entry.actor}</span>
                </div>
                <p className="mt-1 text-xs text-[#c5cae3]">{entry.detail}</p>
              </div>
              <span className="font-mono-num text-[11px] text-[#848ab0] shrink-0">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ============================================================================
  // DEFAULT SUB-TAB: PENDING APPROVALS & VERIFICATION BOT REPORTS
  // ============================================================================
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-8 py-6 pb-24 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-[#f5c04a]">
            Administration & Bot Moderation
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Pending Centre Approvals ({pendingVenues.length})
          </h1>
        </div>
        <span className="font-mono-num text-xs text-[#848ab0]">
          {venues.filter((v) => v.status === 'approved').length} live centres
        </span>
      </div>

      {pendingVenues.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121432] p-10 text-center">
          <FileCheck className="mx-auto h-10 w-10 text-emerald-400 mb-3" />
          <h2 className="font-display text-xl font-semibold text-white">Approval queue clear</h2>
          <p className="mt-2 text-sm text-[#c5cae3]">
            Every submitted event centre has been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingVenues.map((venue) => (
            <div
              key={venue.id}
              className="rounded-2xl border border-white/10 bg-[#121432] p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-4 space-y-3">
                <VenueSlideshow
                  photos={normalizeVenuePhotos(venue)}
                  theme={venue.visualTheme}
                  venueName={venue.name}
                  variant="card"
                  className="h-44 w-full rounded-xl"
                />
                <div className="text-xs text-[#c5cae3] space-y-1">
                  <p className="font-semibold text-white">{venue.address}</p>
                  <p>
                    {venue.city}, {venue.region}, {venue.country}
                  </p>
                  <p className="font-mono-num text-[#f5c04a]">
                    {formatMoney(venue.bookingCharge, venue.currency)} · Cap {venue.capacity}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white">{venue.name}</h2>
                    <p className="text-xs text-[#848ab0]">
                      Submitted by {venue.ownerName} ({venue.planningContact.phone})
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      venue.botReport.recommendation === 'recommend_approval'
                        ? 'text-emerald-400'
                        : 'text-amber-300'
                    }`}
                  >
                    <Bot className="h-4 w-4" />
                    {venue.botReport.recommendation === 'recommend_approval'
                      ? 'Bot Recommends Approval'
                      : 'Bot Flagged for Review'}
                  </span>
                </div>

                <p className="text-sm text-[#c5cae3]">{venue.description}</p>

                {/* Verification Bot 4-Check Breakdown */}
                <div className="rounded-xl border border-white/10 bg-[#0a0b1e] p-4 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#7c5cff]">
                    Automated Verification Bot Pre-Check
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {venue.botReport.checks.map((chk) => (
                      <div key={chk.label} className="flex items-start gap-2 text-xs">
                        {chk.passed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium text-white">{chk.label}</p>
                          <p className="text-[11px] text-[#848ab0]">{chk.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Admin Decision Controls */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={adminNotes[venue.id] || ''}
                    onChange={(e) =>
                      setAdminNotes((prev) => ({ ...prev, [venue.id]: e.target.value }))
                    }
                    placeholder="Optional note to centre owner (required when requesting changes or rejecting)..."
                    className="w-full min-h-[42px] rounded-xl border border-white/15 bg-[#0a0b1e] px-3.5 text-xs text-white"
                  />
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onReviewVenue(
                          venue.id,
                          'approved',
                          adminNotes[venue.id] || 'All verification requirements satisfied.',
                        )
                      }
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#f5c04a] px-5 text-xs font-semibold text-[#0a0b1e] hover:bg-[#ffd166]"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Approve Listing</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReviewVenue(
                          venue.id,
                          'changes_requested',
                          adminNotes[venue.id] || 'Please upload clearer exterior photography.',
                        )
                      }
                      className="min-h-[44px] rounded-xl border border-amber-400/40 px-4 text-xs font-semibold text-amber-300 hover:bg-amber-400/10"
                    >
                      Request Changes
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReviewVenue(
                          venue.id,
                          'rejected',
                          adminNotes[venue.id] || 'Listing did not meet verification criteria.',
                        )
                      }
                      className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-red-500/40 px-4 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
