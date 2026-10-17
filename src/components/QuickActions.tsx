"use client";

export type QuickAction = {
  id: string;
  label: string;
  value: string;
};

export function QuickActions({
  title,
  actions,
  onSelect,
}: {
  title: string;
  actions: QuickAction[];
  onSelect: (value: string, id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-[var(--brand-deep)]">{title}</p>
      <div className="flex flex-col gap-2">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            className="ks-btn ks-btn-secondary min-h-14 w-full justify-start rounded-2xl px-4 text-left text-base"
            onClick={() => onSelect(a.value, a.id)}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
