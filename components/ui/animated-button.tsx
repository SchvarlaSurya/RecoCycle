"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface AnimatedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "icon" | "link";
  size?: "sm" | "md" | "lg";
  ripple?: boolean;
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant = "primary", size = "md", ripple = true, children, onClick, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const circle = document.createElement("span");
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        circle.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          left: ${x}px;
          top: ${y}px;
          border-radius: 50%;
          background: rgba(255,255,255,0.4);
          transform: scale(0);
          animation: ripple 0.5s ease-out;
          pointer-events: none;
        `;

        button.appendChild(circle);
        setTimeout(() => circle.remove(), 500);
      }
      onClick?.(e);
    };

    const variants = {
      primary: cn(
        "bg-green-600 text-white rounded-xl",
        "hover:bg-green-700 hover:scale-[1.02] hover:shadow-lg hover:shadow-green-200",
        "active:scale-[0.97] active:shadow-sm",
        "focus:ring-2 focus:ring-green-400 focus:ring-offset-2",
        "transition-all duration-200 ease-out relative overflow-hidden"
      ),
      secondary: cn(
        "border-2 border-green-600 text-green-700 rounded-xl bg-transparent",
        "hover:bg-green-50 hover:scale-[1.01] hover:shadow-sm",
        "active:scale-[0.98]",
        "focus:ring-2 focus:ring-green-400 focus:ring-offset-2",
        "transition-all duration-200 ease-out"
      ),
      icon: cn(
        "rounded-full p-2 text-slate-600",
        "hover:bg-gray-100 hover:scale-110",
        "active:scale-95",
        "transition-all duration-150"
      ),
      link: cn(
        "text-slate-600 relative",
        "hover:text-green-700",
        "after:absolute after:bottom-0 after:left-0 after:h-px after:w-0",
        "after:bg-green-600 after:transition-all after:duration-300 hover:after:w-full"
      ),
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm font-medium",
      md: "px-5 py-2.5 text-sm font-semibold",
      lg: "px-8 py-3.5 text-base font-semibold",
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        className={cn(
          variants[variant],
          variant !== "icon" ? sizes[size] : "",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";