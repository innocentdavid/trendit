"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Plus, Compass, User } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/reels", icon: Film, label: "Reels" },
  { href: "/create", icon: Plus, label: "Create", special: true },
  { href: "/discover", icon: Compass, label: "Discover" },
  { href: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm bg-white border-t border-gray-100 flex items-center justify-around h-16 px-2 z-50">
      {navItems.map(({ href, icon: Icon, label, special }) => {
        const isActive = pathname === href;

        if (special) {
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-0.5">
              <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center -mt-5 shadow-lg">
                <Icon className="text-white size-6" strokeWidth={2.5} />
              </div>
              <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
            </Link>
          );
        }

        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-0.5 min-w-[48px]">
            <Icon
              className={`size-5 ${isActive ? "text-purple-600" : "text-gray-400"}`}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className={`text-[10px] ${isActive ? "text-purple-600 font-semibold" : "text-gray-400"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
