import fs from 'fs';
import path from 'path';
import type {
  Venue,
  VenuzaDatabase,
  VerificationBotCheck,
  VerificationBotReport,
} from '../src/types/venuza';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'venuza-db.json');

export function runVerificationBot(
  input: {
    name: string;
    description: string;
    country: string;
    region: string;
    city: string;
    address: string;
    capacity: number;
    bookingCharge: number;
    planningContact: { name: string; phone: string; email: string };
    images: {
      interior: string;
      exterior: string;
      surroundings: string;
      gallery?: Array<{ id: string; url: string; angle: string; caption: string }>;
    };
    coordinates: { lat: number; lng: number };
  },
  existingVenues: Venue[],
): VerificationBotReport {
  const checks: VerificationBotCheck[] = [];

  const fieldsComplete =
    input.name.trim().length >= 3 &&
    input.description.trim().length >= 25 &&
    input.address.trim().length >= 5 &&
    input.capacity >= 10 &&
    input.bookingCharge > 0 &&
    input.planningContact.phone.trim().length >= 7 &&
    input.planningContact.email.includes('@');

  checks.push({
    label: 'Profile & Contact Completeness',
    passed: fieldsComplete,
    detail: fieldsComplete
      ? 'All mandatory specifications, pricing, and planning contacts verified.'
      : 'Incomplete description, pricing, or planning contact details.',
  });

  const validLocation =
    Boolean(input.country && input.region && input.city) &&
    Number.isFinite(input.coordinates.lat) &&
    Number.isFinite(input.coordinates.lng);

  checks.push({
    label: 'Geolocation & Map Pin Verification',
    passed: validLocation,
    detail: validLocation
      ? `Pin resolved in ${input.city}, ${input.region} (${input.country}).`
      : 'Invalid coordinates or missing regional hierarchy.',
  });

  const galleryCount = Array.isArray(input.images?.gallery)
    ? input.images.gallery.filter((g) => Boolean(g?.url)).length
    : 0;
  const fallbackCount = [
    input.images?.interior,
    input.images?.exterior,
    input.images?.surroundings,
  ].filter(Boolean).length;
  const photoCount = galleryCount > 0 ? galleryCount : fallbackCount;
  const validImages = photoCount >= 1;

  checks.push({
    label: 'Venue Photography & Media Integrity',
    passed: validImages,
    detail: validImages
      ? photoCount > 1
        ? `${photoCount} venue photographs verified (animated slideshow enabled).`
        : '1 venue photograph verified (single showcase frame).'
      : 'Missing required venue photograph (upload at least 1 picture).',
  });

  const duplicate = existingVenues.some(
    (v) =>
      v.name.trim().toLowerCase() === input.name.trim().toLowerCase() &&
      v.city.trim().toLowerCase() === input.city.trim().toLowerCase(),
  );

  checks.push({
    label: 'Duplicate Listing Scan',
    passed: !duplicate,
    detail: duplicate
      ? `Potential duplicate found with identical name in ${input.city}.`
      : 'No duplicate centre found in this municipality.',
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const allPassed = passedCount === checks.length;

  return {
    recommendation: allPassed ? 'recommend_approval' : 'flag_for_review',
    score,
    summary: allPassed
      ? 'Automated bot verified all 4 integrity checks. Recommended for immediate admin approval.'
      : `Bot flagged ${checks.length - passedCount} check(s) for closer administrator review.`,
    checks,
    checkedAt: new Date().toISOString(),
  };
}

function getUpcomingDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

function createSeedDatabase(): VenuzaDatabase {
  const sampleReceiptSvg = `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="240" viewBox="0 0 420 240">
      <rect width="420" height="240" rx="16" fill="#0f1229"/>
      <rect x="16" y="16" width="388" height="208" rx="12" fill="#171b3a" stroke="#f5c04a" stroke-opacity="0.4"/>
      <text x="36" y="54" fill="#f5c04a" font-family="sans-serif" font-size="14" font-weight="700">MTN MOMO TRANSFER RECEIPT</text>
      <text x="36" y="88" fill="#ffffff" font-family="monospace" font-size="13">TXN ID: MM-2026-994182</text>
      <text x="36" y="116" fill="#c5cae3" font-family="sans-serif" font-size="13">Recipient: Kempes Gold Convention</text>
      <text x="36" y="144" fill="#c5cae3" font-family="sans-serif" font-size="13">Amount Paid: GHS 18,500.00</text>
      <text x="36" y="172" fill="#22c55e" font-family="sans-serif" font-size="13" font-weight="600">Status: Transfer Successful</text>
      <text x="36" y="202" fill="#848ab0" font-family="monospace" font-size="11">Verified Electronic Payment Slip</text>
    </svg>`,
  )}`;

  const venues: Venue[] = [
    {
      id: 'ven-accra-aurum',
      name: 'Aurum Grand Dome',
      description:
        'Flagship convention ballroom and gala hall in East Legon featuring a 14-metre acoustic dome ceiling, dual concert lighting rigs, VIP bridal and speaker suites, and 650-car underground valet.',
      country: 'Ghana',
      region: 'Greater Accra',
      city: 'Accra',
      address: '18 Ambassadorial Enclave, East Legon, Accra',
      coordinates: { lat: 5.6355, lng: -0.1583, mapX: 54, mapY: 42 },
      capacity: 1200,
      eventTypes: ['Conferences', 'Weddings', 'Shows', 'Parties'],
      facilities: [
        'Line-Array Concert Audio',
        'Dual 500kVA Backup Generators',
        '4K LED Stage Wall',
        'VIP Green Rooms',
        'Valet Parking (400+)',
        'Industrial Kitchen',
      ],
      bookingCharge: 18500,
      currency: 'GHS',
      planningContact: {
        name: 'Kwame Mensah-Bonsu',
        phone: '+233 24 881 4920',
        email: 'events@aurumgrand.gh',
        momoNumber: '024 881 4920 (Merchant: AURUM)',
        momoNetwork: 'MTN MoMo',
        bankAccount: 'Ecobank Ghana · 1441002938411',
      },
      visualTheme: 'grand_ballroom',
      images: {
        interior: 'preset:grand_ballroom:interior',
        exterior: 'preset:grand_ballroom:exterior',
        surroundings: 'preset:grand_ballroom:surroundings',
        gallery: [
          {
            id: 'aurum-1',
            url: 'preset:grand_ballroom:interior',
            angle: 'interior',
            caption: 'Grand Acoustic Dome & Main Gala Floor',
          },
          {
            id: 'aurum-2',
            url: 'preset:grand_ballroom:exterior',
            angle: 'exterior',
            caption: 'Cantilevered Arrival Facade & Reflecting Plaza',
          },
          {
            id: 'aurum-3',
            url: 'preset:grand_ballroom:surroundings',
            angle: 'surroundings',
            caption: 'East Legon Botanical Promenade & Valet Loop',
          },
          {
            id: 'aurum-4',
            url: 'preset:auditorium_stage:interior',
            angle: 'interior',
            caption: 'Keynote & Concert Stage Production Configuration',
          },
        ],
      },
      bookedDates: [getUpcomingDate(3), getUpcomingDate(7), getUpcomingDate(12)],
      status: 'approved',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'All 4 automated checks passed. Verified hospitality property.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'Complete specs and Ghana contact verified.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'East Legon, Accra pin matched.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'Interior, exterior, and surroundings verified.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'Unique listing in Greater Accra.' },
        ],
        checkedAt: '2026-10-12T09:00:00Z',
      },
      rating: 4.9,
      reviewCount: 28,
      ownerId: 'owner-demo',
      ownerName: 'Kwame Mensah-Bonsu',
      createdAt: '2026-10-12T09:00:00Z',
    },
    {
      id: 'ven-accra-osu-pavilion',
      name: 'Osu Glass Pavilion',
      description:
        'Floor-to-ceiling architectural glass pavilion steps from Independence Avenue. Ideal for product launches, diplomatic receptions, and executive summits with landscaped reflecting courtyard.',
      country: 'Ghana',
      region: 'Greater Accra',
      city: 'Accra',
      address: '42 Cantonments Crescent, Osu, Accra',
      coordinates: { lat: 5.5608, lng: -0.1791, mapX: 38, mapY: 64 },
      capacity: 480,
      eventTypes: ['Conferences', 'Weddings', 'Parties'],
      facilities: [
        'Climate-Controlled Glass Hall',
        'Backup Generator',
        'High-Speed Fiber Wi-Fi',
        'Reflecting Pool Terrace',
        'Catering Prep Pantry',
      ],
      bookingCharge: 12000,
      currency: 'GHS',
      planningContact: {
        name: 'Abena Boateng',
        phone: '+233 20 442 7105',
        email: 'bookings@osupavilion.gh',
        momoNumber: '020 442 7105 (Telecel Merchant)',
        momoNetwork: 'Telecel Cash',
        bankAccount: 'Stanbic Bank Ghana · 904000817261',
      },
      visualTheme: 'glass_pavilion',
      images: {
        interior: 'preset:glass_pavilion:interior',
        exterior: 'preset:glass_pavilion:exterior',
        surroundings: 'preset:glass_pavilion:surroundings',
        gallery: [
          {
            id: 'osu-1',
            url: 'preset:glass_pavilion:interior',
            angle: 'interior',
            caption: 'Floor-to-Ceiling Glass Reception Atrium',
          },
          {
            id: 'osu-2',
            url: 'preset:glass_pavilion:exterior',
            angle: 'exterior',
            caption: 'Twilight Cantonments Glass Pavilion Elevation',
          },
          {
            id: 'osu-3',
            url: 'preset:glass_pavilion:surroundings',
            angle: 'surroundings',
            caption: 'Reflecting Water Court & Terrace Gardens',
          },
        ],
      },
      bookedDates: [getUpcomingDate(2), getUpcomingDate(9)],
      status: 'approved',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'All 4 automated checks passed.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'Complete profile.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'Osu, Accra coordinates verified.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'All media angles supplied.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'No duplicates.' },
        ],
        checkedAt: '2026-10-18T11:30:00Z',
      },
      rating: 4.8,
      reviewCount: 19,
      ownerId: 'owner-2',
      ownerName: 'Abena Boateng',
      createdAt: '2026-10-18T11:30:00Z',
    },
    {
      id: 'ven-kumasi-royal',
      name: 'Manhyia Heritage Amphitheatre',
      description:
        'Premier Ashanti regional performing arts auditorium and banquet courtyard in Kumasi. Features tiered oak acoustic seating, live broadcast booths, and manicured royal gardens.',
      country: 'Ghana',
      region: 'Ashanti',
      city: 'Kumasi',
      address: '9 Royal Ridge Boulevard, Nhyiaeso, Kumasi',
      coordinates: { lat: 6.6885, lng: -1.6244, mapX: 49, mapY: 51 },
      capacity: 950,
      eventTypes: ['Shows', 'Conferences', 'Weddings'],
      facilities: [
        'Tiered Auditorium Seating',
        'Stage Truss & Spotlights',
        'Backup Generator',
        'Outdoor Marquee Lawn',
        'Security Perimeter',
      ],
      bookingCharge: 9800,
      currency: 'GHS',
      planningContact: {
        name: 'Nana Yaw Osei',
        phone: '+233 54 319 8821',
        email: 'desk@manhyiaheritage.gh',
        momoNumber: '054 319 8821',
        momoNetwork: 'MTN MoMo',
        bankAccount: 'GCB Bank · 601118004291',
      },
      visualTheme: 'auditorium_stage',
      images: {
        interior: 'preset:auditorium_stage:interior',
        exterior: 'preset:auditorium_stage:exterior',
        surroundings: 'preset:auditorium_stage:surroundings',
        gallery: [
          {
            id: 'kumasi-1',
            url: 'preset:auditorium_stage:interior',
            angle: 'interior',
            caption: 'Tiered Oak Acoustic Amphitheatre & Stage Rig',
          },
          {
            id: 'kumasi-2',
            url: 'preset:auditorium_stage:exterior',
            angle: 'exterior',
            caption: 'Royal Ridge Colonnade & Main Entrance',
          },
          {
            id: 'kumasi-3',
            url: 'preset:auditorium_stage:surroundings',
            angle: 'surroundings',
            caption: 'Manicured Outdoor Marquee Lawn & Grounds',
          },
        ],
      },
      bookedDates: [getUpcomingDate(5), getUpcomingDate(14)],
      status: 'approved',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'Verified Kumasi venue ready for booking.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'Verified.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'Nhyiaeso, Kumasi.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'Verified.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'Unique.' },
        ],
        checkedAt: '2026-10-20T14:00:00Z',
      },
      rating: 4.7,
      reviewCount: 15,
      ownerId: 'owner-3',
      ownerName: 'Nana Yaw Osei',
      createdAt: '2026-10-20T14:00:00Z',
    },
    {
      id: 'ven-lagos-eko-sky',
      name: 'Victoria Island Skyline Terrace',
      description:
        'Elevated rooftop event centre and indoor glass lounge overlooking the Atlantic coastline in Victoria Island, Lagos. Designed for awards nights, concerts, and upscale brand showcases.',
      country: 'Nigeria',
      region: 'Lagos',
      city: 'Victoria Island',
      address: '14 Adeola Odeku Street, Victoria Island, Lagos',
      coordinates: { lat: 6.4281, lng: 3.4219, mapX: 66, mapY: 36 },
      capacity: 700,
      eventTypes: ['Shows', 'Parties', 'Weddings'],
      facilities: [
        'Open-Air Skyline Deck',
        'Retractable Acoustic Roof',
        'VIP Bottle & Lounge Pods',
        'Dedicated Sound Engineer',
        'Valet Arrival',
      ],
      bookingCharge: 3800000,
      currency: 'NGN',
      planningContact: {
        name: 'Tunde Adeyemi',
        phone: '+234 803 412 9088',
        email: 'events@viskyline.ng',
        momoNumber: 'Bank Transfer Preferred',
        momoNetwork: 'MTN MoMo',
        bankAccount: 'GTBank Nigeria · 0129384712',
      },
      visualTheme: 'rooftop_terrace',
      images: {
        interior: 'preset:rooftop_terrace:interior',
        exterior: 'preset:rooftop_terrace:exterior',
        surroundings: 'preset:rooftop_terrace:surroundings',
        gallery: [
          {
            id: 'lagos-1',
            url: 'preset:rooftop_terrace:interior',
            angle: 'interior',
            caption: 'Glass Lounge & Retractable Acoustic Canopy',
          },
          {
            id: 'lagos-2',
            url: 'preset:rooftop_terrace:exterior',
            angle: 'exterior',
            caption: 'Victoria Island Skyline Terrace Pavilion',
          },
          {
            id: 'lagos-3',
            url: 'preset:rooftop_terrace:surroundings',
            angle: 'surroundings',
            caption: 'Atlantic Horizon Deck & Valet Approach',
          },
        ],
      },
      bookedDates: [getUpcomingDate(4), getUpcomingDate(10)],
      status: 'approved',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'Verified Victoria Island property.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'Verified.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'Lagos pin valid.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'Verified.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'Unique.' },
        ],
        checkedAt: '2026-10-24T10:15:00Z',
      },
      rating: 4.9,
      reviewCount: 34,
      ownerId: 'owner-4',
      ownerName: 'Tunde Adeyemi',
      createdAt: '2026-10-24T10:15:00Z',
    },
    {
      id: 'ven-london-meridian',
      name: 'The Meridian Conservatory',
      description:
        'Historic limestone courtyard and contemporary glass conservatory in Kensington, London. Equipped for international conferences, symposia, and black-tie galas.',
      country: 'United Kingdom',
      region: 'Greater London',
      city: 'London',
      address: '88 Cromwell Gardens, Kensington, London SW7',
      coordinates: { lat: 51.4962, lng: -0.1749, mapX: 44, mapY: 44 },
      capacity: 600,
      eventTypes: ['Conferences', 'Weddings', 'Parties'],
      facilities: [
        'Simultaneous Translation Booths',
        'Steinway Concert Grand',
        'Botanical Glass Courtyard',
        'Broadcast Fiber Uplink',
        'Step-Free Access',
      ],
      bookingCharge: 6400,
      currency: 'GBP',
      planningContact: {
        name: 'Charlotte Vance',
        phone: '+44 20 7946 0821',
        email: 'concierge@meridianlondon.co.uk',
        momoNumber: 'UK Faster Payments / IBAN',
        momoNetwork: 'MTN MoMo',
        bankAccount: 'Barclays UK · Sort 20-41-55 · 88392011',
      },
      visualTheme: 'courtyard_garden',
      images: {
        interior: 'preset:courtyard_garden:interior',
        exterior: 'preset:courtyard_garden:exterior',
        surroundings: 'preset:courtyard_garden:surroundings',
        gallery: [
          {
            id: 'london-1',
            url: 'preset:courtyard_garden:interior',
            angle: 'interior',
            caption: 'Botanical Glass Conservatory Banquet Hall',
          },
          {
            id: 'london-2',
            url: 'preset:courtyard_garden:exterior',
            angle: 'exterior',
            caption: 'Kensington Limestone Portico & Facade',
          },
          {
            id: 'london-3',
            url: 'preset:courtyard_garden:surroundings',
            angle: 'surroundings',
            caption: 'Illuminated Limestone Courtyard Garden',
          },
        ],
      },
      bookedDates: [getUpcomingDate(6), getUpcomingDate(11)],
      status: 'approved',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'All checks passed.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'Verified.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'Kensington SW7.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'Verified.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'Unique.' },
        ],
        checkedAt: '2026-10-28T16:40:00Z',
      },
      rating: 4.95,
      reviewCount: 41,
      ownerId: 'owner-5',
      ownerName: 'Charlotte Vance',
      createdAt: '2026-10-28T16:40:00Z',
    },
    {
      id: 'ven-pending-takoradi',
      name: 'Sekondi Harbour Convention Hall',
      description:
        'Newly commissioned waterfront conference hall in Takoradi with panoramic harbour deck, breakout rooms, and full AV production.',
      country: 'Ghana',
      region: 'Western Region',
      city: 'Takoradi',
      address: '3 Harbour View Drive, Takoradi',
      coordinates: { lat: 4.8845, lng: -1.7554, mapX: 30, mapY: 74 },
      capacity: 550,
      eventTypes: ['Conference', 'Corporate Summit', 'Concert & Show'],
      facilities: ['Harbour Deck', 'Backup Generator', 'Projector Array', 'VIP Lounge'],
      bookingCharge: 8200,
      currency: 'GHS',
      planningContact: {
        name: 'Kojo Quayson',
        phone: '+233 24 662 1190',
        email: 'kojo@sekondihall.gh',
        momoNumber: '024 662 1190',
        momoNetwork: 'MTN MoMo',
        bankAccount: 'Fidelity Bank Ghana · 10500928371',
      },
      visualTheme: 'glass_pavilion',
      images: {
        interior: 'preset:glass_pavilion:interior',
        exterior: 'preset:glass_pavilion:exterior',
        surroundings: 'preset:glass_pavilion:surroundings',
      },
      bookedDates: [],
      status: 'pending_approval',
      botReport: {
        recommendation: 'recommend_approval',
        score: 100,
        summary: 'Automated bot verified all 4 integrity checks. Recommended for immediate admin approval.',
        checks: [
          { label: 'Profile & Contact Completeness', passed: true, detail: 'All fields and Ghana MoMo details valid.' },
          { label: 'Geolocation & Map Pin Verification', passed: true, detail: 'Takoradi, Western Region matched.' },
          { label: 'Interior & Exterior Media Integrity', passed: true, detail: 'Interior & exterior assets verified.' },
          { label: 'Duplicate Listing Scan', passed: true, detail: 'No duplicate centre found in Takoradi.' },
        ],
        checkedAt: new Date().toISOString(),
      },
      rating: 0,
      reviewCount: 0,
      ownerId: 'owner-demo',
      ownerName: 'Kojo Quayson',
      createdAt: new Date().toISOString(),
    },
  ];

  const bookings = [
    {
      id: 'bkg-101',
      venueId: 'ven-accra-aurum',
      venueName: 'Aurum Grand Dome',
      venueCity: 'Accra',
      ownerId: 'owner-demo',
      bookerId: 'booker-demo',
      bookerName: 'Efua Darko',
      bookerContact: '+233 24 771 3309',
      eventDate: getUpcomingDate(3),
      eventType: 'Corporate Summit',
      guestCount: 650,
      amount: 18500,
      currency: 'GHS' as const,
      paymentMethod: 'mtn_momo' as const,
      paymentReference: 'MM-2026-994182',
      proofImage: sampleReceiptSvg,
      proofFileName: 'momo-receipt-aurum.png',
      status: 'confirmed' as const,
      createdAt: '2026-11-12T10:15:00Z',
    },
    {
      id: 'bkg-102',
      venueId: 'ven-accra-aurum',
      venueName: 'Aurum Grand Dome',
      venueCity: 'Accra',
      ownerId: 'owner-demo',
      bookerId: 'booker-demo-2',
      bookerName: 'Samuel Tetteh',
      bookerContact: 'samuel@afrotech.org',
      eventDate: getUpcomingDate(16),
      eventType: 'Conference',
      guestCount: 900,
      amount: 18500,
      currency: 'GHS' as const,
      paymentMethod: 'mtn_momo' as const,
      paymentReference: 'MM-2026-884012',
      proofImage: sampleReceiptSvg,
      proofFileName: 'afrotech-deposit-slip.png',
      status: 'payment_uploaded' as const,
      createdAt: new Date().toISOString(),
    },
  ];

  const reviews = [
    {
      id: 'rev-1',
      venueId: 'ven-accra-aurum',
      bookingId: 'bkg-101',
      bookerName: 'Efua Darko',
      rating: 5,
      comment:
        'Flawless acoustics for our 650-person FinTech summit. The dual backup generators switched instantaneously during a brief grid dip and the planning desk was attentive all week.',
      eventType: 'Corporate Summit',
      createdAt: '2026-11-15T14:20:00Z',
    },
    {
      id: 'rev-2',
      venueId: 'ven-accra-osu-pavilion',
      bookingId: 'bkg-past-2',
      bookerName: 'Kofi Annan-Forson',
      rating: 5,
      comment:
        'The twilight glass facade and reflecting terrace made our product launch unforgettable.',
      eventType: 'Product Launch',
      createdAt: '2026-11-02T18:00:00Z',
    },
    {
      id: 'rev-3',
      venueId: 'ven-london-meridian',
      bookingId: 'bkg-past-3',
      bookerName: 'Dr. Helena Wright',
      rating: 5,
      comment:
        'Seamless translation booths and breathtaking natural light in the conservatory courtyard.',
      eventType: 'Conference',
      createdAt: '2026-10-29T12:00:00Z',
    },
  ];

  const notifications = [
    {
      id: 'notif-1',
      targetRole: 'owner' as const,
      title: 'New payment proof uploaded',
      message: 'Samuel Tetteh uploaded MTN MoMo receipt MM-2026-884012 for Aurum Grand Dome.',
      channel: 'In-App' as const,
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      targetRole: 'admin' as const,
      title: 'Pending venue pre-checked by Bot',
      message: 'Sekondi Harbour Convention Hall passed 4/4 verification checks and awaits approval.',
      channel: 'In-App' as const,
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-3',
      targetRole: 'booker' as const,
      title: 'Booking confirmed & date locked',
      message: 'Aurum Grand Dome confirmed your payment for Corporate Summit.',
      channel: 'SMS' as const,
      read: false,
      createdAt: '2026-11-12T11:00:00Z',
    },
  ];

  const auditLogs = [
    {
      id: 'aud-1',
      actor: 'Verification Bot',
      action: 'PRE_CHECK_PASSED',
      target: 'Sekondi Harbour Convention Hall',
      detail: '4/4 integrity checks passed; recommended for admin approval.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'aud-2',
      actor: 'Admin Console',
      action: 'LISTING_APPROVED',
      target: 'Aurum Grand Dome',
      detail: 'Approved listing in Accra, Greater Accra, Ghana.',
      createdAt: '2026-10-12T10:05:00Z',
    },
  ];

  const subscriptions = [
    {
      ownerId: 'owner-demo',
      plan: 'standard_trial' as const,
      trialDaysRemaining: 14,
      status: 'trialing' as const,
      nextBillingDate: getUpcomingDate(14),
    },
  ];

  return {
    venues,
    bookings,
    reviews,
    notifications,
    auditLogs,
    subscriptions,
  };
}

export function loadDatabase(): VenuzaDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as VenuzaDatabase;
  } catch {
    const seed = createSeedDatabase();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
}

export function saveDatabase(db: VenuzaDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}
