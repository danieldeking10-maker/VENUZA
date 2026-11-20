import React, { Component, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  DoorOpen,
  Eye,
  EyeOff,
  MapPin,
  ShieldCheck,
  Sparkles as SparklesIcon,
  Star,
  X,
} from 'lucide-react';
import type { AuthUser, UserRole } from '../types/venuza';
import { EventCenterEntranceScene, type SceneControlState } from './EventCenterScene';

// ============================================================================
// EDITABLE CONFIGURATION (Brand Copy, Colors, Particles, Motion)
// ============================================================================
export const WELCOME_CONFIG = {
  brandName: 'VENUZA',
  headline: 'Step Inside Extraordinary Venues',
  tagline: 'Find the perfect venue for every moment — conferences, shows, weddings, and grand galas.',
  primaryCta: 'Sign In / Get Started',
  guestCta: 'Explore Venues',
  colors: {
    obsidian: '#0B0F19',
    gold: '#F59E0B',
    goldBright: '#FBBF24',
    violet: '#7C5CFF',
    carpet: '#4C1125',
  },
  particles: {
    desktopCount: 110,
    mobileCount: 45,
  },
};

type AuthMode = 'signin' | 'signup';
type GateStage = 'hero' | 'auth' | 'role' | 'ready';

interface Welcome3DExperienceProps {
  onEnterWorkspace: (user: AuthUser) => void;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

// ErrorBoundary to guarantee graceful static fallback if WebGL fails
class CanvasErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// 3D EventCenterEntranceScene imported from ./EventCenterScene.tsx

// ============================================================================
// MAIN WELCOME COMPONENT: 3D PORTAL + FRAMER MOTION OVERLAYS & ROLE GATE
// ============================================================================
export const Welcome3DExperience: React.FC<Welcome3DExperienceProps> = ({
  onEnterWorkspace,
}) => {
  const [webglOk, setWebglOk] = useState<boolean>(() => hasWebGL());
  const [isSoftwareGl] = useState<boolean>(() => detectSoftwareWebGL());
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  );

  const [gateStage, setGateStage] = useState<GateStage>('hero');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [doorsPreviewOpen, setDoorsPreviewOpen] = useState<boolean>(false);

  // Auth form state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    identifier?: string;
    password?: string;
    fullName?: string;
  }>({});
  const [signedUser, setSignedUser] = useState<{ name: string; identifier: string }>({
    name: 'Efua Darko',
    identifier: 'efua.darko@venuza.app',
  });
  const [selectedRole, setSelectedRole] = useState<UserRole>('booker');

  const controlRef = useRef<SceneControlState>({
    pointerX: 0,
    pointerY: 0,
    scrollNorm: 0,
    doorsOpenFactor: 0.15,
    modalPush: 0,
    reducedMotion: false,
  });

  useEffect(() => {
    controlRef.current.reducedMotion = reducedMotion;
    controlRef.current.doorsOpenFactor = doorsPreviewOpen || gateStage !== 'hero' ? 1 : 0.18;
    controlRef.current.modalPush = gateStage === 'hero' ? 0 : gateStage === 'auth' ? 0.45 : 0.85;
  }, [reducedMotion, doorsPreviewOpen, gateStage]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    const onPointerMove = (e: PointerEvent) => {
      controlRef.current.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      controlRef.current.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => {
      const maxS = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      controlRef.current.scrollNorm = Math.min(1, Math.max(0, window.scrollY / maxS));
    };
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => setReducedMotion(mq.matches);

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    mq.addEventListener('change', onMotion);

    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      mq.removeEventListener('change', onMotion);
    };
  }, []);

  const openSignInGate = (mode: AuthMode = 'signin') => {
    setAuthMode(mode);
    setFormErrors({});
    setDoorsPreviewOpen(true);
    setGateStage('auth');
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { identifier?: string; password?: string; fullName?: string } = {};
    const cleanId = identifier.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId);
    const isPhone = /^\+?[0-9\s\-()]{7,18}$/.test(cleanId);

    if (!cleanId) errs.identifier = 'Enter your email address or phone number.';
    else if (!isEmail && !isPhone) errs.identifier = 'Provide a valid email or phone number.';

    if (password.trim().length < 6) errs.password = 'Password must be at least 6 characters.';
    if (authMode === 'signup' && fullName.trim().length < 2) errs.fullName = 'Enter your full name.';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const derivedName =
      authMode === 'signup' && fullName.trim()
        ? fullName.trim()
        : cleanId.includes('@')
          ? cleanId.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Valued Guest';

    setSignedUser({ name: derivedName, identifier: cleanId });
    setGateStage('role');
  };

  const handleGoogleSignIn = () => {
    setFormErrors({});
    setSignedUser({ name: 'Efua Darko', identifier: 'efua.darko@venuza.app' });
    setGateStage('role');
  };

  const enterDashboard = (role: UserRole) => {
    setSelectedRole(role);
    const initials = signedUser.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0].toUpperCase())
      .join('');
    onEnterWorkspace({
      id: role === 'owner' ? 'owner-demo' : role === 'admin' ? 'admin-demo' : 'booker-demo',
      name: signedUser.name,
      identifier: signedUser.identifier,
      role,
      avatarInitials: initials || 'VZ',
    });
  };

  const glassSurface = isSoftwareGl
    ? 'bg-[#0B0F19]/95 border border-white/15 shadow-2xl'
    : 'bg-[#0B0F19]/75 backdrop-blur-md border border-white/15 shadow-2xl';

  const staticFallback = (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{
        background:
          'radial-gradient(circle at 50% 42%, rgba(245,158,11,0.22), transparent 46%), radial-gradient(circle at 75% 20%, rgba(124,92,255,0.2), transparent 42%), #0B0F19',
      }}
    >
      <div className="w-72 h-72 rounded-t-full border-2 border-[#F59E0B]/40 bg-gradient-to-b from-[#F59E0B]/10 to-transparent" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#0B0F19] text-white">
      {/* ==================================================================== */}
      {/* FIXED 3D EVENT CENTRE GRAND ENTRANCE CANVAS                          */}
      {/* ==================================================================== */}
      <div className="fixed inset-0 z-0">
        {webglOk ? (
          <CanvasErrorBoundary fallback={staticFallback}>
            <Canvas
              shadows={isSoftwareGl ? false : 'soft'}
              dpr={isSoftwareGl ? 1 : [1, 2]}
              camera={{ position: [0, 2.05, 9.8], fov: 44, near: 0.1, far: 90 }}
              gl={{
                antialias: !isSoftwareGl,
                powerPreference: 'high-performance',
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.08,
              }}
              onCreated={({ gl }) => {
                gl.domElement.addEventListener('webglcontextlost', (e) => {
                  e.preventDefault();
                  setWebglOk(false);
                });
              }}
            >
              <EventCenterEntranceScene
                controlRef={controlRef}
                isSoftwareGl={isSoftwareGl}
                isMobile={isMobile}
              />
            </Canvas>
          </CanvasErrorBoundary>
        ) : (
          staticFallback
        )}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B0F19]/35 via-transparent to-[#0B0F19]/80"
        />
      </div>

      {/* ==================================================================== */}
      {/* TOP NAVIGATION BAR (3-Zone Contract)                                 */}
      {/* ==================================================================== */}
      <header
        className={`fixed top-0 left-0 right-0 z-30 border-b border-white/10 ${
          isSoftwareGl ? 'bg-[#0B0F19]/92' : 'bg-[#0B0F19]/75 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-8 py-3.5">
          <button
            type="button"
            onClick={() => {
              setGateStage('hero');
              setDoorsPreviewOpen(false);
            }}
            className="font-display text-lg sm:text-xl font-bold tracking-[0.22em] text-white hover:text-[#F59E0B] transition-colors whitespace-nowrap shrink-0"
          >
            {WELCOME_CONFIG.brandName}
          </button>

          {gateStage === 'hero' && (
            <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
              <a href="#entrance-booker" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Bookers
              </a>
              <a href="#entrance-owner" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Centre Owners
              </a>
              <a href="#entrance-verification" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Verification
              </a>
              <a href="#entrance-plans" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
                Plans
              </a>
            </nav>
          )}

          <div className="shrink-0">
            {gateStage === 'hero' ? (
              <button
                type="button"
                onClick={() => openSignInGate('signin')}
                className="min-h-[40px] rounded-xl bg-[#F59E0B] px-4 py-2 text-xs sm:text-sm font-semibold text-[#0B0F19] hover:bg-[#FBBF24] transition-colors whitespace-nowrap shrink-0"
              >
                {WELCOME_CONFIG.primaryCta}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setGateStage('hero');
                  setDoorsPreviewOpen(false);
                }}
                className="min-h-[40px] rounded-xl border border-white/20 px-4 py-2 text-xs sm:text-sm font-medium text-white hover:border-[#F59E0B] transition-colors whitespace-nowrap shrink-0"
              >
                Back to Entrance
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* HERO OVERLAY & SCROLLABLE ARCHITECTURAL SHOWCASE                     */}
      {/* ==================================================================== */}
      {gateStage === 'hero' && (
        <main className="relative z-10">
          <section className="relative flex min-h-screen flex-col justify-between pt-24 pb-12 px-4 sm:px-8 mx-auto max-w-7xl">
            {/* Floating Glassmorphic Preview Cards flanking the Grand Entrance */}
            <div className="hidden lg:flex items-start justify-between gap-6 pt-4 pointer-events-none">
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className={`pointer-events-auto w-64 rounded-2xl p-4 ${glassSurface}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#F59E0B]">
                  Featured Hall · Accra
                </p>
                <p className="font-display text-base font-bold text-white mt-1">Aurum Grand Dome</p>
                <p className="mt-1 text-xs text-slate-300 flex items-center gap-2">
                  <span className="font-mono-num">1,200 cap</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 text-[#FBBF24]">
                    <Star className="h-3 w-3 fill-[#FBBF24]" /> 4.9
                  </span>
                </p>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.35 }}
                className={`pointer-events-auto w-64 rounded-2xl p-4 ${glassSurface}`}
              >
                <p className="text-[11px] font-medium uppercase tracking-wider text-[#7C5CFF]">
                  Double-Booking Guard
                </p>
                <p className="font-display text-base font-bold text-white mt-1">
                  Live Calendar & MoMo Proof
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Booked dates lock automatically upon owner confirmation.
                </p>
              </motion.div>
            </div>

            {/* Center-Bottom Hero Headline & Entrance CTAs */}
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="mt-auto mx-auto max-w-3xl text-center"
            >
              <p className="text-xs sm:text-sm font-medium uppercase tracking-[0.22em] text-[#F59E0B] mb-2">
                Grand Event Centres · Conferences · Shows · Weddings
              </p>
              <h1 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-white text-balance leading-[1.06]">
                {WELCOME_CONFIG.headline}
              </h1>
              <p className="mt-3 text-base sm:text-lg text-slate-300 max-w-xl mx-auto text-balance">
                {WELCOME_CONFIG.tagline}
              </p>

              <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onMouseEnter={() => setDoorsPreviewOpen(true)}
                  onMouseLeave={() => setDoorsPreviewOpen(false)}
                  onClick={() => openSignInGate('signin')}
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-7 py-3 text-sm sm:text-base font-semibold text-[#0B0F19] shadow-lg shadow-[#F59E0B]/25 hover:bg-[#FBBF24] active:scale-[0.98] transition-all whitespace-nowrap shrink-0"
                >
                  <DoorOpen className="h-4 w-4" />
                  <span>{WELCOME_CONFIG.primaryCta}</span>
                </button>
                <button
                  type="button"
                  onClick={() => enterDashboard('booker')}
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-[#111827]/85 px-6 py-3 text-sm sm:text-base font-medium text-white hover:border-[#F59E0B] transition-all whitespace-nowrap shrink-0"
                >
                  <span>{WELCOME_CONFIG.guestCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <a
                href="#entrance-booker"
                className="mt-7 inline-flex flex-col items-center gap-1 text-xs text-slate-300 hover:text-[#F59E0B] transition-colors"
              >
                <span>Scroll to walk inside</span>
                <ChevronDown className="h-4 w-4 animate-bounce" />
              </a>
            </motion.div>
          </section>

          {/* Scrollable Walkthrough Chapters paired with 3D Door Walk-In */}
          <div className="mx-auto max-w-6xl px-4 sm:px-8 pb-24 space-y-12">
            <motion.section
              id="entrance-booker"
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className={`lg:col-span-6 rounded-2xl p-6 sm:p-8 ${glassSurface}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                  01 · Booker Discovery
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  Filter by Country, Region & Event Type
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Browse verified venues across Accra, Kumasi, Lagos, and London. Toggle interior and
                  exterior views, inspect green available dates versus red booked dates, and upload payment proof securely.
                </p>
                <button
                  type="button"
                  onClick={() => enterDashboard('booker')}
                  className="mt-5 min-h-[44px] rounded-xl bg-[#F59E0B] px-5 py-2.5 text-sm font-semibold text-[#0B0F19] hover:bg-[#FBBF24]"
                >
                  Open Booker Feed
                </button>
              </div>
            </motion.section>

            <motion.section
              id="entrance-owner"
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              <div className={`lg:col-start-7 lg:col-span-6 rounded-2xl p-6 sm:p-8 ${glassSurface}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7C5CFF]">
                  02 · Centre Owner Studio
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  List Your Venue & Control Rates Live
                </h2>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Complete our multi-step registration with your MoMo or bank settlement details,
                  track the VENUZA Verification Bot in real time, update daily rates, and lock dates on your calendar.
                </p>
                <button
                  type="button"
                  onClick={() => enterDashboard('owner')}
                  className="mt-5 min-h-[44px] rounded-xl border border-[#7C5CFF] bg-[#7C5CFF]/20 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7C5CFF]/35"
                >
                  Open Owner Dashboard
                </button>
              </div>
            </motion.section>

            <section id="entrance-verification" className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className={`rounded-2xl p-6 ${glassSurface}`}>
                <CalendarCheck className="h-6 w-6 text-[#F59E0B] mb-3" />
                <h3 className="font-display text-lg font-semibold text-white">Green vs. Red Availability</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Color-coded availability calendars clearly distinguish free green dates from locked red booked dates.
                </p>
              </div>
              <div className={`rounded-2xl p-6 ${glassSurface}`}>
                <ShieldCheck className="h-6 w-6 text-[#7C5CFF] mb-3" />
                <h3 className="font-display text-lg font-semibold text-white">Bot & Admin Verification</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Every new centre undergoes automated bot validation before website admin approval.
                </p>
              </div>
              <div className={`rounded-2xl p-6 ${glassSurface}`}>
                <MapPin className="h-6 w-6 text-[#F59E0B] mb-3" />
                <h3 className="font-display text-lg font-semibold text-white">Exact Location Pins</h3>
                <p className="mt-2 text-sm text-slate-300">
                  Inspect street addresses, map coordinates, and verified booker reviews before committing.
                </p>
              </div>
            </section>

            <section
              id="entrance-plans"
              className={`rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${glassSurface}`}
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                  Standard & Super Packages
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  14-Day Free Trial for Every New Venue
                </h2>
                <p className="text-sm text-slate-300 mt-2 max-w-xl">
                  10% monthly booking fee after trial, or upgrade to the Super Package for featured placement and 15-month savings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => openSignInGate('signin')}
                className="min-h-[48px] rounded-xl bg-[#F59E0B] px-6 py-3 text-sm font-semibold text-[#0B0F19] hover:bg-[#FBBF24] whitespace-nowrap shrink-0"
              >
                {WELCOME_CONFIG.primaryCta}
              </button>
            </section>
          </div>
        </main>
      )}

      {/* ==================================================================== */}
      {/* INTERACTIVE SIGN-IN & ROLE GATE MODALS (FRAMER MOTION)               */}
      {/* ==================================================================== */}
      <AnimatePresence mode="wait">
        {gateStage === 'auth' && (
          <motion.main
            key="auth-modal"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 flex min-h-screen items-center justify-center px-4 pt-20 pb-10"
          >
            <motion.div
              initial={reducedMotion ? false : { y: 26, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -20, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className={`w-full max-w-md rounded-2xl p-6 sm:p-8 ${glassSurface}`}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                    {authMode === 'signin' ? 'Welcome inside' : 'Create your Venuza pass'}
                  </p>
                  <h2 className="font-display text-2xl font-bold text-white mt-1">
                    {authMode === 'signin' ? 'Sign In to Venuza' : 'Create Account'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGateStage('hero');
                    setDoorsPreviewOpen(false);
                  }}
                  aria-label="Close sign in"
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setFormErrors({});
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                    authMode === 'signin' ? 'bg-[#F59E0B] text-[#0B0F19]' : 'text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setFormErrors({});
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold transition-colors ${
                    authMode === 'signup' ? 'bg-[#F59E0B] text-[#0B0F19]' : 'text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} noValidate className="space-y-4">
                {authMode === 'signup' && (
                  <div className="relative">
                    <input
                      id="vz-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder=" "
                      className="peer w-full rounded-xl border border-white/15 bg-[#0B0F19]/85 px-4 pt-6 pb-2.5 text-sm text-white placeholder-transparent focus:border-[#F59E0B] focus:outline-none"
                    />
                    <label
                      htmlFor="vz-fullname"
                      className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-[#F59E0B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-[#F59E0B]"
                    >
                      Full name
                    </label>
                    {formErrors.fullName && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.fullName}</p>
                    )}
                  </div>
                )}

                <div className="relative">
                  <input
                    id="vz-id"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder=" "
                    className="peer w-full rounded-xl border border-white/15 bg-[#0B0F19]/85 px-4 pt-6 pb-2.5 text-sm text-white placeholder-transparent focus:border-[#F59E0B] focus:outline-none"
                  />
                  <label
                    htmlFor="vz-id"
                    className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-[#F59E0B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-[#F59E0B]"
                  >
                    Email or phone number
                  </label>
                  {formErrors.identifier && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.identifier}</p>
                  )}
                </div>

                <div className="relative">
                  <input
                    id="vz-pw"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=" "
                    className="peer w-full rounded-xl border border-white/15 bg-[#0B0F19]/85 px-4 pt-6 pb-2.5 pr-12 text-sm text-white placeholder-transparent focus:border-[#F59E0B] focus:outline-none"
                  />
                  <label
                    htmlFor="vz-pw"
                    className="pointer-events-none absolute left-4 top-2 text-[11px] font-medium text-[#F59E0B] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-slate-400 peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-[#F59E0B]"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {formErrors.password && (
                    <p className="mt-1 text-xs text-red-400">{formErrors.password}</p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full min-h-[48px] rounded-xl bg-[#F59E0B] px-5 py-3 text-sm font-semibold text-[#0B0F19] hover:bg-[#FBBF24] transition-colors"
                >
                  {authMode === 'signin' ? 'Sign In & Choose Role' : 'Create Account'}
                </button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full min-h-[46px] flex items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </motion.div>
          </motion.main>
        )}

        {gateStage === 'role' && (
          <motion.main
            key="role-modal"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-20 flex min-h-screen items-center justify-center px-4 pt-20 pb-12"
          >
            <motion.div
              initial={reducedMotion ? false : { y: 24, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 250, damping: 24 }}
              className={`w-full max-w-3xl rounded-2xl p-6 sm:p-10 ${glassSurface}`}
            >
              <div className="text-center mb-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#F59E0B]">
                  Signed in as {signedUser.name}
                </p>
                <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mt-1">
                  Are you a Booker or a Centre Owner?
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Select your destination inside Venuza. You can switch roles anytime.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.button
                  type="button"
                  whileHover={reducedMotion ? undefined : { y: -4 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                  onClick={() => {
                    setSelectedRole('booker');
                    setGateStage('ready');
                  }}
                  className="group text-left rounded-2xl border border-white/15 bg-[#111827]/90 p-6 hover:border-[#F59E0B] transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] mb-4">
                    <SparklesIcon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white group-hover:text-[#F59E0B]">
                    I'm a Booker
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Find and book event centres by country, region, event type, and live availability.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#F59E0B]">
                    <span>Explore venues</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={reducedMotion ? undefined : { y: -4 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.99 }}
                  onClick={() => {
                    setSelectedRole('owner');
                    setGateStage('ready');
                  }}
                  className="group text-left rounded-2xl border border-white/15 bg-[#111827]/90 p-6 hover:border-[#7C5CFF] transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C5CFF]/20 text-[#A78BFA] mb-4">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-xl font-bold text-white group-hover:text-[#A78BFA]">
                    I'm a Centre Owner
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Register your venue, verify payment proofs, update rates, and manage booked dates.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#A78BFA]">
                    <span>Manage venue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </motion.button>
              </div>

              <div className="mt-6 flex justify-center border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    setGateStage('ready');
                  }}
                  className="min-h-[40px] inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  <ShieldCheck className="h-4 w-4 text-[#F59E0B]" />
                  <span>Open Website Admin Console</span>
                </button>
              </div>
            </motion.div>
          </motion.main>
        )}

        {gateStage === 'ready' && (
          <motion.main
            key="ready-modal"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-20 flex min-h-screen items-center justify-center px-4 pt-20 pb-10"
          >
            <div className={`w-full max-w-md rounded-2xl p-8 text-center ${glassSurface}`}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">
                {selectedRole === 'booker'
                  ? 'Continue to Booker dashboard'
                  : selectedRole === 'owner'
                    ? 'Continue to Owner dashboard'
                    : 'Continue to Admin console'}
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                The doors are open — step into your Venuza workspace.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => enterDashboard(selectedRole)}
                  className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-3 text-sm font-semibold text-[#0B0F19] hover:bg-[#FBBF24]"
                >
                  <span>Enter Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setGateStage('role')}
                  className="min-h-[40px] text-xs font-medium text-slate-400 hover:text-white"
                >
                  Switch Role
                </button>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
};
