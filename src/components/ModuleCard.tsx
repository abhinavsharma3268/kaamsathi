"use client";

import Link from "next/link";

export function ModuleCard({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="ks-card group flex min-h-[7.5rem] items-start gap-4 p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand)]"
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
        style={{ background: accent }}
        aria-hidden
      >
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-[var(--ink)] group-hover:text-[var(--brand-deep)]">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-snug ks-muted">{description}</p>
      </div>
    </Link>
  );
}
