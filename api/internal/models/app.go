package models

import "time"

// ─── Plan types ───────────────────────────────────────────────────────────────

type PlanType string

const (
	PlanSpark  PlanType = "spark"   // $9.99  / 30 days  / 5 users
	PlanMoment PlanType = "moment"  // $24.99 / 90 days  / 20 users
	PlanKeep   PlanType = "keep"    // $4.99/mo / forever / unlimited
	PlanGift   PlanType = "gift"    // $14.99 / 60 days  / 10 users
)

func (p PlanType) DurationDays() int {
	switch p {
	case PlanSpark:
		return 30
	case PlanMoment:
		return 90
	case PlanKeep:
		return 0 // forever
	case PlanGift:
		return 60
	default:
		return 30
	}
}

func (p PlanType) PriceCents() int {
	switch p {
	case PlanSpark:
		return 999
	case PlanMoment:
		return 2499
	case PlanKeep:
		return 499
	case PlanGift:
		return 1499
	default:
		return 999
	}
}

func (p PlanType) MaxUsers() int {
	switch p {
	case PlanSpark:
		return 5
	case PlanMoment:
		return 20
	case PlanKeep:
		return -1 // unlimited
	case PlanGift:
		return 10
	default:
		return 5
	}
}

// ─── App status ───────────────────────────────────────────────────────────────

type AppStatus string

const (
	StatusGenerating AppStatus = "generating"
	StatusLive       AppStatus = "live"
	StatusExpired    AppStatus = "expired"
	StatusDeleted    AppStatus = "deleted"
)

// ─── App config envelope ─────────────────────────────────────────────────────
// Mirrors the TypeScript AppConfigEnvelope in platform/lib/types.ts.
// This is what is stored in apps.config JSONB and passed through the pipeline.

type MediaRef struct {
	StoragePath string `json:"storage_path"`
	PublicURL   string `json:"public_url"`
	MimeType    string `json:"mime_type"`
	SizeBytes   int64  `json:"size_bytes"`
	Width       *int   `json:"width,omitempty"`
	Height      *int   `json:"height,omitempty"`
}

type AppMeta struct {
	TemplateSlug  string `json:"template_slug"`
	AppName       string `json:"app_name"`
	Theme         string `json:"theme"`
	PlanType      string `json:"plan_type"`
	BuyerEmail    string `json:"buyer_email"`
	RecipientName string `json:"recipient_name"`
}

// AppConfigEnvelope is the structured config stored in apps.config JSONB.
// AIContent is template-specific; UserInputs and Media are keyed by config_schema field keys.
type AppConfigEnvelope struct {
	Version    string         `json:"_version"`
	Meta       AppMeta        `json:"meta"`
	UserInputs map[string]any `json:"user_inputs"`
	Media      map[string]any `json:"media"`      // values: MediaRef or []MediaRef
	AIContent  map[string]any `json:"ai_content"`
}

// ─── Core domain models ───────────────────────────────────────────────────────

type App struct {
	ID                 string            `json:"id"`
	OrderID            string            `json:"order_id"`
	Subdomain          string            `json:"subdomain"`
	VercelDeploymentID string            `json:"vercel_deployment_id"`
	Config             AppConfigEnvelope `json:"config"`
	Status             AppStatus         `json:"status"`
	ExpiresAt          *time.Time        `json:"expires_at"` // nil = forever (Keep plan)
	CreatedAt          time.Time         `json:"created_at"`
}

type Order struct {
	ID              string             `json:"id"`
	UserID          string             `json:"user_id"`
	TemplateID      string             `json:"template_id"`
	TemplateSlug    string             `json:"template_slug"`
	PlanType        PlanType           `json:"plan_type"`
	AmountCents     int                `json:"amount_cents"`
	StripePaymentID string             `json:"stripe_payment_id"`
	Status          string             `json:"status"` // pending | paid | failed
	CreatedAt       time.Time          `json:"created_at"`
	// Config is the AppConfigEnvelope for the associated app, loaded alongside the order.
	// Populated by db.GetOrder via a JOIN on apps.config.
	Config          AppConfigEnvelope  `json:"config"`
}

type Template struct {
	ID              string         `json:"id"`
	Slug            string         `json:"slug"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Category        string         `json:"category"`
	Emoji           string         `json:"emoji"`
	PreviewURL      string         `json:"preview_url"`
	ConfigSchema    map[string]any `json:"config_schema"`
	BasePriceCents  int            `json:"base_price_cents"`
	Active          bool           `json:"active"`
	CreatorID       string         `json:"creator_id,omitempty"`
	CreatorName     string         `json:"creator_name,omitempty"`
	RevenueSharePct int            `json:"revenue_share_pct"`
	IsSystem        bool           `json:"is_system"`
	RequiresMedia   bool           `json:"requires_media"`
}
