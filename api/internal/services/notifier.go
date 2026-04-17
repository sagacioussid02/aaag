package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Notifier sends transactional emails via Resend.
type Notifier struct {
	apiKey string
	client *http.Client
}

func NewNotifier(apiKey string) *Notifier {
	return &Notifier{
		apiKey: apiKey,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type resendPayload struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

// SendAppReady emails the buyer when their app is live.
func (n *Notifier) SendAppReady(toEmail, recipientName, appURL string, expiresAt *time.Time) error {
	expiry := "forever"
	if expiresAt != nil {
		expiry = "until " + expiresAt.Format("January 2, 2006")
	}

	html := fmt.Sprintf(`
<h2>Your app is live! 🎉</h2>
<p>You gifted <strong>%s</strong> a personalized app.</p>
<p><a href="%s">%s</a></p>
<p>Available %s.</p>
`, recipientName, appURL, appURL, expiry)

	payload := resendPayload{
		From:    "AaaG <noreply@aaag.com>",
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Your gift for %s is ready!", recipientName),
		HTML:    html,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+n.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := n.client.Do(req)
	if err != nil {
		return fmt.Errorf("resend: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("resend returned %d", resp.StatusCode)
	}
	return nil
}
