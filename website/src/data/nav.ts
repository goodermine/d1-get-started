// THE MENU — single source of truth.
// Edit this array and the header + footer nav update on every page.
//
// NOTE: Portfolio, Wiki, and Prompts are intentionally omitted for launch
// because their pages don't exist yet (they 404 on the WordPress site).
// Add them back here once we build/decide them — no other file needs editing.
export interface NavItem {
  label: string;
  href: string;
}

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Books", href: "/books/" },
  { label: "Articles", href: "/articles/" },
  { label: "Real Estate Buddy", href: "/real-estate-buddy/" },
  { label: "Extreme Build", href: "/extreme-build/" },
  { label: "Resume", href: "/resume/" },
  { label: "Contact", href: "/contact/" },
];
