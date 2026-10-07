import {
  DashboardIcon,
  HandshakeIcon,
  ImageIcon,
  LockIcon,
  OrdersIcon,
  PercentIcon,
  SettingsIcon,
  StarIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/icons";

export const ADMIN_NAV = [
  { key: "overview", href: "/admin", icon: DashboardIcon, label: { ar: "نظرة عامة", en: "Overview" } },
  { key: "users", href: "/admin/users", icon: UsersIcon, label: { ar: "المستخدمون", en: "Users" } },
  { key: "partners", href: "/admin/partners", icon: HandshakeIcon, label: { ar: "الشركاء", en: "Partners" } },
  { key: "orders", href: "/admin/orders", icon: OrdersIcon, label: { ar: "الطلبات", en: "Orders" } },
  { key: "pricing", href: "/admin/pricing", icon: PercentIcon, label: { ar: "الأسعار والعروض", en: "Pricing & Promo" } },
  { key: "reviews", href: "/admin/reviews", icon: StarIcon, label: { ar: "التقييمات", en: "Reviews" } },
  {
    key: "video-templates",
    href: "/admin/video-templates",
    icon: VideoIcon,
    label: { ar: "قوالب بالذكاء الاصطناعي", en: "AI Templates" },
  },
  {
    key: "thank-you-suggestions",
    href: "/admin/thank-you-suggestions",
    icon: ImageIcon,
    label: { ar: "اقتراحات الشكر", en: "Thank-You Suggestions" },
  },
  {
    key: "private-invites",
    href: "/admin/private-invites",
    icon: LockIcon,
    label: { ar: "دعوات خاصة", en: "Private Invites" },
  },
  { key: "settings", href: "/admin/settings", icon: SettingsIcon, label: { ar: "الإعدادات", en: "Settings" } },
] as const;
