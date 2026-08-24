export type Organization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

export type Client = {
  id: string;
  organization_id: string;
  name: string;
};

export type Demand = {
  id: string;
  client_id: string;
  project_id?: string | null;
  title: string;
  external_number?: string | null;
  business_area: string;
  business_process: string;
  system_product: string;
  requester_name: string;
  product_owner_name?: string | null;
  priority: string;
  demand_type: string;
};

export type LpnVersion = {
  id: string;
  lpn_id: string;
  source_version_id?: string | null;
  version_number: number;
  status: string;
  document_status: string;
  change_summary?: string | null;
  approved_at?: string | null;
};

export type Lpn = {
  id: string;
  demand_id: string;
  organization_id: string;
  current_version_number: number;
  approved_version_id?: string | null;
  current_version?: LpnVersion | null;
};

export type ContentKind =
  | "storytelling"
  | "stakeholder"
  | "gap"
  | "objective"
  | "requirement"
  | "business_rule"
  | "screen"
  | "screen_field"
  | "report"
  | "integration"
  | "impact"
  | "constraint"
  | "dependency"
  | "scope_exclusion"
  | "acceptance_criterion"
  | "pending_issue";

export type ContentItem = {
  id: string;
  lpn_version_id: string;
  stable_key: string;
  kind: ContentKind;
  code: string;
  title: string;
  payload: Record<string, unknown>;
  sort_order: number;
};

export type ValidationResult = {
  id: string;
  rule_code: string;
  severity: "blocking" | "warning";
  status: "passed" | "failed" | "justified";
  message: string;
};

export type GeneratedDocument = {
  id: string;
  filename: string;
  content_type: string;
  sha256: string;
};
