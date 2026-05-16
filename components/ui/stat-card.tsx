"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useRef, ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: number;
  suffix?: string;
  prefix?: string;
  subtitle?: string;
  icon: ReactNode;
  sparkline?: number[];
  delay?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StatCard({
  title,
  value,
  suffix = "",
  prefix = "",
  subtitle,
  icon,
  sparkline,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [progressWidth, setProgressWidth] = useState(0);
  const [iconHovered, setIconHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        setDisplayValue(Math.round(easedProgress * value));
        setProgressWidth(easedProgress * 100);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timeout);
  }, [isVisible, value, delay]);

  const sparklinePoints = sparkline
    ? sparkline.map((v, i) => `${(i / (sparkline.length - 1)) * 64},${32 - (v / Math.max(...sparkline)) * 28}`).join(" ")
    : "";

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-md hover:shadow-green-100/50 hover:border-green-200 hover:-translate-y-0.5",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex-1">
        <p className="text-sm text-stone-600">{title}</p>
        <p className="mt-1 text-2xl font-bold text-stone-900">
          {prefix}
          {displayValue.toLocaleString("id-ID")}
          {suffix}
        </p>
        {subtitle && (
          <p className="mt-1 text-xs text-emerald-600">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {sparkline && (
          <svg className="w-16 h-8" viewBox="0 0 64 32">
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparklinePoints}
              style={{
                strokeDasharray: 200,
                strokeDashoffset: isVisible ? 0 : 200,
                transition: `stroke-dashoffset 1s ease-out ${delay + 500}ms`,
              }}
            />
          </svg>
        )}

        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600",
            "transition-all duration-300",
            iconHovered && "bg-green-100 scale-110 rotate-6"
          )}
          onMouseEnter={() => setIconHovered(true)}
          onMouseLeave={() => setIconHovered(false)}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}