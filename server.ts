import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { loadDatabase, runVerificationBot, saveDatabase } from './server/db';
import type {
  Booking,
  SubscriptionPlan,
  Venue,
  VerifiedReview,
} from './src/types/venuza';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Support uploaded base64 screenshots/photos safely up to 25mb
  app.use(express.json({ limit: '25mb' }));

  // Bootstrap all dynamic data
  app.get('/api/bootstrap', (_req, res) => {
    const db = loadDatabase();
    res.json(db);
  });

  // Create new venue (Owner registration -> Verification Bot -> pending_approval)
  app.post('/api/venues', (req, res) => {
    const db = loadDatabase();
    const body = req.body;

    if (!body?.name || !body?.country || !body?.region || !body?.city || !body?.address) {
      res.status(400).json({ error: 'Venue name and complete location hierarchy are required.' });
      return;
    }

    const botReport = runVerificationBot(
      {
        name: String(body.name),
        description: String(body.description || ''),
        country: String(body.country),
        region: String(body.region),
        city: String(body.city),
        address: String(body.address),
        capacity: Number(body.capacity || 0),
        bookingCharge: Number(body.bookingCharge || 0),
        planningContact: body.planningContact || { name: '', phone: '', email: '' },
        images: body.images || { interior: '', exterior: '', surroundings: '' },
        coordinates: body.coordinates || { lat: 5.6, lng: -0.2 },
      },
      db.venues,
    );

    const newVenue: Venue = {
      id: `ven-${Date.now()}`,
      name: String(body.name).trim(),
      description: String(body.description || '').trim(),
      country: String(body.country).trim(),
      region: String(body.region).trim(),
      city: String(body.city).trim(),
      address: String(body.address).trim(),
      coordinates: {
        lat: Number(body.coordinates?.lat ?? 5.6037),
        lng: Number(body.coordinates?.lng ?? -0.187),
        mapX: Number(body.coordinates?.mapX ?? 50),
        mapY: Number(body.coordinates?.mapY ?? 50),
      },
      capacity: Number(body.capacity || 200),
      eventTypes: Array.isArray(body.eventTypes) ? body.eventTypes : ['Conference', 'Wedding & Gala'],
      facilities: Array.isArray(body.facilities) ? body.facilities : ['Backup Generator', 'Air Conditioning'],
      bookingCharge: Number(body.bookingCharge || 5000),
      currency: body.currency || 'GHS',
      planningContact: {
        name: String(body.planningContact?.name || body.ownerName || 'Venue Manager'),
        phone: String(body.planningContact?.phone || ''),
        email: String(body.planningContact?.email || ''),
        momoNumber: String(body.planningContact?.momoNumber || body.planningContact?.phone || ''),
        momoNetwork: body.planningContact?.momoNetwork || 'MTN MoMo',
        bankAccount: String(body.planningContact?.bankAccount || 'Provided upon booking'),
      },
      visualTheme: body.visualTheme || 'grand_ballroom',
      images: {
        interior: body.images?.interior || `preset:${body.visualTheme || 'grand_ballroom'}:interior`,
        exterior: body.images?.exterior || `preset:${body.visualTheme || 'grand_ballroom'}:exterior`,
        surroundings: body.images?.surroundings || `preset:${body.visualTheme || 'grand_ballroom'}:surroundings`,
        ...(Array.isArray(body.images?.gallery) && body.images.gallery.length > 0
          ? { gallery: body.images.gallery }
          : {}),
      },
      bookedDates: [],
      status: 'pending_approval',
      botReport,
      rating: 0,
      reviewCount: 0,
      ownerId: String(body.ownerId || 'owner-demo'),
      ownerName: String(body.ownerName || 'Centre Owner'),
      createdAt: new Date().toISOString(),
    };

    db.venues.unshift(newVenue);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'admin',
      title: 'New venue pending approval',
      message: `${newVenue.name} (${newVenue.city}) submitted — Bot: ${botReport.recommendation === 'recommend_approval' ? 'Recommended' : 'Flagged'}.`,
      channel: 'In-App',
      read: false,
      createdAt: new Date().toISOString(),
    });
    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor: 'Verification Bot',
      action: botReport.recommendation === 'recommend_approval' ? 'PRE_CHECK_PASSED' : 'PRE_CHECK_FLAGGED',
      target: newVenue.name,
      detail: botReport.summary,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.status(201).json(newVenue);
  });

  // Owner updates pricing or bookedDates
  app.patch('/api/venues/:id', (req, res) => {
    const db = loadDatabase();
    const venue = db.venues.find((v) => v.id === req.params.id);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found.' });
      return;
    }

    if (typeof req.body.bookingCharge === 'number' && req.body.bookingCharge > 0) {
      venue.bookingCharge = req.body.bookingCharge;
    }
    if (req.body.currency) {
      venue.currency = req.body.currency;
    }
    if (Array.isArray(req.body.bookedDates)) {
      // Double-booking guard: cannot free a date that has a confirmed booking
      const confirmedDates = new Set(
        db.bookings
          .filter((b) => b.venueId === venue.id && b.status === 'confirmed')
          .map((b) => b.eventDate),
      );
      const nextSet = new Set<string>(req.body.bookedDates);
      for (const locked of confirmedDates) {
        nextSet.add(locked);
      }
      venue.bookedDates = Array.from(nextSet).sort();
    }
    if (req.body.images && typeof req.body.images === 'object') {
      const nextGallery = Array.isArray(req.body.images.gallery)
        ? req.body.images.gallery.filter((g: { url?: string }) => Boolean(g?.url))
        : venue.images.gallery;
      venue.images = {
        interior: req.body.images.interior || venue.images.interior,
        exterior: req.body.images.exterior || venue.images.exterior,
        surroundings: req.body.images.surroundings || venue.images.surroundings,
        ...(nextGallery && nextGallery.length > 0 ? { gallery: nextGallery } : {}),
      };
    }

    saveDatabase(db);
    res.json(venue);
  });

  // Booker creates a booking with Proof of Payment (Double-booking check)
  app.post('/api/bookings', (req, res) => {
    const db = loadDatabase();
    const body = req.body;
    const venue = db.venues.find((v) => v.id === body.venueId);
    if (!venue) {
      res.status(404).json({ error: 'Selected venue not found.' });
      return;
    }
    if (!body.eventDate || !body.paymentReference || !body.proofImage) {
      res.status(400).json({ error: 'Event date, payment reference, and proof of payment image are required.' });
      return;
    }

    // Double-booking protection
    if (venue.bookedDates.includes(body.eventDate)) {
      res.status(409).json({ error: 'This date is already booked or locked on the venue calendar.' });
      return;
    }
    const existingPending = db.bookings.some(
      (b) =>
        b.venueId === venue.id &&
        b.eventDate === body.eventDate &&
        (b.status === 'payment_uploaded' || b.status === 'confirmed'),
    );
    if (existingPending) {
      res.status(409).json({
        error: 'Another booker has already uploaded payment proof for this date and is awaiting confirmation.',
      });
      return;
    }

    const newBooking: Booking = {
      id: `bkg-${Date.now()}`,
      venueId: venue.id,
      venueName: venue.name,
      venueCity: venue.city,
      ownerId: venue.ownerId,
      bookerId: String(body.bookerId || 'booker-demo'),
      bookerName: String(body.bookerName || 'Event Booker'),
      bookerContact: String(body.bookerContact || ''),
      eventDate: String(body.eventDate),
      eventType: String(body.eventType || 'Conference'),
      guestCount: Number(body.guestCount || 100),
      amount: venue.bookingCharge,
      currency: venue.currency,
      paymentMethod: body.paymentMethod || 'mtn_momo',
      paymentReference: String(body.paymentReference).trim(),
      proofImage: String(body.proofImage),
      proofFileName: String(body.proofFileName || 'payment-proof.png'),
      status: 'payment_uploaded',
      createdAt: new Date().toISOString(),
    };

    db.bookings.unshift(newBooking);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'owner',
      title: 'Payment proof awaiting confirmation',
      message: `${newBooking.bookerName} uploaded proof (${newBooking.paymentReference}) for ${venue.name} on ${newBooking.eventDate}.`,
      channel: 'SMS',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.status(201).json(newBooking);
  });

  // Owner confirms payment receipt -> locks date on venue calendar
  app.post('/api/bookings/:id/confirm', (req, res) => {
    const db = loadDatabase();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const venue = db.venues.find((v) => v.id === booking.venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found.' });
      return;
    }

    booking.status = 'confirmed';
    if (!venue.bookedDates.includes(booking.eventDate)) {
      venue.bookedDates.push(booking.eventDate);
      venue.bookedDates.sort();
    }

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'booker',
      title: 'Booking confirmed & date locked',
      message: `${venue.name} confirmed receipt of payment (${booking.paymentReference}) for ${booking.eventDate}.`,
      channel: 'Email',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ booking, venue });
  });

  // Owner or Booker flags a dispute on payment evidence
  app.post('/api/bookings/:id/dispute', (req, res) => {
    const db = loadDatabase();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    booking.status = 'disputed';
    booking.disputeReason = String(req.body.reason || 'Payment proof requires administrator verification.');

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'admin',
      title: 'Payment dispute escalated',
      message: `Dispute opened for ${booking.venueName} (${booking.eventDate}) — Ref: ${booking.paymentReference}.`,
      channel: 'In-App',
      read: false,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(booking);
  });

  // Admin reviews a pending venue
  app.post('/api/admin/venues/:id/review', (req, res) => {
    const db = loadDatabase();
    const venue = db.venues.find((v) => v.id === req.params.id);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found.' });
      return;
    }
    const decision = req.body.decision as 'approved' | 'changes_requested' | 'rejected';
    const note = String(req.body.note || '').trim();
    if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
      res.status(400).json({ error: 'Invalid admin decision.' });
      return;
    }

    venue.status = decision;
    if (note) venue.adminNote = note;

    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      targetRole: 'owner',
      title:
        decision === 'approved'
          ? 'Venue listing approved'
          : decision === 'changes_requested'
            ? 'Listing changes requested'
            : 'Venue listing rejected',
      message: `${venue.name}: ${note || `Decision recorded as ${decision.replace('_', ' ')}.`}`,
      channel: 'Email',
      read: false,
      createdAt: new Date().toISOString(),
    });

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor: 'Administrator',
      action: `LISTING_${decision.toUpperCase()}`,
      target: venue.name,
      detail: note || `Admin marked listing as ${decision}.`,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json(venue);
  });

  // Admin resolves a payment dispute
  app.post('/api/admin/disputes/:id/resolve', (req, res) => {
    const db = loadDatabase();
    const booking = db.bookings.find((b) => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const resolution = req.body.resolution as 'confirmed' | 'rejected';
    const note = String(req.body.note || '').trim();
    const venue = db.venues.find((v) => v.id === booking.venueId);

    booking.status = resolution;
    booking.resolutionNote = note || `Resolved by Admin as ${resolution}.`;

    if (resolution === 'confirmed' && venue && !venue.bookedDates.includes(booking.eventDate)) {
      venue.bookedDates.push(booking.eventDate);
      venue.bookedDates.sort();
    }

    db.auditLogs.unshift({
      id: `aud-${Date.now()}`,
      actor: 'Administrator',
      action: `DISPUTE_${resolution.toUpperCase()}`,
      target: `${booking.venueName} (${booking.paymentReference})`,
      detail: booking.resolutionNote,
      createdAt: new Date().toISOString(),
    });

    saveDatabase(db);
    res.json({ booking, venue });
  });

  // Verified Booker submits a review (only permitted if a confirmed booking exists)
  app.post('/api/reviews', (req, res) => {
    const db = loadDatabase();
    const { venueId, bookingId, bookerName, rating, comment } = req.body;
    const booking = db.bookings.find((b) => b.id === bookingId && b.venueId === venueId && b.status === 'confirmed');
    if (!booking) {
      res.status(403).json({ error: 'Only verified bookers with a confirmed booking may submit a review.' });
      return;
    }
    const venue = db.venues.find((v) => v.id === venueId);
    if (!venue) {
      res.status(404).json({ error: 'Venue not found.' });
      return;
    }

    const review: VerifiedReview = {
      id: `rev-${Date.now()}`,
      venueId,
      bookingId,
      bookerName: String(bookerName || booking.bookerName),
      rating: Math.min(5, Math.max(1, Number(rating || 5))),
      comment: String(comment || '').trim(),
      eventType: booking.eventType,
      createdAt: new Date().toISOString(),
    };

    db.reviews.unshift(review);
    const venueReviews = db.reviews.filter((r) => r.venueId === venueId);
    venue.reviewCount = venueReviews.length;
    venue.rating = Number(
      (venueReviews.reduce((acc, r) => acc + r.rating, 0) / venueReviews.length).toFixed(2),
    );

    saveDatabase(db);
    res.status(201).json({ review, venue });
  });

  // Owner updates subscription tier
  app.post('/api/owner/subscription', (req, res) => {
    const db = loadDatabase();
    const ownerId = String(req.body.ownerId || 'owner-demo');
    const plan = req.body.plan as SubscriptionPlan;
    let sub = db.subscriptions.find((s) => s.ownerId === ownerId);
    if (!sub) {
      sub = {
        ownerId,
        plan,
        trialDaysRemaining: plan === 'standard_trial' ? 14 : 0,
        status: plan === 'standard_trial' ? 'trialing' : 'active',
        nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      };
      db.subscriptions.push(sub);
    } else {
      sub.plan = plan;
      sub.status = plan === 'standard_trial' ? 'trialing' : 'active';
      sub.trialDaysRemaining = plan === 'standard_trial' ? 14 : 0;
    }
    saveDatabase(db);
    res.json(sub);
  });

  // Mark notifications read
  app.post('/api/notifications/read', (req, res) => {
    const db = loadDatabase();
    const role = req.body.role;
    db.notifications.forEach((n) => {
      if (!role || n.targetRole === role || n.targetRole === 'all') {
        n.read = true;
      }
    });
    saveDatabase(db);
    res.json({ ok: true });
  });

  // Vite dev middleware or static dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Venuza server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Venuza server:', err);
  process.exit(1);
});
