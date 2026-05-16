"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItemProps extends LinkProps {
  icon: ReactNode;
  children: ReactNode;
  delay?: number;
}

export function NavItem({ href, icon, children, delay = 0 }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href as string));

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-medium",
        "transition-all duration-200 ease-out",
        isActive
          ? "border-l-4 border-green-600 bg-green-100 text-green-700"
          : "text-stone-700 hover:bg-stone-50",
        "opacity-0 translate-x-[-10px]"
      )}
      style={{
        animation: `fade-in-left 0.4s ease-out forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      {/* Hover background slide */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-0 bg-green-50 transition-all duration-300",
          "group-hover:w-full"
        )}
      />

      {/* Icon */}
      <span
        className={cn(
          "relative z-10 transition-all duration-200",
          "group-hover:scale-110 group-hover:text-green-600",
          isActive && "text-green-600"
        )}
      >
        {icon}
      </span>

      {/* Text */}
      <span
        className={cn(
          "relative z-10 transition-all duration-200",
          "group-hover:translate-x-1"
        )}
      >
        {children}
      </span>

      {/* Active indicator */}
      {isActive && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />
      )}
    </Link>
  );
}

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-5 py-5 group",
        className
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white",
          "transition-all duration-500",
          "group-hover:rotate-180 group-hover:scale-110"
        )}
      >
        <svg className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <span className="text-lg font-bold text-stone-900">RecoCycle</span>
    </div>
  );
}