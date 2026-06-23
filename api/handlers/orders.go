package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

type OrderRequest struct {
	TemplateID    string `json:"template_id" binding:"required"`
	UserName      string `json:"user_name" binding:"required"`
	UserEmail     string `json:"user_email" binding:"required,email"`
	RecipientName string `json:"recipient_name" binding:"required"`
	RecipientEmail string `json:"recipient_email" binding:"required,email"`
}

type ValidationErrorDetail struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error   string                   `json:"error"`
	Details []ValidationErrorDetail `json:"details,omitempty"`
}

type OrderResponse struct {
	OrderID   string `json:"order_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

func generateID() string {
	return uuid.New().String()
}

func getCurrentTimestamp() string {
	return time.Now().UTC().Format(time.RFC3339)
}

func parseValidationError(err error) []ValidationErrorDetail {
	var details []ValidationErrorDetail

	if validationErrors, ok := err.(validator.ValidationErrors); ok {
		for _, fieldError := range validationErrors {
			var message string
			switch fieldError.Tag() {
			case "required":
				message = fmt.Sprintf("%s is required", fieldError.Field())
			case "email":
				message = fmt.Sprintf("%s must be a valid email", fieldError.Field())
			default:
				message = fmt.Sprintf("%s is invalid", fieldError.Field())
			}

			details = append(details, ValidationErrorDetail{
				Field:   fieldError.Field(),
				Message: message,
			})
		}
	} else {
		// Fallback for non-validator errors
		details = append(details, ValidationErrorDetail{
			Field:   "_form",
			Message: "Invalid request",
		})
	}

	return details
}

func SubmitOrder(c *gin.Context) {
	var req OrderRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		details := parseValidationError(err)
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error:   "Validation failed",
			Details: details,
		})
		return
	}

	// Generate order
	orderID := generateID()
	createdAt := getCurrentTimestamp()

	// TODO(medium, infra): persist order to database
	// For now, return success response

	c.JSON(http.StatusOK, OrderResponse{
		OrderID:   orderID,
		Status:    "pending",
		CreatedAt: createdAt,
	})
}
