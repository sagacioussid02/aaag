package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stripe/stripe-go/v78/webhook"

	"github.com/yourusername/aaag-api/internal/models"
	"github.com/yourusername/aaag-api/internal/services"
)

// StripeWebhook handles Stripe payment events.
// The critical event: checkout.session.completed → kick off app generation.
func (h *Handler) StripeWebhook(c *gin.Context) {
	const maxBodyBytes = int64(65536)
	body, err := io.ReadAll(io.LimitReader(c.Request.Body, maxBodyBytes))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "read body failed"})
		return
	}

	event, err := webhook.ConstructEvent(body, c.GetHeader("Stripe-Signature"), os.Getenv("STRIPE_WEBHOOK_SECRET"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid signature"})
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session struct {
			ID       string            `json:"id"`
			Metadata map[string]string `json:"metadata"`
		}
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "parse session"})
			return
		}

		// metadata set when creating the checkout session
		orderID := session.Metadata["order_id"]
		appID := session.Metadata["app_id"]

		// Fire off generation pipeline in background — do NOT block the webhook response
		go h.runGenerationPipeline(orderID, appID)

	case "invoice.payment_failed":
		// TODO: handle Keep plan renewal failure — mark app as suspended
		log.Printf("Payment failed for event %s", event.ID)
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// runGenerationPipeline is the core pipeline:
// 1. Load order + user config from DB
// 2. Call AI service for content generation
// 3. Store config in Supabase Storage
// 4. Deploy to Vercel
// 5. Update app record to "live"
// 6. Send email to buyer
func (h *Handler) runGenerationPipeline(orderID, appID string) {
	log.Printf("Starting generation pipeline for order=%s app=%s", orderID, appID)

	// 1. Load order from DB (implement in db layer)
	order, userConfig, err := h.db.GetOrderWithConfig(orderID)
	if err != nil {
		log.Printf("ERROR: load order %s: %v", orderID, err)
		return
	}

	// 2. Generate AI content
	aiContent, err := h.generator.Generate(order, userConfig)
	if err != nil {
		log.Printf("ERROR: generate content for order %s: %v", orderID, err)
		return
	}

	// 3. Build full config and store in Supabase Storage
	fullConfig := map[string]any{
		"user":    userConfig,
		"content": aiContent,
	}
	configURL, err := h.db.StoreAppConfig(appID, fullConfig)
	if err != nil {
		log.Printf("ERROR: store config for app %s: %v", appID, err)
		return
	}

	// 4. Deploy to Vercel
	ownerName, _ := userConfig["recipient_name"].(string)
	deployResult, err := h.deployer.Deploy(services.DeployRequest{
		TemplateSlug: order.TemplateSlug,
		AppID:        appID,
		ConfigURL:    configURL,
		OwnerName:    ownerName,
	})
	if err != nil {
		log.Printf("ERROR: deploy app %s: %v", appID, err)
		return
	}

	// 5. Update app record to live
	plan := models.PlanType(order.PlanType)
	var expiresAt *time.Time
	if days := plan.DurationDays(); days > 0 {
		t := time.Now().AddDate(0, 0, days)
		expiresAt = &t
	}

	if err := h.db.ActivateApp(appID, deployResult.DeploymentID, deployResult.Subdomain, expiresAt); err != nil {
		log.Printf("ERROR: activate app %s: %v", appID, err)
		return
	}

	// 6. Send email
	buyerEmail, _ := userConfig["buyer_email"].(string)
	appURL := fmt.Sprintf("https://%s.aaag.com", deployResult.Subdomain)
	if err := h.notifier.SendAppReady(buyerEmail, ownerName, appURL, expiresAt); err != nil {
		log.Printf("WARN: send email for app %s: %v", appID, err)
		// non-fatal, app is live regardless
	}

	log.Printf("App %s is LIVE at %s", appID, appURL)
}
