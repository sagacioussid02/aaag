package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/yourusername/aaag-api/internal/models"
)

// Generator calls the Python AI service to generate personalized app content.
type Generator struct {
	aiServiceURL string
	client       *http.Client
}

func NewGenerator(aiServiceURL string) *Generator {
	return &Generator{
		aiServiceURL: aiServiceURL,
		client:       &http.Client{},
	}
}

type GenerateRequest struct {
	TemplateSlug string         `json:"template_slug"`
	UserConfig   map[string]any `json:"user_config"`
}

type GenerateResponse struct {
	Content map[string]any `json:"content"`
}

// Generate sends user config to the AI service and returns Claude-generated content.
// e.g. for recipe-app: returns 40 personalized recipes based on user's cuisine prefs.
func (g *Generator) Generate(order *models.Order, userConfig map[string]any) (map[string]any, error) {
	payload := GenerateRequest{
		TemplateSlug: order.TemplateSlug,
		UserConfig:   userConfig,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal generate request: %w", err)
	}

	resp, err := g.client.Post(g.aiServiceURL+"/generate", "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("call ai service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("ai service returned %d", resp.StatusCode)
	}

	var result GenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode ai response: %w", err)
	}

	return result.Content, nil
}
