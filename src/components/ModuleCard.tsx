"use client";

import Link from "next/link";

export function ModuleCard({
  href,
  icon,
  title,
  description,
  accent,
  large = false,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent: string;
  large?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`ks-card group flex items-start gap-4 p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)] ${
        large ? "min-h-[6.5rem] p-5" : "min-h-[5.5rem]"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl ${
          large ? "h-16 w-16 text-3xl" : "h-14 w-14 text-2xl"
        }`}
        style={{ background: accent }}
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <h2
          className={`font-bold text-[var(--ink)] group-hover:text-[var(--brand-deep)] ${
            large ? "text-xl" : "text-lg"
          }`}
        >
          {title}
        </h2>
        <p className={`mt-1 leading-snug ks-muted ${large ? "text-base" : "text-sm"}`}>
          {description}
        </p>
      </div>
    </Link>
  );
}
