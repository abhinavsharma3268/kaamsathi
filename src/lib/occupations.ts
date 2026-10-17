/**
 * Occupation personalization for Saath.
 * Profiles guide UI order and AI context — they never invent rights or eligibility.
 */

export const OCCUPATION_IDS = [
  "delivery",
  "driver",
  "construction",
  "domestic",
  "vendor",
  "agri_informal",
  "other",
] as const;

export type OccupationId = (typeof OCCUPATION_IDS)[number];

export type HomeTaskId =
  | "earnings"
  | "safety"
  | "rights"
  | "pay_docs"
  | "grievance";

export type OccupQuickPrompt = {
  id: string;
  module: "safety" | "rights" | "documents" | "grievance" | "earnings";
  href: string;
  /** i18n key for button label */
  labelKey: string;
  /** English prompt/value used to populate the real workflow */
  value: string;
};

export type ExpenseLabelKeys = {
  gross: string;
  incentives: string;
  hours: string;
  fuel: string;
  maintenance: string;
  otherExpenses: string;
  employer: string;
  workType: string;
};

export type OccupationConfig = {
  id: OccupationId;
  /** i18n key for display name */
  nameKey: string;
  /** Short AI/context description in English (server uses this + lang) */
  aiLabel: string;
  homeTaskOrder: HomeTaskId[];
  expenseLabels: ExpenseLabelKeys;
  showEmployer: boolean;
  showWorkType: boolean;
  workTypeSuggestions: string[];
  quickPrompts: OccupQuickPrompt[];
  /** Prefer these WELFARE_SOURCES ids first on Rights */
  preferredSourceIds: string[];
  earningsHintKey: string;
};

const defaultExpenseLabels: ExpenseLabelKeys = {
  gross: "earningsGross",
  incentives: "earningsIncentives",
  hours: "earningsHours",
  fuel: "earningsFuel",
  maintenance: "earningsMaintenance",
  otherExpenses: "earningsOther",
  employer: "earningsEmployer",
  workType: "earningsWorkType",
};

export const OCCUPATIONS: Record<OccupationId, OccupationConfig> = {
  delivery: {
    id: "delivery",
    nameKey: "occDelivery",
    aiLabel:
      "Food/grocery delivery partner (platform gig). Common issues: incentives, platform deductions, fuel, late payouts, account deactivation.",
    homeTaskOrder: ["earnings", "pay_docs", "grievance", "safety", "rights"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnDeliveryGross",
      incentives: "earnDeliveryBonus",
      fuel: "earnDeliveryFuel",
      maintenance: "earnDeliveryBike",
      otherExpenses: "earnDeliveryOther",
      employer: "earnDeliveryPlatform",
      workType: "earnDeliveryWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Lunch peak", "Dinner peak", "Full day", "Part day"],
    quickPrompts: [
      {
        id: "del-deduction",
        module: "documents",
        href: "/documents",
        labelKey: "occQaDeliveryDeduction",
        value:
          "PAYOUT NOTE\nGross: ₹4,200\nPlatform fee / unexpected cut: −₹650\nNet: ₹3,550\nExplain these deductions in simple words.",
      },
      {
        id: "del-unpaid",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaDeliveryUnpaid",
        value:
          "My delivery payout for completed orders has not been paid. I want a clear complaint asking for payment with a breakdown.",
      },
      {
        id: "del-deact",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaDeliveryDeact",
        value:
          "My delivery partner account was blocked or deactivated. I need an explanation and a fair way to appeal.",
      },
      {
        id: "del-sleepy",
        module: "safety",
        href: "/safety",
        labelKey: "occQaDeliverySleepy",
        value:
          "I deliver food on a bike and feel sleepy after many hours. What should I do to stay safe right now?",
      },
    ],
    preferredSourceIds: ["eShram", "labour-code", "consumer", "pmjay"],
    earningsHintKey: "earnHintDelivery",
  },
  driver: {
    id: "driver",
    nameKey: "occDriver",
    aiLabel:
      "Taxi/auto/cab/commercial driver. Common issues: fuel, vehicle rent, maintenance, permits, road safety, platform cuts.",
    homeTaskOrder: ["earnings", "safety", "pay_docs", "grievance", "rights"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnDriverGross",
      incentives: "earnDriverBonus",
      fuel: "earnDriverFuel",
      maintenance: "earnDriverMaint",
      otherExpenses: "earnDriverOther",
      employer: "earnDriverPlatform",
      workType: "earnDriverWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Day shift", "Night shift", "Airport runs", "Local city"],
    quickPrompts: [
      {
        id: "drv-fuel",
        module: "earnings",
        href: "/earnings",
        labelKey: "occQaDriverFuel",
        value: "",
      },
      {
        id: "drv-safety",
        module: "safety",
        href: "/safety",
        labelKey: "occQaDriverSafety",
        value:
          "I drive a cab/auto for long hours and feel tired. What road-safety steps should I take?",
      },
      {
        id: "drv-pay",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaDriverPay",
        value:
          "My driving payout or incentives are missing or cut without a clear reason. I want a respectful complaint.",
      },
      {
        id: "drv-rights",
        module: "rights",
        href: "/rights",
        labelKey: "occQaDriverRights",
        value:
          "What permits or worker schemes might matter for taxi/auto drivers in India? Do not say I am eligible — explain how to check official sites.",
      },
    ],
    preferredSourceIds: ["eShram", "labour-code", "esic", "pmjay"],
    earningsHintKey: "earnHintDriver",
  },
  construction: {
    id: "construction",
    nameKey: "occConstruction",
    aiLabel:
      "Construction / mason / electrician / plumber / painter / helper. Common issues: daily wages, attendance, unpaid work, site safety, welfare schemes.",
    homeTaskOrder: ["earnings", "safety", "rights", "grievance", "pay_docs"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnConstGross",
      incentives: "earnConstExtra",
      fuel: "earnConstTravel",
      maintenance: "earnConstTools",
      otherExpenses: "earnConstOther",
      employer: "earnConstEmployer",
      workType: "earnConstWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Mason", "Helper", "Electrician", "Painter", "Plumber"],
    quickPrompts: [
      {
        id: "con-unpaid",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaConstUnpaid",
        value:
          "I did construction/site work and my daily wages were not paid. I want a clear complaint with dates and amount.",
      },
      {
        id: "con-safety",
        module: "safety",
        href: "/safety",
        labelKey: "occQaConstSafety",
        value:
          "I work on a construction site. What basic safety steps should I follow, and when should I stop work?",
      },
      {
        id: "con-rights",
        module: "rights",
        href: "/rights",
        labelKey: "occQaConstRights",
        value:
          "What welfare schemes or labour protections might help construction workers? Do not declare me eligible — explain how to check official sources.",
      },
    ],
    preferredSourceIds: ["labour-code", "eShram", "esic", "epfo", "pmjay"],
    earningsHintKey: "earnHintConstruction",
  },
  domestic: {
    id: "domestic",
    nameKey: "occDomestic",
    aiLabel:
      "Domestic worker / cook / cleaner / caregiver. Common issues: multiple employers, working hours, agreed wages, payment disputes.",
    homeTaskOrder: ["earnings", "grievance", "rights", "pay_docs", "safety"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnDomGross",
      incentives: "earnDomExtra",
      fuel: "earnDomTravel",
      maintenance: "earnDomSupplies",
      otherExpenses: "earnDomOther",
      employer: "earnDomEmployer",
      workType: "earnDomWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Cooking", "Cleaning", "Caregiving", "Full-time house"],
    quickPrompts: [
      {
        id: "dom-pay",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaDomPay",
        value:
          "My employer delayed or cut my agreed domestic work wages. I want a respectful written complaint.",
      },
      {
        id: "dom-hours",
        module: "rights",
        href: "/rights",
        labelKey: "occQaDomHours",
        value:
          "I do domestic work for one or more households. How can I track hours and wages fairly? Do not invent laws — suggest practical steps and official places to check.",
      },
      {
        id: "dom-earn",
        module: "earnings",
        href: "/earnings",
        labelKey: "occQaDomEarn",
        value: "",
      },
    ],
    preferredSourceIds: ["eShram", "labour-code", "pmjay", "india-gov"],
    earningsHintKey: "earnHintDomestic",
  },
  vendor: {
    id: "vendor",
    nameKey: "occVendor",
    aiLabel:
      "Street vendor / market seller. Common issues: sales, stock costs, operating expenses, local support and permits.",
    homeTaskOrder: ["earnings", "rights", "pay_docs", "grievance", "safety"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnVendorSales",
      incentives: "earnVendorExtra",
      fuel: "earnVendorTransport",
      maintenance: "earnVendorStock",
      otherExpenses: "earnVendorOther",
      employer: "earnVendorPlace",
      workType: "earnVendorWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Vegetables", "Snacks", "Clothes", "Other goods"],
    quickPrompts: [
      {
        id: "ven-earn",
        module: "earnings",
        href: "/earnings",
        labelKey: "occQaVendorEarn",
        value: "",
      },
      {
        id: "ven-rights",
        module: "rights",
        href: "/rights",
        labelKey: "occQaVendorRights",
        value:
          "What official support or schemes might help street vendors? Do not say I qualify — explain how to check government portals.",
      },
      {
        id: "ven-dispute",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaVendorDispute",
        value:
          "I have a payment or local market dispute affecting my street vending income. Help me draft a clear complaint with only the facts I provide.",
      },
    ],
    preferredSourceIds: ["india-gov", "eShram", "labour-code", "consumer"],
    earningsHintKey: "earnHintVendor",
  },
  agri_informal: {
    id: "agri_informal",
    nameKey: "occAgri",
    aiLabel:
      "Agricultural labourer, loader, or other informal worker. Common issues: daily wages, seasonal work, unpaid labour, basic safety and welfare registration.",
    homeTaskOrder: ["earnings", "rights", "grievance", "safety", "pay_docs"],
    expenseLabels: {
      ...defaultExpenseLabels,
      gross: "earnAgriGross",
      incentives: "earnAgriExtra",
      fuel: "earnAgriTravel",
      maintenance: "earnAgriTools",
      otherExpenses: "earnAgriOther",
      employer: "earnAgriEmployer",
      workType: "earnAgriWorkType",
    },
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Farm labour", "Loading", "Seasonal work", "Other"],
    quickPrompts: [
      {
        id: "ag-unpaid",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaAgriUnpaid",
        value:
          "I did farm or loading work and wages were not paid. I want a simple complaint with dates and amount.",
      },
      {
        id: "ag-rights",
        module: "rights",
        href: "/rights",
        labelKey: "occQaAgriRights",
        value:
          "What is e-Shram and how might unorganised or farm workers check schemes? Do not declare eligibility.",
      },
      {
        id: "ag-safety",
        module: "safety",
        href: "/safety",
        labelKey: "occQaAgriSafety",
        value:
          "I do heavy outdoor or farm work. What basic safety and rest steps should I follow in heat or fatigue?",
      },
    ],
    preferredSourceIds: ["eShram", "labour-code", "pmjay", "india-gov"],
    earningsHintKey: "earnHintAgri",
  },
  other: {
    id: "other",
    nameKey: "occOther",
    aiLabel:
      "Other or multiple occupations. Ask clarifying questions when work type is unclear. Do not assume one job type.",
    homeTaskOrder: ["earnings", "safety", "rights", "pay_docs", "grievance"],
    expenseLabels: defaultExpenseLabels,
    showEmployer: true,
    showWorkType: true,
    workTypeSuggestions: ["Gig app", "Daily wage", "Multiple jobs", "Other"],
    quickPrompts: [
      {
        id: "oth-earn",
        module: "earnings",
        href: "/earnings",
        labelKey: "occQaOtherEarn",
        value: "",
      },
      {
        id: "oth-rights",
        module: "rights",
        href: "/rights",
        labelKey: "occQaOtherRights",
        value:
          "I do informal or mixed work. Which official portals can help me check worker schemes without assuming I am eligible?",
      },
      {
        id: "oth-pay",
        module: "grievance",
        href: "/grievance",
        labelKey: "occQaOtherPay",
        value:
          "I have an unpaid wage or payment problem. Help me draft a respectful complaint using only the facts I give.",
      },
    ],
    preferredSourceIds: ["eShram", "labour-code", "india-gov", "pmjay"],
    earningsHintKey: "earnHintOther",
  },
};

export function isOccupationId(value: unknown): value is OccupationId {
  return typeof value === "string" && (OCCUPATION_IDS as readonly string[]).includes(value);
}

export function getOccupation(id: OccupationId | null | undefined): OccupationConfig {
  if (id && isOccupationId(id)) return OCCUPATIONS[id];
  return OCCUPATIONS.other;
}

export type HomeTaskCard = {
  id: HomeTaskId;
  href: string;
  icon: string;
  titleKey: string;
  descKey: string;
  accent: string;
};

const HOME_TASKS: Record<HomeTaskId, HomeTaskCard> = {
  earnings: {
    id: "earnings",
    href: "/earnings",
    icon: "₹",
    titleKey: "taskEarnings",
    descKey: "taskEarningsDesc",
    accent: "#d7efe4",
  },
  safety: {
    id: "safety",
    href: "/safety",
    icon: "🛡",
    titleKey: "taskSafety",
    descKey: "taskSafetyDesc",
    accent: "#e8f0fe",
  },
  rights: {
    id: "rights",
    href: "/rights",
    icon: "⚖",
    titleKey: "taskRights",
    descKey: "taskRightsDesc",
    accent: "#f8e6db",
  },
  pay_docs: {
    id: "pay_docs",
    href: "/documents",
    icon: "📄",
    titleKey: "taskPayDocs",
    descKey: "taskPayDocsDesc",
    accent: "#e6f2ee",
  },
  grievance: {
    id: "grievance",
    href: "/grievance",
    icon: "✍",
    titleKey: "taskGrievance",
    descKey: "taskGrievanceDesc",
    accent: "#fff3cd",
  },
};

export function personalizedHomeTasks(primary: OccupationId | null): HomeTaskCard[] {
  const order = getOccupation(primary).homeTaskOrder;
  return order.map((id) => HOME_TASKS[id]);
}

export function personalizedQuickPrompts(
  primary: OccupationId | null,
): OccupQuickPrompt[] {
  return getOccupation(primary).quickPrompts;
}

export function sortSourcesForOccupation<T extends { id: string }>(
  sources: T[],
  primary: OccupationId | null,
): T[] {
  const preferred = getOccupation(primary).preferredSourceIds;
  const rank = new Map(preferred.map((id, i) => [id, i]));
  return [...sources].sort((a, b) => {
    const ra = rank.has(a.id) ? rank.get(a.id)! : 1000;
    const rb = rank.has(b.id) ? rank.get(b.id)! : 1000;
    return ra - rb;
  });
}

const GENDER_AI_LABEL: Record<string, string> = {
  woman: "woman",
  man: "man",
  other: "another gender identity",
  prefer_not: "prefer not to say",
};

export function profileAiContext(args: {
  primary: OccupationId | null;
  additional: OccupationId[];
  language: string;
  displayName?: string;
  gender?: string | null;
}): Record<string, unknown> {
  const primary = getOccupation(args.primary);
  const additional = args.additional
    .filter((id) => id !== primary.id)
    .map((id) => getOccupation(id).aiLabel);
  const displayName = (args.displayName || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const gender =
    args.gender && GENDER_AI_LABEL[args.gender]
      ? GENDER_AI_LABEL[args.gender]
      : null;
  return {
    primaryOccupationId: primary.id,
    primaryOccupation: primary.aiLabel,
    additionalOccupations: additional,
    language: args.language,
    ...(displayName ? { displayName } : {}),
    ...(gender ? { gender } : {}),
    privacyNote:
      "Profile is saved only on the worker's phone (name, gender, work type). No Aadhaar, bank, or ID numbers. Never ask them to paste ID numbers.",
    guidanceRules: [
      "If displayName is set, address them by that name naturally once in a while — do not overuse it.",
      "If gender is set, use it only for respectful wording; never stereotype or assume eligibility.",
      "Tailor examples to this occupation without inventing rights or eligibility.",
      "Ask a short follow-up question when key facts are missing (dates, amount, platform/employer).",
      "Never claim a scheme, permit, or complaint was completed.",
    ],
  };
}

/** Compact lines for Gemini chat turns. */
export function workerProfilePromptBlock(
  workerProfile: Record<string, unknown> | undefined | null,
): string {
  if (!workerProfile) return "";
  const lines: string[] = [];
  const name = workerProfile.displayName;
  if (typeof name === "string" && name.trim()) {
    lines.push(`Their name: ${name.trim().slice(0, 60)}`);
  }
  const gender = workerProfile.gender;
  if (typeof gender === "string" && gender.trim()) {
    lines.push(`Gender (self-described): ${gender.trim().slice(0, 40)}`);
  }
  const occ = workerProfile.primaryOccupation;
  if (typeof occ === "string" && occ.trim()) {
    lines.push(`Main work: ${occ.trim().slice(0, 80)}`);
  }
  const extra = workerProfile.additionalOccupations;
  if (Array.isArray(extra) && extra.length) {
    lines.push(
      `Also does: ${extra
        .filter((x): x is string => typeof x === "string")
        .slice(0, 4)
        .join(", ")}`,
    );
  }
  if (!lines.length) return "";
  return `Known worker profile (use when helpful; do not invent more):\n${lines.join("\n")}`;
}
