package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"aaag/api/handlers"
)

func main() {
	router := gin.Default()

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Wizard integration endpoint
	router.POST("/api/generate", handlers.GenerateWizard)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting API server on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
