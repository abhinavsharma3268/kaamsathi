"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatHome } from "@/components/chat/ChatHome";
import { useLanguage } from "@/hooks/useLanguage";

function HomeChat() {
  const params = useSearchParams();
  const resumeId = params.get("c");
  return <ChatHome resumeId={resumeId} />;
}

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <p className="text-base font-semibold text-[var(--brand-deep)]">
          {t("loading")}
        </p>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <HomeChat />
      </div>
    </Suspense>
  );
}
