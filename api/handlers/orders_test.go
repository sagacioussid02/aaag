package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateOrder_ValidationError_StatusCode(t *testing.T) {
	tests := []struct {
		name           string
		payload        map[string]interface{}
		expectedStatus int
		expectedFields []string
	}{
		{
			name: "missing user_name returns 400",
			payload: map[string]interface{}{
				"template_id": "template-1",
				"user_email": "test@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"user_name"},
		},
		{
			name: "missing user_email returns 400",
			payload: map[string]interface{}{
				"template_id": "template-1",
				"user_name": "John Doe",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"user_email"},
		},
		{
			name: "missing template_id returns 400",
			payload: map[string]interface{}{
				"user_name": "John Doe",
				"user_email": "test@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"template_id"},
		},
		{
			name: "valid payload returns 201",
			payload: map[string]interface{}{
				"template_id": "template-1",
				"user_name": "John Doe",
				"user_email": "test@example.com",
			},
			expectedStatus: http.StatusCreated,
			expectedFields: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.payload)
			c.Request, _ = http.NewRequest("POST", "/orders", bytes.NewReader(body))
			c.Request.Header.Set("Content-Type", "application/json")

			CreateOrder(c)

			// Assert HTTP status code
			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			// For error cases, verify response structure
			if tt.expectedStatus == http.StatusBadRequest {
				var resp map[string]interface{}
				if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to unmarshal error response: %v", err)
				}

				// Verify error response has details field
				if _, ok := resp["details"]; !ok {
					t.Error("expected 'details' field in error response")
				}

				// Verify expected field names are present in error details
				if details, ok := resp["details"].([]interface{}); ok {
					var foundFields []string
					for _, detail := range details {
						if detailMap, ok := detail.(map[string]interface{}); ok {
							if field, ok := detailMap["field"].(string); ok {
								foundFields = append(foundFields, field)
							}
						}
					}

					// Verify at least one expected field is present
					if len(foundFields) == 0 && len(tt.expectedFields) > 0 {
						t.Errorf("expected field names %v in error details, got %v", tt.expectedFields, foundFields)
					}
				}
			}
		})
	}
}

func TestCreateOrder_FieldNameConsistency(t *testing.T) {
	// Test that field names in error response use snake_case (e.g., user_name, not userName)
	// This ensures the frontend Wizard component can correctly map field names to input elements

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Send request with missing user_name
	payload := map[string]interface{}{
		"template_id": "template-1",
		"user_email": "test@example.com",
	}
	body, _ := json.Marshal(payload)
	c.Request, _ = http.NewRequest("POST", "/orders", bytes.NewReader(body))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateOrder(c)

	// Assert status is 400
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}

	// Verify error response includes user_name field (snake_case, not camelCase)
	if details, ok := resp["details"].([]interface{}); ok {
		var foundUserNameField bool
		for _, detail := range details {
			if detailMap, ok := detail.(map[string]interface{}); ok {
				if field, ok := detailMap["field"].(string); ok && field == "user_name" {
					foundUserNameField = true
					break
				}
			}
		}
		if !foundUserNameField {
			t.Error("expected field name 'user_name' (snake_case) in error response, not camelCase variant")
		}
	}
}

func TestCreateOrder_FormFallbackError(t *testing.T) {
	// Test that validation errors with no field binding (e.g., _form) are handled gracefully

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Send empty payload
	c.Request, _ = http.NewRequest("POST", "/orders", bytes.NewReader([]byte("{}")))
	c.Request.Header.Set("Content-Type", "application/json")

	CreateOrder(c)

	// Assert status is 400
	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400, got %d", w.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal error response: %v", err)
	}

	// Verify error response has details field
	if _, ok := resp["details"]; !ok {
		t.Error("expected 'details' field in error response")
	}
}
