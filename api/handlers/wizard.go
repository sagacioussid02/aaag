package handlers

import (
	"log"

	"github.com/gin-gonic/gin"
)

// GenerateWizard handles the POST /api/generate request.
// This is the core integration endpoint for the end-to-end wizard flow:
// 1. User selects a template in the platform/ wizard UI
// 2. Request is sent to this endpoint with template selection and AI generation params
// 3. AI service generates personalized content
// 4. Template is deployed to Vercel
// 5. Live micro-app link is returned to the user
//
// This endpoint was accidentally removed in a prior draft and has been restored.
// A regression test (wizard_test.go) validates its presence to prevent recurrence.
func GenerateWizard(c *gin.Context) {
	log.Println("[STUB] GenerateWizard endpoint called")

	// TODO: Implement full wizard flow:
	// 1. Parse template selection from request body
	// 2. Call ai-service/ to generate personalized content
	// 3. Deploy template to Vercel with generated content
	// 4. Return live micro-app link to user
	// 5. Log event for analytics and audit

	c.JSON(200, gin.H{
		"message": "Wizard flow not yet implemented",
		"status":  "stub",
	})
}
