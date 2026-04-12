package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/yourusername/aaag-api/internal/handlers"
	"github.com/yourusername/aaag-api/internal/services"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	r := gin.Default()

	// Services
	deployer := services.NewDeployer(os.Getenv("VERCEL_TOKEN"), os.Getenv("VERCEL_TEAM_ID"))
	notifier := services.NewNotifier(os.Getenv("RESEND_API_KEY"))
	generator := services.NewGenerator(os.Getenv("AI_SERVICE_URL"))

	// Handlers
	h := handlers.New(deployer, notifier, generator)

	// Public routes
	api := r.Group("/api")
	{
		api.GET("/templates", h.ListTemplates)
		api.GET("/templates/:slug", h.GetTemplate)
		api.POST("/orders", h.CreateOrder)
		api.GET("/apps/:id", h.GetApp)
		api.GET("/apps/user/:userId", h.ListUserApps)
		api.POST("/apps/:id/extend", h.ExtendApp)
	}

	// Stripe webhook (raw body needed)
	r.POST("/api/webhooks/stripe", h.StripeWebhook)

	// Internal (protected by internal secret header)
	internal := r.Group("/internal")
	internal.Use(handlers.InternalAuthMiddleware())
	{
		internal.POST("/expire", h.ExpireApps) // called by pg_cron or cron job
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("AaaG API running on :%s", port)
	r.Run(":" + port)
}