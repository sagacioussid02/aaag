package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strings"
	"time"
)

// Deployer handles deploying micro-apps to Vercel via their API.
// Each template is a separate Vercel project. We deploy with env vars
// that point to the app's config stored in Supabase Storage.
type Deployer struct {
	vercelToken  string
	vercelTeamID string
	client       *http.Client
}

func NewDeployer(token, teamID string) *Deployer {
	return &Deployer{
		vercelToken:  token,
		vercelTeamID: teamID,
		client:       &http.Client{Timeout: 30 * time.Second},
	}
}

type DeployRequest struct {
	TemplateSlug string
	AppID        string
	ConfigURL    string // Supabase Storage public URL for the app's config JSON
	OwnerName    string // used in subdomain: recipe-sarah-abc123
}

type DeployResult struct {
	DeploymentID string
	Subdomain    string // full subdomain: recipe-sarah-abc123.aaag.com
	URL          string // Vercel deployment URL (before custom domain)
}

// Deploy triggers a Vercel deployment of the given template with the app's config.
func (d *Deployer) Deploy(req DeployRequest) (*DeployResult, error) {
	subdomain := buildSubdomain(req.TemplateSlug, req.OwnerName, req.AppID)

	// Vercel deployment API call
	// In production: use Vercel's deployments API to redeploy a template project
	// with NEXT_PUBLIC_APP_ID env var so the template fetches the right config.
	payload := map[string]any{
		"name":   fmt.Sprintf("aaag-%s", req.AppID[:8]),
		"target": "production",
		"env": []map[string]string{
			{"key": "NEXT_PUBLIC_APP_ID", "value": req.AppID},
			{"key": "NEXT_PUBLIC_CONFIG_URL", "value": req.ConfigURL},
		},
	}

	body, _ := json.Marshal(payload)
	httpReq, err := http.NewRequest("POST", "https://api.vercel.com/v13/deployments", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+d.vercelToken)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("vercel deploy: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		ID  string `json:"id"`
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode vercel response: %w", err)
	}

	return &DeployResult{
		DeploymentID: result.ID,
		Subdomain:    subdomain,
		URL:          result.URL,
	}, nil
}

// buildSubdomain creates a friendly subdomain like "recipe-sarah-a1b2c3"
func buildSubdomain(templateSlug, ownerName, appID string) string {
	prefix := strings.Split(templateSlug, "-")[0] // "recipe" from "recipe-app"
	name := strings.ToLower(strings.ReplaceAll(ownerName, " ", ""))
	suffix := appID[:6]
	return fmt.Sprintf("%s-%s-%s", prefix, name, suffix)
}

// randomSuffix generates a short random string for uniqueness
func randomSuffix(n int) string {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, n)
	for i := range b {
		b[i] = chars[r.Intn(len(chars))]
	}
	return string(b)
}
