export type NavItem = {
  href: string;
  label: string;
  /** Shown in the mobile bottom bar. */
  primary?: boolean;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "ภาพรวม", primary: true },
  { href: "/portfolio", label: "พอร์ต", primary: true },
  { href: "/transactions", label: "ซื้อขาย", primary: true },
  { href: "/dividends", label: "ปันผล", primary: true },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/analysis", label: "วิเคราะห์" },
  { href: "/reports", label: "รายงาน" },
  { href: "/settings", label: "ตั้งค่า" },
];

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
