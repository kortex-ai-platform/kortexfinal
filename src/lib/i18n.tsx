import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "bn";

const dict = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.openDashboard": "Open Dashboard",
    "nav.connectFb": "Connect Facebook Page",
    "hero.title": "Automate Your Facebook Messenger with AI",
    "hero.subtitle":
      "AI replies to customers, takes orders, and manages conversations — all from one admin dashboard.",
    "features.title": "Everything you need to run sales on Messenger",
    "features.autoReply": "AI Auto Reply",
    "features.autoReplyDesc": "Instant, on-brand replies in Bangla or English, 24/7.",
    "features.orders": "Facebook Order Collection",
    "features.ordersDesc": "Collect customer info, products, and addresses automatically.",
    "features.control": "Admin Dashboard Control",
    "features.controlDesc": "Edit prompts, review chats, and manage every order in one place.",
    "features.images": "AI Image Generation",
    "features.imagesDesc": "Generate product ads and post creatives in seconds.",
    "preview.title": "See it in action",
    "preview.subtitle": "A real Bangla conversation, handled by your AI assistant.",
    "cta.title": "Ready to put your Page on autopilot?",
    "cta.subtitle": "Sign in to set up your AI assistant in minutes.",
    "footer.rights": "All rights reserved.",
    "footer.admin": "Admin Access",
    "sidebar.overview": "Overview",
    "sidebar.clients": "Clients",
    "sidebar.orders": "Orders",
    "sidebar.products": "Products",
    "sidebar.chats": "Messenger Chats",
    "sidebar.ai": "AI Settings",
    "sidebar.providers": "AI Providers",
    "sidebar.logs": "Request Logs",
    "sidebar.facebook": "Facebook Integration",
    "sidebar.fbPostGen": "FB Post Generator",
    "sidebar.brandMemory": "Brand Memory",
    "sidebar.prompts": "Prompt Manager",
    "sidebar.images": "Image Generator",
    "sidebar.automation": "Automation Rules",
    "sidebar.analytics": "Analytics",
    "sidebar.settings": "Settings",
    "comingSoon": "Coming soon",
    "comingSoonDesc":
      "This module is part of the next release. The connection points are wired and we'll ship it shortly.",
    "auth.signIn": "Sign in",
    "auth.signUp": "Create admin account",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.firstTime": "First time? Create your single admin account below.",
    "auth.locked": "Admin signup is locked. Use your existing credentials.",
    "auth.signOut": "Sign out",
    "lang.en": "EN",
    "lang.bn": "BN",
    "checkout.title": "Complete your order",
    "checkout.name": "Full Name",
    "checkout.phone": "Phone Number",
    "checkout.address": "Full Address",
    "checkout.district": "District",
    "checkout.area": "Area / Thana",
    "checkout.quantity": "Quantity",
    "checkout.note": "Order Note (optional)",
    "checkout.submit": "Place Order",
    "checkout.submitting": "Placing order…",
    "checkout.successTitle": "Thank you — order received",
    "checkout.successBody": "Our team will contact you within 24 hours to confirm. Once confirmed, your product is typically delivered within 2–3 business days.",
    "checkout.orderId": "Your Order ID",
    "checkout.continue": "Continue shopping",
    "shop.title": "Shop",
    "shop.empty": "No products available right now.",
    "shop.inStock": "In stock",
    "shop.outOfStock": "Out of stock",
    "shop.orderNow": "Order Now",
    "shop.viewProduct": "View product",
    "shop.features": "Features",
    "shop.price": "Price",
  },
  bn: {
    "nav.dashboard": "ড্যাশবোর্ড",
    "nav.openDashboard": "ড্যাশবোর্ড খুলুন",
    "nav.connectFb": "ফেসবুক পেজ যুক্ত করুন",
    "hero.title": "AI দিয়ে আপনার ফেসবুক মেসেঞ্জার অটোমেট করুন",
    "hero.subtitle":
      "AI স্বয়ংক্রিয়ভাবে কাস্টমারকে রিপ্লাই দেয়, অর্ডার নেয়, এবং একটাই ড্যাশবোর্ড থেকে সব কথোপকথন সামলায়।",
    "features.title": "মেসেঞ্জারে সেলস চালাতে যা যা লাগে",
    "features.autoReply": "AI অটো রিপ্লাই",
    "features.autoReplyDesc": "বাংলা বা ইংরেজিতে তাৎক্ষণিক, ব্র্যান্ড অনুযায়ী রিপ্লাই — ২৪/৭।",
    "features.orders": "ফেসবুক অর্ডার কালেকশন",
    "features.ordersDesc": "কাস্টমার তথ্য, প্রোডাক্ট আর ঠিকানা স্বয়ংক্রিয়ভাবে সংগ্রহ।",
    "features.control": "অ্যাডমিন কন্ট্রোল",
    "features.controlDesc": "একটাই জায়গা থেকে প্রম্পট, চ্যাট আর অর্ডার ম্যানেজ করুন।",
    "features.images": "AI ইমেজ জেনারেশন",
    "features.imagesDesc": "কয়েক সেকেন্ডে প্রোডাক্ট অ্যাড আর পোস্ট ক্রিয়েটিভ তৈরি করুন।",
    "preview.title": "কীভাবে কাজ করে দেখুন",
    "preview.subtitle": "আপনার AI অ্যাসিস্ট্যান্টের একটি সত্যিকারের বাংলা কথোপকথন।",
    "cta.title": "আপনার পেজকে অটোপাইলটে দেবেন?",
    "cta.subtitle": "সাইন ইন করুন এবং কয়েক মিনিটেই AI চালু করুন।",
    "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
    "footer.admin": "অ্যাডমিন এক্সেস",
    "sidebar.overview": "ওভারভিউ",
    "sidebar.clients": "ক্লায়েন্ট",
    "sidebar.orders": "অর্ডার",
    "sidebar.products": "প্রোডাক্ট",
    "sidebar.chats": "মেসেঞ্জার চ্যাট",
    "sidebar.ai": "AI সেটিংস",
    "sidebar.providers": "AI প্রোভাইডার",
    "sidebar.logs": "রিকোয়েস্ট লগ",
    "sidebar.facebook": "ফেসবুক ইন্টিগ্রেশন",
    "sidebar.fbPostGen": "এফবি পোস্ট জেনারেটর",
    "sidebar.brandMemory": "ব্র্যান্ড মেমোরি",
    "sidebar.prompts": "প্রম্পট ম্যানেজার",
    "sidebar.images": "ইমেজ জেনারেটর",
    "sidebar.automation": "অটোমেশন রুলস",
    "sidebar.analytics": "অ্যানালিটিক্স",
    "sidebar.settings": "সেটিংস",
    "comingSoon": "শীঘ্রই আসছে",
    "comingSoonDesc":
      "এই মডিউলটি পরবর্তী রিলিজে যুক্ত হবে। কানেকশন পয়েন্টগুলো প্রস্তুত — খুব শিগগিরই চালু হবে।",
    "auth.signIn": "সাইন ইন",
    "auth.signUp": "অ্যাডমিন অ্যাকাউন্ট তৈরি",
    "auth.email": "ইমেইল",
    "auth.password": "পাসওয়ার্ড",
    "auth.firstTime": "প্রথমবার? নিচে আপনার একমাত্র অ্যাডমিন অ্যাকাউন্ট তৈরি করুন।",
    "auth.locked": "অ্যাডমিন সাইনআপ বন্ধ। বিদ্যমান ক্রেডেনশিয়াল ব্যবহার করুন।",
    "auth.signOut": "সাইন আউট",
    "lang.en": "EN",
    "lang.bn": "BN",
    "checkout.title": "অর্ডার সম্পন্ন করুন",
    "checkout.name": "নাম",
    "checkout.phone": "মোবাইল নম্বর",
    "checkout.address": "সম্পূর্ণ ঠিকানা",
    "checkout.district": "জেলা",
    "checkout.area": "এলাকা / থানা",
    "checkout.quantity": "পরিমাণ",
    "checkout.note": "অর্ডার নোট (ঐচ্ছিক)",
    "checkout.submit": "অর্ডার করুন",
    "checkout.submitting": "অর্ডার পাঠানো হচ্ছে…",
    "checkout.successTitle": "ধন্যবাদ — অর্ডার গ্রহণ করা হয়েছে",
    "checkout.successBody": "আমাদের টিম ২৪ ঘণ্টার মধ্যে আপনার সাথে যোগাযোগ করে অর্ডার নিশ্চিত করবে। নিশ্চিত হওয়ার পর সাধারণত ২-৩ কর্মদিবসের মধ্যে পণ্য ডেলিভারি করা হবে।",
    "checkout.orderId": "আপনার অর্ডার আইডি",
    "checkout.continue": "আরও পণ্য দেখুন",
    "shop.title": "শপ",
    "shop.empty": "এই মুহূর্তে কোনো পণ্য নেই।",
    "shop.inStock": "স্টকে আছে",
    "shop.outOfStock": "স্টক নেই",
    "shop.orderNow": "অর্ডার করুন",
    "shop.viewProduct": "পণ্য দেখুন",
    "shop.features": "ফিচার",
    "shop.price": "মূল্য",
  },
} as const;

export type TKey = keyof (typeof dict)["en"];

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey) => string };

const LangContext = createContext<Ctx>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      (localStorage.getItem("lang") as Lang | null)) || null;
    if (saved === "en" || saved === "bn") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (k: TKey) => dict[lang][k] ?? k;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useT = () => useContext(LangContext);