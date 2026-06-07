package orders

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Order represents a customer order for a micro-app gift.
type Order struct {
	ID              string    `json:"id"`
	CustomerEmail   string    `json:"customer_email"`
	RecipientEmail  string    `json:"recipient_email"`
	TemplateID      string    `json:"template_id"`
	Customization   string    `json:"customization"`
	Status          string    `json:"status"`
	StripePaymentID string    `json:"stripe_payment_id"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// OrderService handles order creation and lifecycle.
type OrderService struct {
	db RepositoryInterface
}

// RepositoryInterface defines the contract for order persistence.
type RepositoryInterface interface {
	CreateOrder(ctx context.Context, order *Order) error
	GetOrder(ctx context.Context, id string) (*Order, error)
	UpdateOrder(ctx context.Context, order *Order) error
	ListOrders(ctx context.Context, customerEmail string) ([]*Order, error)
}

// NewOrderService creates a new order service.
func NewOrderService(db RepositoryInterface) *OrderService {
	return &OrderService{db: db}
}

// CreateOrder validates and persists a new order.
// Returns an error if the order is invalid or persistence fails.
func (s *OrderService) CreateOrder(ctx context.Context, customerEmail, recipientEmail, templateID, customization string) (*Order, error) {
	// Validate required fields
	if customerEmail == "" {
		return nil, errors.New("customer_email is required")
	}
	if recipientEmail == "" {
		return nil, errors.New("recipient_email is required")
	}
	if templateID == "" {
		return nil, errors.New("template_id is required")
	}

	// Validate email format (basic check)
	if !isValidEmail(customerEmail) {
		return nil, errors.New("invalid customer_email format")
	}
	if !isValidEmail(recipientEmail) {
		return nil, errors.New("invalid recipient_email format")
	}

	// Prevent self-gifting: customer and recipient must be different
	// This was the unresolved TODO: ensure orders are not created with identical customer and recipient emails.
	if customerEmail == recipientEmail {
		return nil, errors.New("customer_email and recipient_email must be different")
	}

	now := time.Now().UTC()
	order := &Order{
		ID:             uuid.New().String(),
		CustomerEmail:  customerEmail,
		RecipientEmail: recipientEmail,
		TemplateID:     templateID,
		Customization:  customization,
		Status:         "pending",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.db.CreateOrder(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	return order, nil
}

// GetOrder retrieves an order by ID.
func (s *OrderService) GetOrder(ctx context.Context, id string) (*Order, error) {
	if id == "" {
		return nil, errors.New("order id is required")
	}
	return s.db.GetOrder(ctx, id)
}

// UpdateOrderStatus updates the status of an order.
func (s *OrderService) UpdateOrderStatus(ctx context.Context, id, status string) (*Order, error) {
	if id == "" {
		return nil, errors.New("order id is required")
	}
	if status == "" {
		return nil, errors.New("status is required")
	}

	order, err := s.db.GetOrder(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	order.Status = status
	order.UpdatedAt = time.Now().UTC()

	if err := s.db.UpdateOrder(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to update order: %w", err)
	}

	return order, nil
}

// ListOrders retrieves all orders for a customer.
func (s *OrderService) ListOrders(ctx context.Context, customerEmail string) ([]*Order, error) {
	if customerEmail == "" {
		return nil, errors.New("customer_email is required")
	}
	return s.db.ListOrders(ctx, customerEmail)
}

// isValidEmail performs a basic email validation.
func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	// Simple check: must contain @ and at least one dot after @
	hasAt := false
	hasDot := false
	for i, ch := range email {
		if ch == '@' {
			hasAt = true
		} else if ch == '.' && hasAt && i > 0 && i < len(email)-1 {
			hasDot = true
		}
	}
	return hasAt && hasDot
}
