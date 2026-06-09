// THE BOOK CATALOGUE — single source of truth.
// Add a book = add an entry here; it appears on /books automatically.
// TODO(aaron): confirm the two "Other works" titles and add real buy links.
export interface Book {
  title: string;
  series?: string;
  blurb: string;
  status: "available" | "preorder" | "coming";
  releaseDate?: string; // human-readable
  buyUrl?: string; // Amazon / external vendor
  detailUrl?: string; // internal sales page, if any
  cover?: string; // path under /public/img
}

export const magneticSeries: Book[] = [
  {
    title: "Magnetic Personal Power",
    series: "The Magnetic Series",
    blurb:
      "Calm, grounded confidence that comes from within — and needs no one's permission. Includes companion audio.",
    status: "available",
    detailUrl: "/magnetic/",
    cover: "/img/books/magnetic-personal-power.jpg",
  },
  {
    title: "Warmth First",
    series: "The Magnetic Series",
    blurb: "Leading with warmth as the foundation of real connection.",
    status: "coming",
    releaseDate: "12 June 2026",
    cover: "/img/books/warmth-first.jpg",
  },
  {
    title: "Stuck Is a Trance",
    series: "The Magnetic Series",
    blurb: "How being stuck is a state you can step out of — and how to do it.",
    status: "preorder",
    releaseDate: "1 July 2026",
    cover: "/img/books/stuck-is-a-trance.jpg",
  },
  {
    title: "Bulletproof Conversation",
    series: "The Magnetic Series",
    blurb: "Staying grounded and clear in the conversations that matter most.",
    status: "preorder",
    releaseDate: "30 July 2026",
    cover: "/img/books/bulletproof-conversation.jpg",
  },
  {
    title: "The Body Says No First",
    series: "The Magnetic Series",
    blurb: "Reading the body's signals before the mind catches up.",
    status: "preorder",
    releaseDate: "1 August 2026",
    cover: "/img/books/the-body-says-no-first.jpg",
  },
  {
    title: "Magnetic Influence",
    series: "The Magnetic Series",
    blurb: "Influence built on trust and presence rather than pressure.",
    status: "preorder",
    releaseDate: "20 August 2026",
    cover: "/img/books/magnetic-influence.jpg",
  },
];

export const otherWorks: Book[] = [
  {
    title: "Mental Resilience Guide",
    blurb: "A practical guide to building mental resilience. (Title/links to confirm.)",
    status: "available",
  },
  {
    title: "Stop Smoking with Hypnotherapy",
    blurb: "Breaking the smoking habit through hypnotherapy. (Title/links to confirm.)",
    status: "available",
  },
];

export const statusLabel: Record<Book["status"], string> = {
  available: "Available now",
  preorder: "Pre-order",
  coming: "Coming soon",
};
