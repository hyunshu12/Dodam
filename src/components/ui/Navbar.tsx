"use client";

import { usePathname } from "next/navigation";

interface NavbarProps {
  variant?: "default" | "transparent";
}

export default function Navbar({ variant = "default" }: NavbarProps) {
  const pathname = usePathname();

  const isTransparent = variant === "transparent";
  const logoColor = isTransparent ? "text-white/80" : "text-[var(--color-brand)]";
  const linkColor = isTransparent
    ? "text-white/70 hover:text-white"
    : "text-[#505050]/70 hover:text-[#505050]";

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/about", label: "about" },
  ];

  const authItems = [
    { href: "/login", label: "Log In" },
    { href: "/signup", label: "Sign up" },
  ];

  return (
    <nav className="w-full px-10 py-6 flex items-center justify-between absolute top-0 left-0 z-50">
      {/* Logo */}
      <a
        href="/"
        className={`font-heading font-extrabold text-[55px] leading-none tracking-tight ${logoColor}`}
        style={{ fontSize: "clamp(32px, 3vw, 55px)" }}
      >
        DODAM
      </a>

      {/* Nav items */}
      <div className="flex items-center gap-6">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`font-heading font-semibold text-sm ${linkColor} transition-colors`}
          >
            {item.label}
          </a>
        ))}

        {/* Auth pill group */}
        <div className="flex items-center bg-transparent rounded-[20px] overflow-hidden">
          {authItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/signup" && pathname?.startsWith("/signup"));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`font-heading font-semibold text-sm px-5 py-3 rounded-[20px] transition-all ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : linkColor
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
