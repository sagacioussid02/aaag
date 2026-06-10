package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"aaag/api/handlers"
)

func main() {
	router := gin.Default()

	// Wizard integration
	router.POST("/api/generate", handlers.GenerateWizard)

	// Orders endpoint
	router.POST("/api/orders", handlers.CreateOrder)

	// Payments endpoint
	router.POST("/api/payments", handlers.ProcessPayment)

	// Stripe webhook handler
	// TODO(critical, payment): implement Stripe webhook signature validation and payment confirmation logic
	// Issue: #AAAG-001
	// Owner: cloud_devops (infrastructure), senior_engineer (code implementation)
	// Deadline: Sprint 7
	// Acceptance: signature validation, status updates, notifications, integration tests, idempotency, audit logging
	router.POST("/api/webhooks/stripe", func(c *gin.Context) {
		log.Println("[STUB] Stripe webhook received but not yet implemented")
		c.JSON(http.StatusOK, gin.H{"status": "received"})
	})

	// App deployment endpoint
	router.POST("/api/apps/deploy", handlers.DeployApp)

	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
