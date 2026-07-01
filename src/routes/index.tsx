import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Sparkles,
  MessageSquare,
  Inbox,
  Users,
  TrendingUp,
  Workflow,
  BarChart3,
  Plug,
  Zap,
  Check,
  Star,
  ChevronDown,
  Play,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Twitter,
  Github,
  Linkedin,
  Menu,
  X,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "kortex Ai — AI Platform to Automate Sales, Support & Operations" },
      {
        name: "description",
        content:
          "Automate WhatsApp, Facebook, Instagram, Telegram, Live Chat & Email from one AI dashboard. The #1 AI platform for modern businesses.",
      },
      { property: "og:title", content: "kortex Ai — AI Business Automation" },
      {
        property: "og:description",
        content:
          "Automate sales, support and operations across every messaging channel with one AI dashboard.",
      },
    ],
  }),
  component: Landing,
});

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

function Landing() {
  return (
    <div
      className="relative min-h-screen overflow-x-clip text-white antialiased"
      style={{ background: "#08080B", fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}
    >
      <GlobalBackground />
      <Nav />
      <Hero />
      
      <Problem />
      <Solution />
      <Features />
      
      <DashboardShowcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Background                                                                 */
/* -------------------------------------------------------------------------- */

function GlobalBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.9), transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.9), transparent 70%)",
        }}
      />
      {/* glowing blobs */}
      <motion.div
        className="absolute -top-40 left-1/4 h-[520px] w-[520px] rounded-full opacity-50 blur-[140px]"
        style={{ background: "radial-gradient(circle, #7c3aed 0%, transparent 60%)" }}
        animate={{ x: [0, 60, -40, 0], y: [0, 40, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 right-0 h-[600px] w-[600px] rounded-full opacity-40 blur-[160px]"
        style={{ background: "radial-gradient(circle, #2563eb 0%, transparent 60%)" }}
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -30, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[60%] left-[10%] h-[420px] w-[420px] rounded-full opacity-30 blur-[140px]"
        style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 60%)" }}
        animate={{ x: [0, 40, -30, 0], y: [0, -30, 40, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Nav                                                                        */
/* -------------------------------------------------------------------------- */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = ["Features", "Solutions", "Pricing", "Resources"];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div
          className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-2.5 backdrop-blur-xl transition-all ${
            scrolled ? "bg-[#0c0c11]/80 shadow-[0_8px_40px_-12px_rgba(124,58,237,0.25)]" : "bg-white/[0.03]"
          }`}
        >
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 shadow-lg shadow-violet-500/30">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight">kortex Ai</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
              >
                {l}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              to="/auth"
              className="rounded-lg px-3 py-1.5 text-sm text-white/80 hover:text-white"
            >
              Login
            </Link>
            <GradientButton size="sm">Book Demo</GradientButton>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c11]/95 p-3 backdrop-blur-xl md:hidden"
            >
              <nav className="flex flex-col">
                {links.map((l) => (
                  <a
                    key={l}
                    href={`#${l.toLowerCase()}`}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                  >
                    {l}
                  </a>
                ))}
                <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
                  <Link
                    to="/auth"
                    className="flex-1 rounded-lg border border-white/10 px-3 py-2 text-center text-sm"
                  >
                    Login
                  </Link>
                  <GradientButton size="sm" className="flex-1 justify-center">
                    Book Demo
                  </GradientButton>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Buttons                                                                    */
/* -------------------------------------------------------------------------- */

function GradientButton({
  children,
  size = "md",
  className = "",
  asLink,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  asLink?: string;
}) {
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };
  const inner = (
    <span
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium text-white shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)] transition-transform duration-200 hover:scale-[1.03] ${sizes[size]} ${className}`}
      style={{
        background:
          "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #2563eb 100%)",
      }}
    >
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      <span
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
        aria-hidden
      />
    </span>
  );
  if (asLink) {
    return (
      <a href={asLink} className="group inline-flex">
        {inner}
      </a>
    );
  }
  return <button className="group inline-flex">{inner}</button>;
}

function GhostButton({
  children,
  size = "md",
  className = "",
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-9 px-4 text-sm",
    md: "h-11 px-5 text-sm",
    lg: "h-12 px-6 text-base",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] font-medium text-white backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/[0.08] ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hero                                                                       */
/* -------------------------------------------------------------------------- */

const ROTATING = ["Sales", "Support", "Automation", "Marketing", "CRM"];

function Hero() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % ROTATING.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative pt-36 pb-24 md:pt-44 md:pb-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80 backdrop-blur-md"
          >
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            AI Powered Business Automation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="mt-6 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl lg:text-[64px]"
          >
            The #1 AI Platform to Automate{" "}
            <AnimatePresence mode="wait">
              <motion.span
                key={ROTATING[idx]}
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                transition={{ duration: 0.45 }}
                className="inline-block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent"
              >
                {ROTATING[idx]}
              </motion.span>
            </AnimatePresence>
            ,<br />
            Customer Support &{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Business Operations
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 max-w-xl text-base text-white/65 md:text-lg"
          >
            Automate WhatsApp, Facebook, Instagram, Telegram, Website Live Chat and Email from one AI dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <GradientButton size="lg" asLink="/auth">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </GradientButton>
            <GhostButton size="lg">
              <Play className="h-4 w-4" /> Watch Demo
            </GhostButton>
          </motion.div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/50">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" /> Free 7-day trial
            </span>
          </div>
        </div>

        <FloatingDashboard />
      </div>
    </section>
  );
}

function FloatingDashboard() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2 }}
      className="relative"
    >
      {/* gradient border */}
      <div
        className="relative rounded-[28px] p-[1px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(37,99,235,0.2) 50%, rgba(236,72,153,0.4))",
        }}
      >
        <div className="rounded-[27px] bg-[#0b0b12]/90 p-4 backdrop-blur-xl">
          {/* top bar */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
            </div>
            <div className="text-[10px] text-white/40">app.kortexai.com</div>
            <div className="h-4 w-4" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <StatTile label="Revenue" value="$48.2K" trend="+24%" />
            <StatTile label="Conversations" value="12.4K" trend="+18%" />
            <StatTile label="AI Reply Rate" value="96%" trend="+4%" />
          </div>

          <div className="mt-3 grid grid-cols-5 gap-3">
            <div className="col-span-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] text-white/60">
                <span className="font-medium text-white/80">Sales Overview</span>
                <span>Last 30 days</span>
              </div>
              <MiniChart />
            </div>
            <div className="col-span-2 flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="text-[11px] font-medium text-white/80">Live Inbox</div>
              {[
                { n: "Sarah K.", m: "Is the UPS in stock?", c: "from-violet-500 to-fuchsia-500" },
                { n: "Ahmed R.", m: "Need help with order…", c: "from-blue-500 to-cyan-500" },
                { n: "Maria L.", m: "Thanks, perfect! 🙏", c: "from-emerald-500 to-teal-500" },
              ].map((x) => (
                <div key={x.n} className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-1.5">
                  <div className={`grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br ${x.c} text-[10px] font-semibold`}>
                    {x.n[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-white/90">{x.n}</div>
                    <div className="truncate text-[10px] text-white/50">{x.m}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -left-4 top-12 hidden rounded-2xl border border-white/10 bg-[#0c0c14]/90 p-3 shadow-2xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium">New order</div>
            <div className="text-[10px] text-white/50">+$129 just now</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-4 bottom-10 hidden rounded-2xl border border-white/10 bg-[#0c0c14]/90 p-3 shadow-2xl backdrop-blur-xl sm:block"
      >
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-medium">AI replied</div>
            <div className="text-[10px] text-white/50">in 0.8s · Bangla</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatTile({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      <div className="text-[10px] text-emerald-400">{trend}</div>
    </div>
  );
}

function MiniChart() {
  const points = [12, 18, 14, 22, 28, 24, 32, 38, 30, 42, 48, 56];
  const max = Math.max(...points);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - (p / max) * 90;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 100 L 0 100 Z`} fill="url(#g1)" />
      <path d={path} fill="none" stroke="#a78bfa" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Trusted by                                                                 */
/* -------------------------------------------------------------------------- */

function TrustedBy() {
  const logos = ["Shopify", "Stripe", "Notion", "Linear", "Vercel", "Framer", "Figma", "Slack", "HubSpot", "Intercom"];
  return (
    <section className="border-y border-white/5 bg-white/[0.01] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_20%,#000_80%,transparent)]">
          <motion.div
            className="flex gap-14"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          >
            {[...logos, ...logos].map((l, i) => (
              <span
                key={i}
                className="whitespace-nowrap text-2xl font-semibold tracking-tight text-white/40 transition-colors hover:text-white/80"
                style={{ fontFamily: '"Inter", sans-serif' }}
              >
                {l}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Problem                                                                    */
/* -------------------------------------------------------------------------- */

function Problem() {
  const cards = [
    {
      icon: MessageSquare,
      title: "Missed Messages",
      desc: "Customers slip away when DMs sit unanswered overnight or on weekends.",
      color: "from-rose-500 to-orange-500",
    },
    {
      icon: Clock,
      title: "Slow Response",
      desc: "Every minute of delay kills conversion. Studies show 5x drop after 5 minutes.",
      color: "from-amber-500 to-yellow-400",
    },
    {
      icon: AlertTriangle,
      title: "Manual Support",
      desc: "Your team copy-pastes the same answers all day instead of growing the business.",
      color: "from-violet-500 to-fuchsia-500",
    },
  ];
  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="The Problem"
          title={
            <>
              You're losing customers because your business{" "}
              <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
                replies too slowly
              </span>
              .
            </>
          }
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.08}>
              <GlassCard className="h-full p-7">
                <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${c.color} shadow-lg`}>
                  <c.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-5 text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{c.desc}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Solution                                                                   */
/* -------------------------------------------------------------------------- */

function Solution() {
  const features = [
    { icon: Bot, title: "AI replies in seconds", desc: "Trained on your products, pricing & FAQs." },
    { icon: Inbox, title: "One unified inbox", desc: "WhatsApp, Messenger, IG, Telegram, Email." },
    { icon: Users, title: "Full CRM included", desc: "Customer profiles, tags, notes, history." },
    { icon: TrendingUp, title: "Real-time analytics", desc: "Conversions, response time, revenue." },
  ];
  return (
    <section id="solutions" className="py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <span className="text-xs uppercase tracking-[0.2em] text-violet-300/80">The Solution</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            One AI dashboard to{" "}
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              run your entire business
            </span>
            .
          </h2>
          <p className="mt-5 max-w-lg text-white/60">
            Connect every channel, let AI handle the routine, and step in only when it matters. Built for modern teams that move fast.
          </p>
          <div className="mt-8 space-y-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <div className="group flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-violet-400/30 hover:bg-white/[0.04]">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 text-violet-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium">{f.title}</div>
                    <div className="text-sm text-white/55">{f.desc}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <ConversationDemo />
        </Reveal>
      </div>
    </section>
  );
}

const DEMO = [
  { from: "user", text: "Do you have the iPhone 15 in stock?" },
  { from: "ai", text: "Yes! iPhone 15 Pro 256GB is available at ৳145,000. Free delivery 🚚" },
  { from: "user", text: "Can I order one to Dhanmondi?" },
  { from: "ai", text: "Absolutely. Share your name, address & phone — I'll confirm in 30 seconds." },
];

function ConversationDemo() {
  const [v, setV] = useState(1);
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    if (v >= DEMO.length) {
      const t = setTimeout(() => setV(1), 3500);
      return () => clearTimeout(t);
    }
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setV((n) => n + 1);
    }, 1500);
    return () => clearTimeout(t);
  }, [v]);

  return (
    <div
      className="relative rounded-[28px] p-[1px]"
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(37,99,235,0.2), rgba(236,72,153,0.4))",
      }}
    >
      <div className="rounded-[27px] bg-[#0b0b12]/90 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Assistant</div>
              <div className="text-[11px] text-emerald-400">● Online · replying in Bangla</div>
            </div>
          </div>
          <div className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/60">
            Messenger
          </div>
        </div>

        <div className="mt-5 flex h-80 flex-col gap-2.5 overflow-hidden">
          <AnimatePresence initial={false}>
            {DEMO.slice(0, v).map((m, i) => (
              <motion.div
                key={`${v}-${i}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.from === "user"
                    ? "self-start bg-white/[0.06] text-white/90"
                    : "self-end bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg shadow-violet-500/20"
                }`}
              >
                {m.text}
              </motion.div>
            ))}
            {typing && v < DEMO.length && (
              <motion.div
                key="t"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex gap-1 self-end rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 px-3.5 py-3"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-white"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Features                                                                   */
/* -------------------------------------------------------------------------- */

function Features() {
  const items = [
    { icon: MessageSquare, title: "AI Chat Automation", desc: "Human-like replies, 24/7.", c: "from-violet-500 to-fuchsia-500" },
    { icon: Inbox, title: "Live Inbox", desc: "Every channel in one place.", c: "from-blue-500 to-cyan-500" },
    { icon: Users, title: "CRM", desc: "Profiles, tags, history.", c: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, title: "Sales Pipeline", desc: "Deals, stages, forecasts.", c: "from-amber-500 to-orange-500" },
    { icon: Bot, title: "AI Agent", desc: "Trained on your data.", c: "from-pink-500 to-rose-500" },
    { icon: Workflow, title: "Workflow Automation", desc: "Triggers, actions, no-code.", c: "from-indigo-500 to-violet-500" },
    { icon: BarChart3, title: "Analytics", desc: "Conversion, revenue, time.", c: "from-cyan-500 to-blue-500" },
    { icon: Plug, title: "API & Integrations", desc: "100+ apps out of the box.", c: "from-fuchsia-500 to-pink-500" },
  ];
  return (
    <section id="features" className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Features"
          title={
            <>
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                ship faster
              </span>
              .
            </>
          }
          subtitle="A complete platform that replaces 10+ tools and just works."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.04}>
              <GlassCard className="group h-full p-6 transition-all hover:-translate-y-1 hover:border-white/20">
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${it.c} shadow-lg`}>
                  <it.icon className="h-5 w-5 text-white" />
                </div>
                <div className="mt-5 font-semibold">{it.title}</div>
                <div className="mt-1 text-sm text-white/55">{it.desc}</div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Integrations                                                               */
/* -------------------------------------------------------------------------- */

function Integrations() {
  const apps = [
    "WhatsApp", "Facebook", "Instagram", "Messenger", "Telegram", "Shopify",
    "WooCommerce", "WordPress", "Stripe", "Slack", "Google Sheets", "HubSpot",
    "Zapier", "OpenAI", "Gemini", "Claude", "Anthropic", "MS Teams",
  ];
  return (
    <section id="integrations" className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Integrations"
          title={
            <>
              Connect{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                everything you already use
              </span>
              .
            </>
          }
        />
        <div className="mt-14 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {apps.map((a, i) => (
            <Reveal key={a} delay={i * 0.02}>
              <div className="group flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md transition-all hover:-translate-y-1 hover:border-violet-400/40 hover:bg-white/[0.06] hover:shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)]">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 text-sm font-semibold">
                  {a[0]}
                </div>
                <div className="text-center text-xs text-white/70">{a}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Showcase                                                         */
/* -------------------------------------------------------------------------- */

function DashboardShowcase() {
  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Dashboard"
          title={
            <>
              A workspace built for{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                serious operators
              </span>
              .
            </>
          }
        />
        <Reveal>
          <div className="relative mt-16">
            {/* macbook lid */}
            <div
              className="relative mx-auto max-w-5xl rounded-t-[24px] p-[1px]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.6), rgba(37,99,235,0.3), rgba(236,72,153,0.5))",
              }}
            >
              <div className="rounded-t-[23px] bg-[#0b0b12] p-3">
                <div className="overflow-hidden rounded-xl border border-white/5 bg-[#08080B]">
                  <div className="flex items-center justify-between border-b border-white/5 px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                      <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                    </div>
                    <div className="text-[10px] text-white/40">kortex Ai · Dashboard</div>
                    <span />
                  </div>

                  <div className="grid grid-cols-12 gap-3 p-4">
                    {/* sidebar */}
                    <div className="col-span-2 space-y-1.5">
                      {["Overview", "Inbox", "CRM", "Sales", "Analytics", "Automation", "Settings"].map((s, i) => (
                        <div
                          key={s}
                          className={`rounded-lg px-2 py-1.5 text-[10px] ${
                            i === 0 ? "bg-white/10 text-white" : "text-white/50"
                          }`}
                        >
                          {s}
                        </div>
                      ))}
                    </div>
                    {/* main */}
                    <div className="col-span-7 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <StatTile label="MRR" value="$92K" trend="+32%" />
                        <StatTile label="Customers" value="2,184" trend="+12%" />
                        <StatTile label="Churn" value="0.8%" trend="-0.3%" />
                      </div>
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="mb-2 text-[10px] text-white/60">Revenue · Last 6 months</div>
                        <MiniChart />
                      </div>
                    </div>
                    {/* right */}
                    <div className="col-span-3 space-y-2">
                      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
                        <div className="text-[10px] font-medium text-white/80">AI Suggestions</div>
                        <div className="mt-1.5 text-[10px] text-white/60">
                          ✨ 3 customers showed buying intent today. Want to send a follow-up?
                        </div>
                      </div>
                      {["Sarah K. · $129", "Ahmed R. · $84", "Maria L. · $312"].map((x) => (
                        <div key={x} className="rounded-lg bg-white/[0.03] p-2 text-[10px] text-white/70">
                          {x}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* base */}
            <div className="mx-auto h-3 max-w-[1100px] rounded-b-[10px] bg-gradient-to-b from-[#1a1a22] to-[#0a0a0e]" />
            <div className="mx-auto h-1 w-32 rounded-b-xl bg-[#0a0a0e]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Testimonials                                                               */
/* -------------------------------------------------------------------------- */

function Testimonials() {
  const t = [
    {
      n: "Rashed Ahmed",
      r: "CEO, Bazar BD",
      q: "Our response time dropped from 4 hours to 8 seconds. Sales went up 38% in a month.",
      c: "from-violet-500 to-fuchsia-500",
    },
    {
      n: "Nadia Hossain",
      r: "Head of Ops, Glow",
      q: "Finally, one inbox for WhatsApp, Messenger and IG. The AI is scary good in Bangla.",
      c: "from-blue-500 to-cyan-500",
    },
    {
      n: "Tarek Mahmud",
      r: "Founder, Pixel Studio",
      q: "Feels like Linear meets Intercom. Beautiful, fast and we ship more with it.",
      c: "from-emerald-500 to-teal-500",
    },
  ];
  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader eyebrow="Customers" title="Loved by teams that ship." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {t.map((it, i) => (
            <Reveal key={it.n} delay={i * 0.08}>
              <GlassCard className="h-full p-7">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mt-4 text-base leading-relaxed text-white/85">"{it.q}"</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${it.c} text-sm font-semibold`}>
                    {it.n[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{it.n}</div>
                    <div className="text-xs text-white/50">{it.r}</div>
                  </div>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pricing                                                                    */
/* -------------------------------------------------------------------------- */

function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "৳999",
      desc: "For solo founders & small shops.",
      features: ["Facebook comment reply", "Facebook inbox reply", "WhatsApp & SMS reply", "1,000 AI messages", "Basic CRM", "Email support"],
      highlight: false,
    },
    {
      name: "Pro",
      price: "৳4999",
      desc: "For growing teams that mean business.",
      features: ["25,000 AI messages", "All channels", "Full CRM + Pipeline", "Workflow automation", "Priority support"],
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      desc: "For teams with serious volume.",
      features: ["Unlimited messages", "Custom AI training", "Dedicated CSM", "SSO + SOC2", "99.99% SLA"],
      highlight: false,
    },
  ];
  return (
    <section id="pricing" className="py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeader
          eyebrow="Pricing"
          title={
            <>
              Simple pricing that{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                scales with you
              </span>
              .
            </>
          }
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 0.08}>
              <div
                className={`relative h-full rounded-[24px] p-[1px] transition-transform hover:-translate-y-1 ${
                  p.highlight ? "" : ""
                }`}
                style={{
                  background: p.highlight
                    ? "linear-gradient(135deg, #7c3aed, #2563eb, #ec4899)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <div className="relative h-full rounded-[23px] bg-[#0b0b12]/95 p-7 backdrop-blur-xl">
                  {p.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <div className="text-sm text-white/60">{p.name}</div>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-5xl font-semibold tracking-tight">{p.price}</span>
                    {p.price !== "Custom" && <span className="text-sm text-white/50">/mo</span>}
                  </div>
                  <p className="mt-2 text-sm text-white/55">{p.desc}</p>
                  <div className="mt-6">
                    {p.highlight ? (
                      <GradientButton size="md" className="w-full justify-center">
                        Get Started
                      </GradientButton>
                    ) : (
                      <GhostButton size="md" className="w-full justify-center">
                        Get Started
                      </GhostButton>
                    )}
                  </div>
                  <ul className="mt-6 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  FAQ                                                                        */
/* -------------------------------------------------------------------------- */

function FAQ() {
  const items = [
    { q: "How fast can I get started?", a: "Sign up, connect a channel, and the AI starts replying within 5 minutes. No code required." },
    { q: "Does the AI speak Bangla?", a: "Yes — fluent Bangla, English, Hindi, Arabic and 25+ languages out of the box." },
    { q: "Can I take over a conversation?", a: "Anytime. The handoff is one click and the AI pauses until you hand back." },
    { q: "What about data privacy?", a: "SOC2 compliant, EU-hosted option, full data export and deletion controls." },
    { q: "Is there a free trial?", a: "7 days, full Pro features, no credit card. Cancel anytime." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="resources" className="py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHeader eyebrow="FAQ" title="Questions, answered." />
        <div className="mt-12 space-y-3">
          {items.map((it, i) => (
            <Reveal key={it.q} delay={i * 0.04}>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md">
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="font-medium">{it.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-white/50 transition-transform ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-6 pb-5 text-sm leading-relaxed text-white/65">{it.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Final CTA                                                                  */
/* -------------------------------------------------------------------------- */

function FinalCTA() {
  return (
    <section className="py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div
          className="relative overflow-hidden rounded-[32px] p-[1px]"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #2563eb, #ec4899)",
          }}
        >
          <div className="relative overflow-hidden rounded-[31px] bg-[#0b0b12] px-8 py-20 text-center">
            <motion.div
              className="absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
              style={{ background: "radial-gradient(circle, #7c3aed, transparent 60%)" }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <h2 className="relative text-3xl font-semibold tracking-tight md:text-5xl">
              Ready to{" "}
              <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                automate your business
              </span>
              ?
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/65">
              Join 10,000+ teams using kortex Ai to reply faster, sell more, and ship like a startup.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <GradientButton size="lg" asLink="/auth">
                Start Free Today <ArrowRight className="h-4 w-4" />
              </GradientButton>
              <GhostButton size="lg">Book Demo</GhostButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                     */
/* -------------------------------------------------------------------------- */

function Footer() {
  const cols = [
    { h: "Product", l: ["Features", "Pricing", "Changelog"] },
    { h: "Solutions", l: ["E-commerce", "Agencies", "SaaS", "Enterprise"] },
    { h: "Company", l: ["Blog", "Careers", "Privacy", "Terms"] },
  ];
  return (
    <footer className="border-t border-white/5 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
                <Bot className="h-4 w-4" />
              </div>
              <span className="font-semibold">kortex Ai</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/55">
              The AI platform to automate sales, support and operations — across every channel.
            </p>
            <div className="mt-5 flex gap-2">
              {[Twitter, Github, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="text-sm font-semibold">{c.h}</div>
              <ul className="mt-4 space-y-2.5">
                {c.l.map((x) => (
                  <li key={x}>
                    <a href="#" className="text-sm text-white/55 hover:text-white">
                      {x}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} kortex Ai. All rights reserved.</div>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.5)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Reveal>
        <span className="text-xs uppercase tracking-[0.2em] text-violet-300/80">{eyebrow}</span>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">{title}</h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.1}>
          <p className="mt-4 text-white/60">{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
