export const site = {
  name: "Lumen",
  domain: "lumenautomations.com",
  url: "https://lumenautomations.com",
  tagline: "AI automation for local businesses.",
  description:
    "Lumen builds custom AI systems that answer calls, book appointments, follow up with leads, and run the busywork — so local businesses can grow without growing overhead.",
} as const;

export const nav = [
  { label: "Platform", href: "#platform" },
  { label: "Work", href: "#showcase" },
  { label: "Compare", href: "#compare" },
  { label: "Voices", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
] as const;

export type StoryChapter = {
  index: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
};

export const story: StoryChapter[] = [
  {
    index: "01",
    title: "Every missed call is a customer who called someone else.",
    body: "Lumen answers in one ring — day or night, holidays included. Natural voice, your tone, zero hold music. The lead never slips away.",
    metric: "24/7",
    metricLabel: "always answering",
  },
  {
    index: "02",
    title: "Booked while you sleep. Confirmed before you wake.",
    body: "Our AI checks your calendar, offers real openings, books the slot, and sends reminders. No double-booking, no back-and-forth, no front-desk burnout.",
    metric: "3.4×",
    metricLabel: "more appointments",
  },
  {
    index: "03",
    title: "The follow-up that you never have time to send.",
    body: "Every quote, every no-show, every quiet lead gets a warm, perfectly-timed nudge across SMS and email — until they become a paying customer.",
    metric: "41%",
    metricLabel: "more revenue recovered",
  },
];

export type Showcase = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  bullets: string[];
  tone: "light" | "dark";
};

export const showcases: Showcase[] = [
  {
    id: "voice",
    kicker: "Voice Agent",
    title: "A receptionist that never sleeps, never quits.",
    description:
      "Trained on your services, pricing, and hours. It greets callers, answers questions, and books them in — sounding unmistakably human.",
    bullets: ["Sub-second pickup", "Your brand voice", "Live calendar booking"],
    tone: "dark",
  },
  {
    id: "pipeline",
    kicker: "Lead Engine",
    title: "Turn quiet inboxes into a full pipeline.",
    description:
      "Lumen captures every lead from web, ads, and DMs, qualifies them instantly, and routes the hot ones straight to you.",
    bullets: ["Instant qualification", "Unified inbox", "Smart routing"],
    tone: "light",
  },
  {
    id: "ops",
    kicker: "Back-Office AI",
    title: "The paperwork runs itself now.",
    description:
      "Invoices, reviews, reminders, reporting — the repetitive work that eats your week, handled quietly in the background.",
    bullets: ["Auto invoicing", "Review requests", "Weekly insights"],
    tone: "light",
  },
];

export type FeatureRow = {
  feature: string;
  lumen: string;
  diy: string;
  agency: string;
};

export const comparison: FeatureRow[] = [
  { feature: "Setup time", lumen: "Under 14 days", diy: "Months", agency: "6–8 weeks" },
  { feature: "Answers calls 24/7", lumen: "Included", diy: "—", agency: "Add-on" },
  { feature: "Books into your calendar", lumen: "Native", diy: "Manual", agency: "Sometimes" },
  { feature: "Custom-trained on your business", lumen: "Always", diy: "—", agency: "Limited" },
  { feature: "Monthly optimisation", lumen: "Hands-on", diy: "You", agency: "Quarterly" },
  { feature: "Transparent flat pricing", lumen: "Yes", diy: "N/A", agency: "Hourly" },
];

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
};

export const testimonials: Testimonial[] = [
  {
    quote:
      "We stopped missing calls overnight. Lumen booked eleven jobs in our first week — work that used to ring out to voicemail.",
    name: "Marcus Reyes",
    role: "Owner, Reyes Plumbing & Heating",
    initials: "MR",
  },
  {
    quote:
      "It sounds like a person. Our patients have no idea they're talking to AI, and our front desk finally has room to breathe.",
    name: "Dr. Ava Lindholm",
    role: "Founder, Northside Dental",
    initials: "AL",
  },
  {
    quote:
      "The follow-up sequences alone paid for the whole system. Leads I'd written off came back and signed.",
    name: "Priya Nair",
    role: "Director, Aurora Med Spa",
    initials: "PN",
  },
  {
    quote:
      "Setup was painless and the team actually cared. Two weeks in we were running smoother than the last five years.",
    name: "Daniel Okafor",
    role: "GM, Summit Auto Detailing",
    initials: "DO",
  },
];

export type Faq = { q: string; a: string };

export const faqs: Faq[] = [
  {
    q: "How long until it's live for my business?",
    a: "Most clients are fully live within 14 days. We handle the build, the training on your services, and the integrations — you review and approve.",
  },
  {
    q: "Will callers know they're talking to AI?",
    a: "Only if you want them to. Our voice agents are natural and conversational. You choose how transparent to be, and you can always route to a human.",
  },
  {
    q: "Does it work with my current tools?",
    a: "Yes. Lumen integrates with the calendars, CRMs, and phone systems local businesses already use — and we configure it all for you during onboarding.",
  },
  {
    q: "What does it cost?",
    a: "Flat monthly pricing with no per-minute surprises. After a short discovery call we scope your systems and quote a single, transparent number.",
  },
  {
    q: "What if the AI can't answer something?",
    a: "It gracefully hands off — taking a message, booking a callback, or transferring to your team — so nothing falls through the cracks.",
  },
];

export const stats = [
  { value: "120+", label: "local businesses automated" },
  { value: "1.2M", label: "calls & messages handled" },
  { value: "31s", label: "average response time saved" },
  { value: "98%", label: "would recommend Lumen" },
] as const;
