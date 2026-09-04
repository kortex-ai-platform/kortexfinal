import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronDown,
  Facebook,
  Globe2,
  Inbox,
  Instagram,
  Menu,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kortex AI — বাংলা AI Sales Agent" },
      {
        name: "description",
        content: "Facebook, WhatsApp ও Messenger-এর customer reply, order collection এবং sales automation করুন Kortex AI দিয়ে।",
      },
      { property: "og:title", content: "Kortex AI — বাংলা AI Sales Agent" },
      {
        property: "og:description",
        content: "এক inbox থেকে customer reply, order collection এবং sales automation—বাংলা ও English-এ, 24/7।",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Kortex AI — বাংলা AI Sales Agent" },
      {
        name: "twitter:description",
        content: "Facebook, WhatsApp ও Messenger sales automation for growing businesses.",
      },
    ],
  }),
  component: Landing,
});

const navItems = [
  ["কীভাবে কাজ করে", "#how-it-works"],
  ["Features", "#features"],
  ["Pricing", "#pricing"],
  ["FAQ", "#faq"],
] as const;

function Landing() {
  return (
    <div className="landing min-h-screen overflow-x-clip bg-landing text-landing-foreground antialiased">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <UseCases />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-lg border border-landing-border bg-landing-panel/90 px-4 py-3 shadow-soft backdrop-blur-xl">
        <Link to="/" className="flex items-center gap-2" aria-label="Kortex AI home">
          <span className="grid size-9 place-items-center rounded-md bg-landing-primary text-landing-primary-foreground shadow-brand">
            <Bot className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">Kortex AI</span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-medium text-landing-muted transition-colors hover:text-landing-foreground">
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="text-landing-foreground hover:bg-landing-soft">
            <Link to="/auth">Log in</Link>
          </Button>
          <Button asChild className="bg-landing-primary text-landing-primary-foreground hover:bg-landing-primary/90">
            <Link to="/auth">ফ্রি শুরু করুন <ArrowRight /></Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Toggle menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto mt-2 max-w-6xl rounded-lg border border-landing-border bg-landing-panel p-3 shadow-soft md:hidden">
            {navItems.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-landing-soft">{label}</a>
            ))}
            <Button asChild className="mt-2 w-full bg-landing-primary text-landing-primary-foreground">
              <Link to="/auth">ফ্রি শুরু করুন</Link>
            </Button>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:pt-40">
      <div className="landing-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-5xl text-center">
        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-landing-border bg-landing-panel px-4 py-2 text-xs font-semibold text-landing-primary shadow-soft sm:text-sm">
            <Sparkles className="size-4" /> AI Sales Automation
          </div>
          <h1 className="mx-auto mt-7 max-w-4xl font-display text-4xl font-bold leading-[1.08] sm:text-6xl lg:text-7xl">
            Every message can become <span className="text-landing-primary">your next sale.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl font-bangla text-lg leading-8 text-landing-muted sm:text-xl">
            Facebook, WhatsApp ও Messenger-এর customer reply, order collection আর follow-up—সবকিছু এক AI inbox থেকে, ২৪/৭।
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 bg-landing-primary px-7 text-base text-landing-primary-foreground shadow-brand hover:bg-landing-primary/90">
              <Link to="/auth">ফ্রি শুরু করুন <ArrowRight /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-landing-border bg-landing-panel px-7 text-base text-landing-foreground hover:bg-landing-soft">
              <a href="#product-demo"><Play /> Live demo দেখুন</a>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-landing-muted">
            {["7-day free trial", "No credit card", "Setup in minutes"].map((item) => (
              <span key={item} className="flex items-center gap-1.5"><Check className="size-4 text-landing-success" />{item}</span>
            ))}
          </div>
        </Reveal>
      </div>
      <div id="product-demo" className="relative mx-auto mt-14 max-w-6xl scroll-mt-28">
        <InboxPreview />
      </div>
    </section>
  );
}

function InboxPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="overflow-hidden rounded-lg border border-landing-border bg-landing-panel shadow-product">
      <div className="flex items-center justify-between border-b border-landing-border bg-landing-soft/60 px-4 py-3">
        <div className="flex gap-1.5"><span className="size-2.5 rounded-full bg-landing-danger" /><span className="size-2.5 rounded-full bg-landing-warning" /><span className="size-2.5 rounded-full bg-landing-success" /></div>
        <span className="text-xs text-landing-muted">Kortex Live Inbox</span><span className="w-10" />
      </div>
      <div className="grid min-h-[500px] md:grid-cols-[190px_270px_1fr_230px]">
        <aside className="hidden border-r border-landing-border p-4 md:block">
          <div className="mb-6 flex items-center gap-2 font-display font-bold"><span className="grid size-7 place-items-center rounded-md bg-landing-primary text-xs text-landing-primary-foreground">K</span>Kortex</div>
          {[[Inbox,"Inbox","12"],[Users,"Customers",""],[PackageCheck,"Orders","5"],[BarChart3,"Analytics",""]].map(([Icon,label,count], index) => {
            const MenuIcon = Icon as typeof Inbox;
            return <div key={String(label)} className={cn("mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm", index === 0 ? "bg-landing-primary-soft text-landing-primary" : "text-landing-muted")}><MenuIcon className="size-4"/><span className="flex-1">{label as string}</span>{count ? <span className="rounded-full bg-landing-primary px-1.5 text-[10px] text-landing-primary-foreground">{count as string}</span> : null}</div>;
          })}
        </aside>
        <div className="hidden border-r border-landing-border md:block">
          <div className="border-b border-landing-border p-4"><p className="font-semibold">All conversations</p><p className="mt-1 text-xs text-landing-muted">Facebook · WhatsApp</p></div>
          {["Nusrat Jahan","Rafi Ahmed","Tania Store"].map((name, index) => <div key={name} className={cn("border-b border-landing-border p-4", index === 0 && "bg-landing-primary-soft")}><div className="flex items-center justify-between"><span className="text-sm font-semibold">{name}</span><span className="text-[10px] text-landing-muted">now</span></div><p className="mt-1 truncate font-bangla text-xs text-landing-muted">{index === 0 ? "এই dress টা কি available?" : "Order update জানতে চাই..."}</p></div>)}
        </div>
        <div className="flex min-w-0 flex-col border-r border-landing-border">
          <div className="flex items-center justify-between border-b border-landing-border p-4"><div><p className="font-semibold">Nusrat Jahan</p><p className="text-xs text-landing-success">● Messenger · online</p></div><span className="rounded-full bg-landing-success-soft px-2.5 py-1 text-xs font-semibold text-landing-success">AI active</span></div>
          <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
            <ChatBubble delay={0.2} className="self-start bg-landing-soft text-landing-foreground">এই dress টা কি available? Price কত?</ChatBubble>
            <ChatBubble delay={0.4} className="self-end bg-landing-primary text-landing-primary-foreground">জি, available আছে ✅ Price ৳1,250। ঢাকার ভিতরে free delivery এবং Cash on Delivery পাবেন।</ChatBubble>
            <ChatBubble delay={0.6} className="self-start bg-landing-soft text-landing-foreground">আমি order করতে চাই।</ChatBubble>
            <ChatBubble delay={0.8} className="self-end bg-landing-primary text-landing-primary-foreground">দারুণ! আপনার নাম, phone number ও address দিলেই order confirm করে দিচ্ছি।</ChatBubble>
          </div>
          <div className="m-4 flex items-center gap-2 rounded-md border border-landing-border bg-landing-soft px-4 py-3 text-sm text-landing-muted">Write a reply…<Sparkles className="ml-auto size-4 text-landing-primary" /></div>
        </div>
        <aside className="hidden p-4 lg:block">
          <p className="text-sm font-semibold">Order summary</p>
          <div className="mt-4 rounded-md bg-landing-soft p-3"><p className="text-xs text-landing-muted">Product</p><p className="mt-1 text-sm font-semibold">Premium Cotton Dress</p><p className="mt-3 text-lg font-bold">৳1,250</p></div>
          <div className="mt-3 rounded-md border border-landing-success/30 bg-landing-success-soft p-3 text-sm text-landing-success"><Check className="mb-2 size-4" />Order details ready to collect</div>
        </aside>
      </div>
    </motion.div>
  );
}

function ChatBubble({ children, delay, className }: { children: ReactNode; delay: number; className: string }) {
  const reduceMotion = useReducedMotion();
  return <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} className={cn("max-w-[88%] rounded-lg px-4 py-3 font-bangla text-sm leading-6 shadow-soft sm:max-w-[76%]", className)}>{children}</motion.div>;
}

function Problem() {
  const items = [
    [MessageSquare, "Missed messages", "Late reply হলে buyer competitor-এর কাছে চলে যায়।"],
    [Zap, "Same প্রশ্ন, বারবার", "Price, stock ও delivery reply-তেই team-এর সময় শেষ।"],
    [PackageCheck, "Order details হারায়", "Inbox থেকে name, phone ও address manual copy করতে হয়।"],
  ] as const;
  return <section className="border-y border-landing-border bg-landing-panel py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionTitle eyebrow="THE PROBLEM" title="Slow replies cost real sales." subtitle="আপনি offline থাকলেও customer কিন্তু অপেক্ষা করে না।" /><div className="mt-12 grid gap-5 md:grid-cols-3">{items.map(([Icon,title,desc],i)=><Reveal key={title} delay={i*.08}><div className="h-full border-t-2 border-landing-primary bg-landing-soft p-6"><Icon className="size-6 text-landing-primary"/><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 font-bangla leading-7 text-landing-muted">{desc}</p></div></Reveal>)}</div></div></section>;
}

function HowItWorks() {
  const steps = [
    ["01", "Connect your channels", "Facebook Page, Messenger ও WhatsApp এক workspace-এ আনুন।"],
    ["02", "Teach Kortex your business", "Product, price, delivery policy ও brand voice যোগ করুন।"],
    ["03", "AI replies and takes orders", "Bangla, Banglish বা English—context বুঝে instant response।"],
    ["04", "Your team stays in control", "যেকোনো সময় conversation takeover করুন এবং AI pause হবে।"],
  ];
  return <section id="how-it-works" className="scroll-mt-20 py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionTitle eyebrow="HOW IT WORKS" title="From inbox to confirmed order." subtitle="মাত্র কয়েকটি step-এ repetitive support-কে automated sales flow-এ বদলান।" /><div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-landing-border bg-landing-border md:grid-cols-4">{steps.map(([n,t,d],i)=><Reveal key={n} delay={i*.07}><div className="h-full bg-landing-panel p-6"><span className="font-display text-sm font-bold text-landing-primary">{n}</span><h3 className="mt-8 text-lg font-bold">{t}</h3><p className="mt-3 font-bangla text-sm leading-6 text-landing-muted">{d}</p></div></Reveal>)}</div></div></section>;
}

function Features() {
  const features = [
    [Bot,"Smart AI Replies","Products, FAQs ও brand voice থেকে human-like reply."],
    [Inbox,"Unified Inbox","Customer conversations এক পরিষ্কার workspace-এ."],
    [PackageCheck,"Order Collection","Name, phone, address ও product details structuredভাবে capture."],
    [Workflow,"Automation Rules","Tags, handoff ও repetitive workflow automate করুন."],
    [Users,"Customer CRM","History, notes ও order context customer profile-এ রাখুন."],
    [BarChart3,"Sales Analytics","Response, conversation ও order performance দেখুন."],
  ] as const;
  return <section id="features" className="scroll-mt-20 bg-landing-foreground py-24 text-landing-panel"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionTitle inverse eyebrow="ONE WORKSPACE" title="Built to reply, sell and grow." subtitle="একই system-এ AI support, customer context এবং order workflow।" /><div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon,title,desc],i)=><Reveal key={title} delay={i*.05}><div><span className="grid size-11 place-items-center rounded-md bg-landing-primary text-landing-primary-foreground"><Icon className="size-5"/></span><h3 className="mt-5 text-xl font-bold">{title}</h3><p className="mt-2 font-bangla leading-7 text-landing-inverse-muted">{desc}</p></div></Reveal>)}</div></div></section>;
}

function UseCases() {
  const channels = [[Facebook,"Facebook Page","Comments + Inbox"],[MessageCircle,"WhatsApp","Sales + Support"],[Instagram,"Instagram","DM + Lead capture"],[Globe2,"Website Chat","Always-on help"]] as const;
  return <section className="py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionTitle eyebrow="CONNECT EVERYWHERE" title="Customers message anywhere. Kortex answers from one place." subtitle="আপনার business-এর conversation channelগুলো এক unified view-তে রাখুন।"/><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{channels.map(([Icon,title,sub])=><div key={title} className="flex items-center gap-4 rounded-lg border border-landing-border bg-landing-panel p-5 shadow-soft"><span className="grid size-11 place-items-center rounded-md bg-landing-primary-soft text-landing-primary"><Icon className="size-5"/></span><div><p className="font-bold">{title}</p><p className="text-sm text-landing-muted">{sub}</p></div></div>)}</div></div></section>;
}

const plans = [
  { name:"Starter", monthly:999, desc:"Small pages ও solo sellers", features:["1,000 AI messages","Facebook comment + inbox reply","WhatsApp & SMS reply","Basic CRM","Email support"] },
  { name:"Pro", monthly:4999, desc:"Growing social commerce teams", popular:true, features:["25,000 AI messages","All available channels","Full CRM + sales pipeline","Workflow automation","Priority support"] },
  { name:"Enterprise", monthly:null, desc:"High-volume teams ও agencies", features:["High-volume messaging","Custom AI setup","Dedicated success support","Advanced access controls","Custom onboarding"] },
];

function Pricing() {
  const [annual,setAnnual]=useState(false);
  return <section id="pricing" className="scroll-mt-20 border-y border-landing-border bg-landing-panel py-24"><div className="mx-auto max-w-6xl px-4 sm:px-6"><SectionTitle eyebrow="PRICING" title="Simple plans. Clear value." subtitle="আপনার business grow করলে plan-ও সহজে scale করবে।"/><div className="mx-auto mt-8 flex w-fit rounded-md border border-landing-border bg-landing-soft p-1" aria-label="Billing period"><Button size="sm" variant="ghost" onClick={()=>setAnnual(false)} aria-pressed={!annual} className={cn(!annual&&"bg-landing-panel shadow-soft")}>Monthly</Button><Button size="sm" variant="ghost" onClick={()=>setAnnual(true)} aria-pressed={annual} className={cn(annual&&"bg-landing-panel shadow-soft")}>Annual <span className="text-landing-success">Save 20%</span></Button></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map((p,i)=>{const price=p.monthly===null?"Custom":`৳${Math.round(p.monthly*(annual?.8:1)).toLocaleString("en-US")}`;return <Reveal key={p.name} delay={i*.08}><div className={cn("relative flex h-full flex-col rounded-lg border bg-landing p-7",p.popular?"border-landing-primary shadow-brand":"border-landing-border")}>{p.popular&&<span className="absolute -top-3 left-6 rounded-full bg-landing-primary px-3 py-1 text-xs font-bold text-landing-primary-foreground">MOST POPULAR</span>}<p className="font-display text-xl font-bold">{p.name}</p><p className="mt-2 text-sm text-landing-muted">{p.desc}</p><div className="mt-6"><span className="font-display text-4xl font-bold">{price}</span>{p.monthly!==null&&<span className="text-landing-muted"> /month</span>}</div>{annual&&p.monthly!==null&&<p className="mt-1 text-xs font-semibold text-landing-success">Billed annually · 20% saved</p>}<Button asChild className={cn("mt-7 h-11 w-full",p.popular?"bg-landing-primary text-landing-primary-foreground":"border border-landing-border bg-landing-panel text-landing-foreground hover:bg-landing-soft")}><Link to="/auth">{p.monthly===null?"Contact us":"Start free"}<ArrowRight/></Link></Button><ul className="mt-7 space-y-3">{p.features.map(f=><li key={f} className="flex gap-2 text-sm text-landing-muted"><Check className="mt-0.5 size-4 shrink-0 text-landing-success"/>{f}</li>)}</ul></div></Reveal>})}</div></div></section>;
}

function FAQ() {
  const [open,setOpen]=useState(0);
  const items=[
    ["AI কি বাংলা ও Banglish বুঝবে?","হ্যাঁ। Kortex AI বাংলা, Banglish এবং English conversation-এর context বুঝে reply তৈরি করতে পারে।"],
    ["আমি কি AI conversation takeover করতে পারব?","অবশ্যই। Team member reply করলে AI pause হবে, তাই control সবসময় আপনার হাতে থাকবে।"],
    ["কত দ্রুত setup করা যায়?","Business information ও channel connection প্রস্তুত থাকলে কয়েক মিনিটেই basic setup শুরু করা যায়।"],
    ["Free trial আছে?","হ্যাঁ, 7-day free trial দিয়ে core workflow যাচাই করতে পারবেন—credit card লাগবে না।"],
  ];
  return <section id="faq" className="scroll-mt-20 py-24"><div className="mx-auto max-w-3xl px-4 sm:px-6"><SectionTitle eyebrow="FAQ" title="Questions, answered." subtitle="শুরু করার আগে যেগুলো জানা দরকার।"/><div className="mt-12 divide-y divide-landing-border border-y border-landing-border">{items.map(([q,a],i)=><div key={q}><Button variant="ghost" onClick={()=>setOpen(open===i?-1:i)} aria-expanded={open===i} className="h-auto w-full justify-between whitespace-normal px-0 py-5 text-left text-base text-landing-foreground hover:bg-transparent"><span className="font-bangla font-semibold">{q}</span><ChevronDown className={cn("transition-transform",open===i&&"rotate-180")}/></Button><AnimatePresence initial={false}>{open===i&&<motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden"><p className="pb-5 font-bangla leading-7 text-landing-muted">{a}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>;
}

function FinalCTA() {
  return <section className="px-4 pb-20 sm:px-6"><div className="mx-auto max-w-6xl overflow-hidden rounded-lg bg-landing-foreground px-6 py-16 text-center text-landing-panel sm:py-20"><ShieldCheck className="mx-auto size-9 text-landing-success"/><h2 className="mx-auto mt-5 max-w-3xl font-display text-3xl font-bold sm:text-5xl">Ready to turn conversations into sales?</h2><p className="mx-auto mt-4 max-w-xl font-bangla text-lg text-landing-inverse-muted">আজই Kortex AI setup করুন—customer যেন আর reply-এর জন্য অপেক্ষা না করে।</p><Button asChild size="lg" className="mt-8 h-12 bg-landing-primary px-8 text-landing-primary-foreground hover:bg-landing-primary/90"><Link to="/auth">Start free — ফ্রি শুরু করুন <ArrowRight/></Link></Button></div></section>;
}

function Footer() {
  return <footer className="border-t border-landing-border bg-landing-panel py-10"><div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><Link to="/" className="flex items-center gap-2 font-display text-lg font-bold"><span className="grid size-8 place-items-center rounded-md bg-landing-primary text-landing-primary-foreground"><Bot className="size-4"/></span>Kortex AI</Link><p className="mt-2 font-bangla text-sm text-landing-muted">বাংলা ও English-এ AI-powered sales and support.</p></div><div className="flex flex-wrap gap-5 text-sm text-landing-muted"><a href="#features">Features</a><a href="#pricing">Pricing</a><Link to="/auth">Log in</Link></div><p className="text-xs text-landing-muted">© {new Date().getFullYear()} Kortex AI</p></div></footer>;
}

function SectionTitle({ eyebrow,title,subtitle,inverse=false }: { eyebrow:string; title:string; subtitle:string; inverse?:boolean }) {
  return <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase text-landing-primary">{eyebrow}</p><h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">{title}</h2><p className={cn("mt-4 font-bangla text-lg",inverse?"text-landing-inverse-muted":"text-landing-muted")}>{subtitle}</p></div>;
}

function Reveal({children,delay=0}:{children:ReactNode;delay?:number}) {
  const reduceMotion=useReducedMotion();
  return <motion.div initial={reduceMotion?false:{opacity:0,y:18}} whileInView={{opacity:1,y:0}} viewport={{once:true,margin:"-60px"}} transition={{duration:.5,delay,ease:[.22,1,.36,1]}}>{children}</motion.div>;
}