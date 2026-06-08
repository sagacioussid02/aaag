package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type WizardRequest struct {
	RecipientName  string `json:"recipient_name" binding:"required"`
	Occasion       string `json:"occasion" binding:"required"`
	Theme          string `json:"theme" binding:"required"`
	CustomMessage  string `json:"custom_message"`
}

type GeneratedAppResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Code        string `json:"code"`
	GiftURL     string `json:"gift_url,omitempty"`
}

type AIServiceRequest struct {
	RecipientName  string `json:"recipient_name"`
	Occasion       string `json:"occasion"`
	Theme          string `json:"theme"`
	CustomMessage  string `json:"custom_message"`
}

type AIServiceResponse struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Code        string `json:"code"`
	GiftURL     string `json:"gift_url,omitempty"`
}

func GenerateWizard(c *gin.Context) {
	var req WizardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get AI service URL from environment
	aiServiceURL := os.Getenv("AI_SERVICE_URL")
	if aiServiceURL == "" {
		aiServiceURL = "http://localhost:8000"
	}

	// Prepare request to AI service
	aiReq := AIServiceRequest{
		RecipientName:  req.RecipientName,
		Occasion:       req.Occasion,
		Theme:          req.Theme,
		CustomMessage:  req.CustomMessage,
	}

	aiReqBody, err := json.Marshal(aiReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to marshal request"})
		return
	}

	// Call AI service
	resp, err := http.Post(
		fmt.Sprintf("%s/generate", aiServiceURL),
		"application/json",
		bytes.NewBuffer(aiReqBody),
	)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach AI service"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		c.JSON(http.StatusBadGateway, gin.H{"error": fmt.Sprintf("AI service error: %s", string(body))})
		return
	}

	// Parse AI service response
	var aiResp AIServiceResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse AI service response"})
		return
	}

	// Return response to platform
	result := GeneratedAppResponse{
		Title:       aiResp.Title,
		Description: aiResp.Description,
		Code:        aiResp.Code,
		GiftURL:     aiResp.GiftURL,
	}

	c.JSON(http.StatusOK, result)
}
