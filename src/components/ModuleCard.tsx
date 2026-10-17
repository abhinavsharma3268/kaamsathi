"use client";

import Link from "next/link";

export function ModuleCard({
  href,
  icon,
  title,
  description,
  accent,
  large = false,
  featured = false,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent: string;
  large?: boolean;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`ks-card group flex items-center gap-3 transition hover:-translate-y-0.5 hover:border-[var(--brand)] ${
        featured
          ? "min-h-[5.5rem] border-l-4 border-l-[var(--brand)] p-4"
          : large
            ? "min-h-[5rem] p-4"
            : "min-h-[4.5rem] p-3.5"
      }`}
    >
      <div
        className={`flex shrink-0 items-center justify-center rounded-2xl ${
          featured ? "h-14 w-14 text-2xl" : "h-12 w-12 text-xl"
        }`}
        style={{ background: accent }}
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h2
          className={`font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--brand-deep)] ${
            featured ? "text-lg" : "text-base"
          }`}
        >
          {title}
        </h2>
        <p className="mt-0.5 text-sm leading-snug ks-muted">{description}</p>
      </div>
      <span
        className="shrink-0 text-lg font-bold text-[var(--brand)]"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
