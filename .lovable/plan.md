# Kortex AI public website redesign

## লক্ষ্য
বর্তমান public page-টিকে নির্বাচিত **Bright Violet + Product First** direction-এ পুনর্গঠন করা হবে। ReplyAgent AI ও LazyChat থেকে hierarchy, product demonstration এবং pricing clarity নেওয়া হবে—কিন্তু Kortex AI-এর নিজস্ব brand, copy এবং capabilities বজায় থাকবে।

## কী তৈরি হবে

### ১. Brand ও typography
- Light violet canvas: `#F8F7FF`, primary violet `#6C4CFF`, ink `#11142D`, success green `#22C55E`।
- English heading: **Outfit**; English body: **Figtree**; Bangla: **Hind Siliguri**।
- Kortex AI logo treatment, navigation এবং CTA-গুলোকে একই visual system-এ আনা হবে।
- Existing dark-mode preference থাকলেও landing page-টি নির্বাচিত bright direction-এই স্থির থাকবে; app/dashboard theme বদলাবে না।

### ২. Product-first landing page
- Centered bilingual headline: Facebook, WhatsApp ও Messenger sales/support automation-এর সরাসরি value proposition।
- Primary CTA account setup-এ যাবে; secondary CTA visible product demo-তে scroll করবে।
- Hero-এর নিচে বড় realistic Kortex inbox/dashboard mockup থাকবে—Bangla/English customer message, AI reply, order capture এবং live status দেখাবে।
- তারপর full-width flow: সমস্যা → কীভাবে কাজ করে → core capabilities → supported channels/use cases → pricing → FAQ → final CTA।
- Unsupported brand/customer claims, fabricated testimonials বা fake trust logos যোগ করা হবে না।

### ৩. Bilingual content
- English এবং বাংলা পাশাপাশি naturalভাবে mix হবে; একই কথা অপ্রয়োজনীয়ভাবে দুইবার বড় করে দেখানো হবে না।
- Copy-তে local commerce language থাকবে: inbox, product price, delivery, COD, order confirmation, human takeover।
- Mobile-এ Bangla text wrapping এবং button labels বিশেষভাবে ঠিক রাখা হবে।

### ৪. Pricing
বর্তমান Kortex price points রাখা হবে, presentation পরিষ্কার করা হবে:
- **Starter — ৳999/month:** Facebook comment/inbox reply, WhatsApp/SMS reply, 1,000 AI messages, basic CRM।
- **Pro — ৳4,999/month:** 25,000 AI messages, all available channels, CRM/pipeline, automation, priority support।
- **Enterprise — Custom:** high-volume usage, custom AI setup এবং dedicated support।
- Monthly/Annual selector থাকবে; annual view-তে 20% saving স্পষ্টভাবে দেখানো হবে। Pro plan visually highlighted থাকবে এবং সব CTA signup/contact intent অনুযায়ী কাজ করবে।

### ৫. Motion ও interaction
- Excessive glowing blobs ও continuous decorative movement বাদ দেওয়া হবে।
- Hero, dashboard এবং sections-এ restrained reveal; mock conversation-এ একবারের gentle message entrance; buttons-এ subtle feedback।
- FAQ accordion, mobile menu এবং pricing selector keyboard-friendly থাকবে।
- `prefers-reduced-motion` সম্মান করা হবে।

## Technical details
- মূল কাজ public landing route এবং global semantic design tokens/typography-তে সীমাবদ্ধ থাকবে; authenticated panels ও business logic অপরিবর্তিত থাকবে।
- Existing UI Button ব্যবহার করে links/actions তৈরি হবে; hardcoded component colors semantic landing tokens-এ নেওয়া হবে।
- Page metadata-তে unique title, description, Open Graph এবং Twitter fields সম্পূর্ণ করা হবে।
- Desktop ও mobile preview-তে visual regression, overflow, navigation anchors, pricing toggle, FAQ এবং CTA paths পরীক্ষা করা হবে।
