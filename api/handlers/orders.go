package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type OrderRequest struct {
	TemplateID          string            `json:"template_id" binding:"required"`
	UserName            string            `json:"user_name" binding:"required"`
	UserEmail           string            `json:"user_email" binding:"required,email"`
	PersonalizationData map[string]string `json:"personalization_data"`
}

type OrderResponse struct {
	OrderID   string `json:"order_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type ErrorResponse struct {
	Error   string                    `json:"error"`
	Details []ValidationErrorDetail   `json:"details,omitempty"`
}

// CreateOrder handles POST /api/orders
func CreateOrder(c *gin.Context) {
	var req OrderRequest

	// Bind and validate request
	if err := c.ShouldBindJSON(&req); err != nil {
		// Parse binding errors and return structured validation errors
		details := parseValidationError(err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Details: details,
		})
		return
	}

	// Additional validation: template_id must be non-empty
	if strings.TrimSpace(req.TemplateID) == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Validation failed",
			Details: []ValidationErrorDetail{
				{
					Field:   "template_id",
					Message: "Template selection is required",
				},
			},
		})
		return
	}

	// TODO(medium, payment): validate payment method and process payment
	// Issue: #AAAG-003
	// Owner: senior_engineer
	// Deadline: Sprint 8

	// Create order response
	resp := OrderResponse{
		OrderID:   "order_" + generateID(),
		Status:    "pending",
		CreatedAt: getCurrentTimestamp(),
	}

	c.JSON(http.StatusCreated, resp)
}

// parseValidationError converts Gin binding errors to structured validation error details
func parseValidationError(err error) []ValidationErrorDetail {
	var details []ValidationErrorDetail

	errStr := err.Error()
	// Parse common validation error patterns
	if strings.Contains(errStr, "template_id") {
		details = append(details, ValidationErrorDetail{
			Field:   "template_id",
			Message: "Template selection is required",
		})
	}
	if strings.Contains(errStr, "user_name") {
		details = append(details, ValidationErrorDetail{
			Field:   "user_name",
			Message: "Your name is required",
		})
	}
	if strings.Contains(errStr, "user_email") {
		if strings.Contains(errStr, "email") {
			details = append(details, ValidationErrorDetail{
				Field:   "user_email",
				Message: "Please enter a valid email address",
			})
		} else {
			details = append(details, ValidationErrorDetail{
				Field:   "user_email",
				Message: "Your email is required",
			})
		}
	}

	// If no specific field errors were parsed, return a generic message
	if len(details) == 0 {
		details = append(details, ValidationErrorDetail{
			Field:   "_form",
			Message: "Please check your input and try again",
		})
	}

	return details
}

// Helper functions (stubs for demonstration)
func generateID() string {
	// TODO(low, infra): implement proper UUID generation
	return "abc123"
}

func getCurrentTimestamp() string {
	// TODO(low, infra): return actual current timestamp
	return "2024-01-01T00:00:00Z"
}
