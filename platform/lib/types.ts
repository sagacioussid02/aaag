// ─── Config Schema (Form DSL — stored in templates.config_schema JSONB) ───────

export type ConfigSchema = {
  version: "1";
  platform: "web" | "mobile" | "both";
  ai_enabled: boolean;
  ai_prompt_keys: string[];
  steps: WizardStep[];
};

export type WizardStep = {
  id: string;
  title: string;
  subtitle?: string;
  fields: FieldDef[];
};

type FieldBase = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  default?: unknown;
};

export type SelectOption = { value: string; label: string; description?: string };
export type PlanOption   = { value: string; label: string; price: string; badge?: string; desc: string };

export type FieldDef =
  | (FieldBase & { type: "text";          placeholder?: string; max_length?: number })
  | (FieldBase & { type: "email";         placeholder?: string })
  | (FieldBase & { type: "textarea";      placeholder?: string; max_length?: number; rows?: number })
  | (FieldBase & { type: "number";        min?: number; max?: number; step?: number })
  | (FieldBase & { type: "toggle" })
  | (FieldBase & { type: "select";        options: SelectOption[] })
  | (FieldBase & { type: "multiselect";   options: string[]; max_selections?: number })
  | (FieldBase & { type: "plan_picker";   options: PlanOption[] })
  | (FieldBase & { type: "image_upload";  multiple?: boolean; max_files?: number; max_size_mb?: number; accept?: string[] })
  | (FieldBase & { type: "document_upload"; multiple?: boolean; max_files?: number; max_size_mb?: number; accept?: string[] })
  | (FieldBase & { type: "color_picker";  presets?: string[] });

// ─── Template record (row from templates table) ───────────────────────────────

export type TemplateRecord = {
  id:               string;
  slug:             string;
  name:             string;
  description:      string;
  category:         string;
  emoji:            string;
  preview_url:      string | null;
  config_schema:    ConfigSchema;
  base_price_cents: number;
  active:           boolean;
  creator_id:       string | null;
  creator_name:     string | null;
  is_system:        boolean;
  requires_media:   boolean;
  created_at:       string;
};

// ─── App Config Envelope (stored in apps.config JSONB) ───────────────────────

export type MediaRef = {
  storage_path: string;
  public_url:   string;
  mime_type:    string;
  size_bytes:   number;
  width?:       number;
  height?:      number;
};

export type AppMeta = {
  template_slug:  string;
  app_name:       string;
  theme:          string;
  plan_type:      string;
  buyer_email:    string;
  recipient_name: string;
};

export type AppConfigEnvelope = {
  _version:    "1";
  meta:        AppMeta;
  user_inputs: Record<string, string | string[] | number | boolean>;
  media:       Record<string, MediaRef | MediaRef[]>;
  ai_content:  Record<string, unknown>;
};

// ─── Per-template ai_content shapes ──────────────────────────────────────────

// Recipe App
export type Recipe = {
  id:                  string;
  title:               string;
  cuisine:             string;
  description:         string;
  prep_time_minutes:   number;
  cook_time_minutes:   number;
  servings:            number;
  difficulty:          "easy" | "medium" | "hard";
  ingredients:         string[];
  steps:               string[];
  tips:                string;
  emoji:               string;
};

export type RecipeContent = {
  app_title:       string;
  welcome_message: string;
  personal_note:   string;
  recipes:         Recipe[];
};

// Personal Diary App
export type DiaryAppContent = {
  app_title:        string;
  welcome_message:  string;
  personal_note:    string;
  memory_captions:  string[];
};

// Portfolio Website App
export type PortfolioGiftMode = "gift" | "self";

export type PortfolioPlanType = "free_trial" | "one_time" | "managed";

export type PortfolioDeploymentStrategy = "shared_template" | "per_customer_repo";

export type PortfolioBuildStatus =
  | "draft"
  | "queued"
  | "generating"
  | "deploying"
  | "live"
  | "failed";

export type PortfolioSourceDocumentType = "resume" | "cover_letter";

export type PortfolioSourceDocumentStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "failed";

export type PortfolioSourceDocument = {
  id:              string;
  app_id?:         string;
  field_key:       "resume_pdf" | "cover_letter_pdf";
  document_type:   PortfolioSourceDocumentType;
  file_name:       string;
  storage_path:    string;
  public_url?:     string;
  mime_type:       "application/pdf" | string;
  size_bytes:      number;
  extraction_status: PortfolioSourceDocumentStatus;
  extracted_text?: string;
  created_at:      string;
};

export type PortfolioPlan = {
  type:                PortfolioPlanType;
  label:               string;
  price_label:         string;
  duration_days:       number | null;
  deployment_strategy: PortfolioDeploymentStrategy;
  public_deploy:       boolean;
  maintenance_included: boolean;
  traffic_note:        string;
};

export type PortfolioLink = {
  label: string;
  url:   string;
};

export type PortfolioProfile = {
  name:       string;
  headline:   string;
  location?:  string;
  summary:    string;
  email?:     string;
  phone?:     string;
  website?:   string;
  links:      PortfolioLink[];
};

export type PortfolioExperience = {
  company:    string;
  title:      string;
  period:     string;
  location?:  string;
  current?:   boolean;
  bullets:    string[];
  highlights: string[];
  tech:       string[];
};

export type PortfolioProject = {
  title:       string;
  description: string;
  impact?:     string;
  tags:        string[];
  links:       PortfolioLink[];
  featured:    boolean;
};

export type PortfolioSkillGroup = {
  label:  string;
  skills: string[];
};

export type PortfolioEducation = {
  institution: string;
  credential:  string;
  period?:     string;
  details?:    string[];
};

export type PortfolioTheme = {
  mode:     "light" | "dark";
  accent:   string;
  layout:   "cinematic" | "classic" | "minimal";
};

export type PortfolioSourceSummary = {
  inferred_from: string[];
  missing_info:  string[];
  notes:         string[];
};

export type PortfolioQualityFlag = {
  field:      string;
  issue:      string;
  confidence: "low" | "medium" | "high";
};

export type PortfolioConfig = {
  version:        "1";
  gift_mode:      PortfolioGiftMode;
  recipient_name: string;
  buyer_email:    string;
  app_title:      string;
  profile:        PortfolioProfile;
  experience:     PortfolioExperience[];
  projects:       PortfolioProject[];
  skills:         PortfolioSkillGroup[];
  education:      PortfolioEducation[];
  theme:          PortfolioTheme;
  source_summary: PortfolioSourceSummary;
  quality_flags:  PortfolioQualityFlag[];
};

export type PortfolioContent = PortfolioConfig;

export type PortfolioBuildLog = {
  id:         string;
  build_id:   string;
  level:      "info" | "warning" | "error";
  message:    string;
  created_at: string;
};

export type PortfolioBuild = {
  id:                  string;
  app_id:              string;
  order_id?:           string;
  status:              PortfolioBuildStatus;
  selected_plan:       PortfolioPlan;
  deployment_strategy: PortfolioDeploymentStrategy;
  public_url:          string | null;
  cost_estimate_cents: number | null;
  ai_cost_estimate_cents: number | null;
  deployment_cost_estimate_cents: number | null;
  logs:                PortfolioBuildLog[];
  created_at:          string;
  updated_at:          string;
};

// ─── App record (row from apps table) ────────────────────────────────────────

export type AppStatus = "generating" | "live" | "expired" | "deleted";

export type AppRecord = {
  id:         string;
  template_slug?: string;
  subdomain:  string;
  config:     AppConfigEnvelope;
  status:     AppStatus;
  public_url?: string | null;
  expires_at: string | null;
  created_at: string;
};

// ─── API response types ───────────────────────────────────────────────────────

export type GenerateResponse = { app_id: string };
export type GenerateError    = { error: string };
