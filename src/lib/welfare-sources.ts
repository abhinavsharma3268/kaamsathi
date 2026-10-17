export type WelfareSource = {
  id: string;
  title: string;
  url: string;
  topics: string[];
  notes: string;
};

/**
 * Curated official / government-adjacent sources for Rights module.
 * The AI is instructed to prefer these and not invent eligibility.
 */
export const WELFARE_SOURCES: WelfareSource[] = [
  {
    id: "labour-code",
    title: "Ministry of Labour & Employment (India)",
    url: "https://labour.gov.in/",
    topics: ["labour rights", "employment", "social security"],
    notes: "Official labour ministry portal for schemes and labour laws.",
  },
  {
    id: "epfo",
    title: "Employees' Provident Fund Organisation (EPFO)",
    url: "https://www.epfindia.gov.in/",
    topics: ["provident fund", "pension", "social security"],
    notes: "EPF / EPS information. Gig eligibility depends on current rules and employer/platform contribution.",
  },
  {
    id: "esic",
    title: "Employees' State Insurance Corporation (ESIC)",
    url: "https://www.esic.gov.in/",
    topics: ["health insurance", "medical", "maternity"],
    notes: "ESI medical and cash benefits for covered employees — coverage is rule-based, not automatic for all gig workers.",
  },
  {
    id: "pmjay",
    title: "Ayushman Bharat – PM-JAY",
    url: "https://pmjay.gov.in/",
    topics: ["health cover", "hospital", "insurance"],
    notes: "National health assurance scheme. Eligibility is based on SECC / state lists — check the official portal.",
  },
  {
    id: "eShram",
    title: "e-Shram portal",
    url: "https://eshram.gov.in/",
    topics: ["unorganised worker", "registration", "gig", "platform"],
    notes: "National database for unorganised workers including gig and platform workers. Registration may help access future benefits.",
  },
  {
    id: "ncs",
    title: "National Career Service",
    url: "https://www.ncs.gov.in/",
    topics: ["jobs", "skilling", "career"],
    notes: "Government job and skilling portal.",
  },
  {
    id: "india-gov",
    title: "National Portal of India",
    url: "https://www.india.gov.in/",
    topics: ["schemes", "welfare", "documents"],
    notes: "Directory of government services and schemes.",
  },
  {
    id: "consumer",
    title: "National Consumer Helpline",
    url: "https://consumerhelpline.gov.in/",
    topics: ["complaint", "consumer", "grievance"],
    notes: "Consumer complaint guidance. Platform disputes may also use in-app support and labour authorities.",
  },
];

export function sourcesForPrompt(): string {
  return WELFARE_SOURCES.map(
    (s) => `- ${s.title}: ${s.url} | topics: ${s.topics.join(", ")} | note: ${s.notes}`,
  ).join("\n");
}
