package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSubmitOrder(t *testing.T) {
	tests := []struct {
		name           string
		request        OrderRequest
		expectedStatus int
		expectedError  string
		expectedFields []string
	}{
		{
			name: "valid order",
			request: OrderRequest{
				TemplateID:     "template-123",
				UserName:       "John Doe",
				UserEmail:      "john@example.com",
				RecipientName:  "Jane Doe",
				RecipientEmail: "jane@example.com",
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "missing user_name",
			request: OrderRequest{
				TemplateID:     "template-123",
				UserEmail:      "john@example.com",
				RecipientName:  "Jane Doe",
				RecipientEmail: "jane@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Validation failed",
			expectedFields: []string{"UserName"},
		},
		{
			name: "invalid user_email",
			request: OrderRequest{
				TemplateID:     "template-123",
				UserName:       "John Doe",
				UserEmail:      "not-an-email",
				RecipientName:  "Jane Doe",
				RecipientEmail: "jane@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Validation failed",
			expectedFields: []string{"UserEmail"},
		},
		{
			name: "missing template_id",
			request: OrderRequest{
				UserName:       "John Doe",
				UserEmail:      "john@example.com",
				RecipientName:  "Jane Doe",
				RecipientEmail: "jane@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Validation failed",
			expectedFields: []string{"TemplateID"},
		},
		{
			name: "multiple validation errors",
			request: OrderRequest{
				TemplateID:     "template-123",
				UserEmail:      "invalid-email",
				RecipientEmail: "also-invalid",
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Validation failed",
			expectedFields: []string{"UserName", "UserEmail", "RecipientName", "RecipientEmail"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)

			body, _ := json.Marshal(tt.request)
			c.Request, _ = http.NewRequest("POST", "/api/orders", bytes.NewBuffer(body))
			c.Request.Header.Set("Content-Type", "application/json")

			SubmitOrder(c)

			assert.Equal(t, tt.expectedStatus, w.Code, "HTTP status code mismatch")

			if tt.expectedStatus == http.StatusBadRequest {
				var errResp ErrorResponse
				err := json.Unmarshal(w.Body.Bytes(), &errResp)
				assert.NoError(t, err, "Failed to unmarshal error response")
				assert.Equal(t, tt.expectedError, errResp.Error)

				var foundFields []string
				for _, detail := range errResp.Details {
					foundFields = append(foundFields, detail.Field)
				}

				for _, expectedField := range tt.expectedFields {
					assert.Contains(t, foundFields, expectedField, "Expected field error not found")
				}
			} else if tt.expectedStatus == http.StatusOK {
				var orderResp OrderResponse
				err := json.Unmarshal(w.Body.Bytes(), &orderResp)
				assert.NoError(t, err, "Failed to unmarshal order response")
				assert.NotEmpty(t, orderResp.OrderID, "Order ID should not be empty")
				assert.Equal(t, "pending", orderResp.Status)
				assert.NotEmpty(t, orderResp.CreatedAt, "CreatedAt should not be empty")
			}
		})
	}
}
