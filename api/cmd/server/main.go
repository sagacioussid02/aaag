package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"aaag/api/handlers"
)

func init() {
	// Load .env file if it exists (optional for production)
	_ = godotenv.Load()
}

func main() {
	// Initialize Gin router
	router := gin.Default()

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Wizard endpoint: generate micro-app from template selection
	// This is the core integration path for the end-to-end wizard flow.
	// Restored in Sprint 6 after accidental removal in prior draft.
	router.POST("/api/generate", handlers.GenerateWizard)

	// TODO(high, payment): Implement order creation with payment processing
	// Tracked as #AAAG-002. Blocked until CI is green (Sprint 6).
	// Deadline: Sprint 7. Owner: senior_engineer.
	// Acceptance criteria: payment validation, Stripe integration, error handling,
	// integration tests, idempotency enforcement.
	router.POST("/orders", func(c *gin.Context) {
		c.JSON(501, gin.H{"error": "order creation not yet implemented"})
	})

	// TODO(critical, payment): Implement Stripe webhook handler for payment confirmation
	// Tracked as #AAAG-003. Blocked until CI is green (Sprint 6).
	// Deadline: Sprint 7. Owner: senior_engineer.
	// Acceptance criteria: signature validation, status updates, notifications,
	// integration tests, idempotency, audit logging.
	router.POST("/webhooks/stripe", func(c *gin.Context) {
		log.Println("[STUB] Stripe webhook received (not yet processing)")
		c.JSON(200, gin.H{"received": true})
	})

	// TODO(high, app_lifecycle): Implement app deployment endpoint
	// Tracked as #AAAG-004. Blocked until CI is green (Sprint 6).
	// Deadline: Sprint 7. Owner: senior_engineer.
	// Acceptance criteria: Vercel deployment trigger, live link return,
	// status tracking, integration tests, error handling.
	router.POST("/apps/deploy", func(c *gin.Context) {
		c.JSON(501, gin.H{"error": "app deployment not yet implemented"})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting API server on port %s\n", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
