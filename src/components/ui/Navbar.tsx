"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

interface UserInfo {
  id: string;
  email: string;
  role: "VICTIM" | "GUARDIAN";
  displayName: string | null;
}

const TRANSPARENT_ROUTES = ["/", "/about"];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checked, setChecked] = useState(false);

  const isTransparent = TRANSPARENT_ROUTES.includes(pathname);
  const logoColor = isTransparent
    ? "text-white/80"
    : "text-[var(--color-brand)]";
  const linkColor = isTransparent
    ? "text-white/70 hover:text-white"
    : "text-[#505050]/70 hover:text-[#505050]";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (data.ok && data.data) {
          setUser(data.data);
        }
      } catch {
        // Not logged in
      }
      setChecked(true);
    })();
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setUser(null);
    router.push("/");
  }

  // Nav items (always shown)
  const baseItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "about" },
  ];

  // Role-specific nav items
  const roleItems: { href: string; label: string }[] = [];
  if (user) {
    if (user.role === "VICTIM") {
      roleItems.push({ href: "/search", label: "검색" });
      roleItems.push({ href: "/settings", label: "설정" });
    } else if (user.role === "GUARDIAN") {
      roleItems.push({ href: "/guardian", label: "대시보드" });
      roleItems.push({ href: "/settings", label: "설정" });
    }
  }

  const navItems = [...baseItems, ...roleItems];

  return (
    <nav className="w-full px-10 py-6 flex items-center justify-between fixed top-0 left-0 z-50">
      {/* Logo */}
      <Link
        href="/"
        className={`font-heading font-extrabold text-[55px] leading-none tracking-tight ${logoColor}`}
        style={{ fontSize: "clamp(32px, 3vw, 55px)" }}
      >
        DODAM
      </Link>

      {/* Nav items */}
      <div className="flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`font-heading font-semibold text-sm ${
              pathname === item.href
                ? isTransparent
                  ? "text-white"
                  : "text-[var(--color-primary)]"
                : linkColor
            } transition-colors`}
          >
            {item.label}
          </Link>
        ))}

        {/* Auth section — always rendered, fades in when ready */}
        <div
          className={`flex items-center gap-2 transition-opacity duration-300 ${
            checked ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {user ? (
            <>
              {/* User info pill */}
              <span
                className={`font-heading font-semibold text-sm px-4 py-2 rounded-[20px] ${
                  isTransparent
                    ? "text-white/80 bg-white/10"
                    : "text-[#505050] bg-gray-100"
                }`}
              >
                {user.displayName || user.email}
                <span className="ml-1.5 text-xs opacity-60">
                  ({user.role === "VICTIM" ? "피해자" : "보호자"})
                </span>
              </span>
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={`font-heading font-semibold text-sm px-5 py-2 rounded-[20px] transition-all ${
                  isTransparent
                    ? "text-white/70 hover:text-white hover:bg-white/10"
                    : "text-[#505050]/70 hover:text-[#505050] hover:bg-gray-100"
                }`}
              >
                로그아웃
              </button>
            </>
          ) : (
            <div className="flex items-center bg-transparent rounded-[20px] overflow-hidden">
              {[
                { href: "/login", label: "Log In" },
                { href: "/signup", label: "Sign up" },
              ].map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href === "/signup" &&
                    pathname?.startsWith("/signup"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`font-heading font-semibold text-sm px-5 py-3 rounded-[20px] transition-all ${
                      isActive
                        ? "bg-[var(--color-primary)] text-white"
                        : linkColor
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
