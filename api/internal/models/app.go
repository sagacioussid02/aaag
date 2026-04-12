package models

import "time"

type PlanType string

const (
	PlanSpark  PlanType = "spark"   // $9.99 / 30 days / 5 users
	PlanMoment PlanType = "moment"  // $24.99 / 90 days / 20 users
	PlanKeep   PlanType = "keep"    // $4.99/mo / forever
	PlanGift   PlanType = "gift"    // $14.99 / 60 days / 10 users
)

type AppStatus string

const (
	StatusGenerating AppStatus = "generating"
	StatusLive       AppStatus = "live"
	StatusExpired    AppStatus = "expired"
	StatusDeleted    AppStatus = "deleted"
)

type App struct {
	ID                 string            `json:"id"`
	OrderID            string            `json:"order_id"`
	Subdomain          string            `json:"subdomain"`           // recipe-sarah-abc123
	VercelDeploymentID string            `json:"vercel_deployment_id"`
	Config             map[string]any    `json:"config"`              // user's answers
	AIContent          map[string]any    `json:"ai_content"`          // Claude-generated content
	Status             AppStatus         `json:"status"`
	ExpiresAt          *time.Time        `json:"expires_at"`          // nil = forever
	CreatedAt          time.Time         `json:"created_at"`
}

type Order struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	TemplateID      string    `json:"template_id"`
	TemplateSlug    string    `json:"template_slug"`
	PlanType        PlanType  `json:"plan_type"`
	AmountCents     int       `json:"amount_cents"`
	StripePaymentID string    `json:"stripe_payment_id"`
	Status          string    `json:"status"` // pending | paid | failed
	CreatedAt       time.Time `json:"created_at"`
}

type Template struct {
	ID           string         `json:"id"`
	Slug         string         `json:"slug"`
	Name         string         `json:"name"`
	Description  string         `json:"description"`
	Category     string         `json:"category"` // gift | travel | event | game
	PreviewURL   string         `json:"preview_url"`
	ConfigSchema map[string]any `json:"config_schema"` // JSON Schema for the form
	Active       bool           `json:"active"`
}

// PlanDays returns how many days a plan lasts (0 = forever)
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
		return 499 // per month
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