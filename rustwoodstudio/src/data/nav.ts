// THE MENU — single source of truth.
// Edit this array and the header + footer nav update on every page.
// Client Login is rendered separately as a button (see Header/Footer).
export interface NavItem {
  label: string;
  href: string;
}

export const nav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Singing Fundamentals", href: "/singing-fundamentals/" },
  { label: "VOX Tools", href: "/vox/" },
  { label: "Custom Songs", href: "/custom-songs/" },
  { label: "Coaching", href: "/coaching/" },
  { label: "Journal", href: "/journal/" },
];
