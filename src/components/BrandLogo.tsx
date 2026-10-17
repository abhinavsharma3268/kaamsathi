import Image from "next/image";

const SRC = "/saath-logo.jpg";

export function BrandLogo({
  size = "md",
  priority = false,
  className = "",
}: {
  size?: "sm" | "md" | "lg" | "hero";
  priority?: boolean;
  className?: string;
}) {
  const dims =
    size === "sm"
      ? { w: 40, h: 40 }
      : size === "md"
        ? { w: 56, h: 56 }
        : size === "lg"
          ? { w: 96, h: 96 }
          : { w: 160, h: 160 };

  return (
    <Image
      src={SRC}
      alt="Saath — Work, Rights & Support"
      width={dims.w}
      height={dims.h}
      priority={priority}
      className={`rounded-2xl object-cover shadow-sm ring-1 ring-[var(--line)] ${className}`}
    />
  );
}
