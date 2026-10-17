/**
 * Verified government complaint-portal directory.
 * URLs and eligibility claims must come from this file — never from free-form model text.
 */

export const COMPLAINT_PORTAL_IDS = [
  "samadhan",
  "eshram_gms",
  "cpgrams",
  "punjab_connect",
] as const;

export type ComplaintPortalId = (typeof COMPLAINT_PORTAL_IDS)[number];

export type IssueCategory =
  | "wage_employment_dispute"
  | "gig_platform_payment"
  | "eshram_service"
  | "government_service"
  | "punjab_gov_service"
  | "safety_emergency"
  | "unclear"
  | "other";

export type PortalVerificationStatus = "official_url_verified" | "partially_verified";

export type ComplaintPortal = {
  id: ComplaintPortalId;
  displayName: string;
  officialUrl: string;
  responsibleDepartment: string;
  supportedIssueCategories: IssueCategory[];
  geographicScope: "india" | "punjab";
  /** Verified high-level eligibility notes — not a determination for any worker */
  whoMayUse: string;
  exclusions: string;
  requiredDocuments: string[];
  verificationStatus: PortalVerificationStatus;
  lastVerifiedDate: string; // YYYY-MM-DD
  trustedSourceUrls: { title: string; url: string }[];
};

export const COMPLAINT_PORTALS: Record<ComplaintPortalId, ComplaintPortal> = {
  samadhan: {
    id: "samadhan",
    displayName: "SAMADHAN — Ministry of Labour & Employment",
    officialUrl: "https://samadhan.labour.gov.in/",
    responsibleDepartment: "Ministry of Labour and Employment, Government of India",
    supportedIssueCategories: ["wage_employment_dispute"],
    geographicScope: "india",
    whoMayUse:
      "May be relevant for certain industrial/labour disputes and eligible workmen under applicable labour laws. Eligibility is case-specific.",
    exclusions:
      "Not every gig-platform or private informal dispute is covered. Do not assume a delivery partner or casual worker is automatically eligible.",
    requiredDocuments: [
      "Basic work/payment facts (dates, amounts)",
      "Any written agreement or wage records you have",
      "Identity details only as asked on the official site",
    ],
    verificationStatus: "official_url_verified",
    lastVerifiedDate: "2026-10-17",
    trustedSourceUrls: [
      {
        title: "SAMADHAN portal",
        url: "https://samadhan.labour.gov.in/",
      },
      {
        title: "Ministry of Labour & Employment",
        url: "https://labour.gov.in/",
      },
    ],
  },
  eshram_gms: {
    id: "eshram_gms",
    displayName: "e-Shram Grievance Management System",
    officialUrl: "https://gms.eshram.gov.in/",
    responsibleDepartment: "Ministry of Labour and Employment (e-Shram)",
    supportedIssueCategories: ["eshram_service"],
    geographicScope: "india",
    whoMayUse:
      "For problems related to e-Shram registration, profile/service issues, or related e-Shram scheme processes.",
    exclusions:
      "Not a universal wage-dispute portal for private employers or gig platforms.",
    requiredDocuments: [
      "e-Shram / UAN details if you already have them",
      "Description of the registration or service problem",
    ],
    verificationStatus: "official_url_verified",
    lastVerifiedDate: "2026-10-17",
    trustedSourceUrls: [
      { title: "e-Shram GMS", url: "https://gms.eshram.gov.in/" },
      { title: "e-Shram portal", url: "https://eshram.gov.in/" },
    ],
  },
  cpgrams: {
    id: "cpgrams",
    displayName: "CPGRAMS — Public Grievance Portal",
    officialUrl: "https://pgportal.gov.in/",
    responsibleDepartment: "Department of Administrative Reforms & Public Grievances",
    supportedIssueCategories: ["government_service"],
    geographicScope: "india",
    whoMayUse:
      "For appropriate grievances involving government departments and public services.",
    exclusions:
      "Not the default channel for private employer or gig-platform payment disputes.",
    requiredDocuments: [
      "Clear description of the government service problem",
      "Any reference/acknowledgement numbers from the department",
    ],
    verificationStatus: "official_url_verified",
    lastVerifiedDate: "2026-10-17",
    trustedSourceUrls: [
      { title: "CPGRAMS / pgportal", url: "https://pgportal.gov.in/" },
    ],
  },
  punjab_connect: {
    id: "punjab_connect",
    displayName: "Punjab Connect",
    officialUrl: "https://connect.punjab.gov.in/",
    responsibleDepartment: "Government of Punjab",
    supportedIssueCategories: ["punjab_gov_service", "government_service"],
    geographicScope: "punjab",
    whoMayUse:
      "For relevant Punjab government service or departmental grievances.",
    exclusions:
      "Does not cover every private employment or platform dispute.",
    requiredDocuments: [
      "Description of the Punjab government service issue",
      "Any local department reference you already have",
    ],
    verificationStatus: "official_url_verified",
    lastVerifiedDate: "2026-10-17",
    trustedSourceUrls: [
      { title: "Punjab Connect", url: "https://connect.punjab.gov.in/" },
    ],
  },
};

export function isComplaintPortalId(value: unknown): value is ComplaintPortalId {
  return (
    typeof value === "string" &&
    (COMPLAINT_PORTAL_IDS as readonly string[]).includes(value)
  );
}

export function getComplaintPortal(id: ComplaintPortalId): ComplaintPortal {
  return COMPLAINT_PORTALS[id];
}

export function portalDirectoryForPrompt(): string {
  return COMPLAINT_PORTAL_IDS.map((id) => {
    const p = COMPLAINT_PORTALS[id];
    return [
      `ID: ${p.id}`,
      `Name: ${p.displayName}`,
      `URL: ${p.officialUrl}`,
      `Scope: ${p.geographicScope}`,
      `Categories: ${p.supportedIssueCategories.join(", ")}`,
      `Who may use: ${p.whoMayUse}`,
      `Exclusions: ${p.exclusions}`,
    ].join("\n");
  }).join("\n\n");
}

/** Only allow https URLs that match a directory record exactly. */
export function isTrustedPortalUrl(url: string): boolean {
  return COMPLAINT_PORTAL_IDS.some((id) => COMPLAINT_PORTALS[id].officialUrl === url);
}
