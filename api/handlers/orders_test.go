package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateOrder_ValidationError(t *testing.T) {
	// Setup Gin router
	router := gin.Default()
	router.POST("/api/orders", CreateOrder)

	tests := []struct {
		name           string
		request        OrderRequest
		expectedStatus int
		expectedFields []string
	}{
		{
			name: "missing template_id",
			request: OrderRequest{
				TemplateID: "",
				UserName:   "John Doe",
				UserEmail:  "john@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"template_id"},
		},
		{
			name: "missing user_name",
			request: OrderRequest{
				TemplateID: "template_1",
				UserName:   "",
				UserEmail:  "john@example.com",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"user_name"},
		},
		{
			name: "invalid user_email",
			request: OrderRequest{
				TemplateID: "template_1",
				UserName:   "John Doe",
				UserEmail:  "not-an-email",
			},
			expectedStatus: http.StatusBadRequest,
			expectedFields: []string{"user_email"},
		},
		{
			name: "valid request",
			request: OrderRequest{
				TemplateID: "template_1",
				UserName:   "John Doe",
				UserEmail:  "john@example.com",
			},
			expectedStatus: http.StatusCreated,
			expectedFields: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.request)
			req, _ := http.NewRequest("POST", "/api/orders", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			if tt.expectedStatus == http.StatusBadRequest {
				var errResp ErrorResponse
				json.Unmarshal(w.Body.Bytes(), &errResp)

				if errResp.Error == "" {
					t.Error("expected error message, got empty")
				}

				if len(errResp.Details) == 0 {
					t.Error("expected validation error details, got none")
				}

				// Verify expected fields are in the error details
				for _, expectedField := range tt.expectedFields {
					found := false
					for _, detail := range errResp.Details {
						if detail.Field == expectedField {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("expected field %s in error details, not found", expectedField)
					}
				}
			}

			if tt.expectedStatus == http.StatusCreated {
				var orderResp OrderResponse
				json.Unmarshal(w.Body.Bytes(), &orderResp)

				if orderResp.OrderID == "" {
					t.Error("expected order_id in response, got empty")
				}
				if orderResp.Status != "pending" {
					t.Errorf("expected status 'pending', got %s", orderResp.Status)
				}
			}
		})
	}
}
