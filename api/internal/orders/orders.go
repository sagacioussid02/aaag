package orders

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Order represents a gift order in the system
type Order struct {
	ID            string    `json:"id"`
	CustomerEmail string    `json:"customer_email"`
	RecipientEmail string   `json:"recipient_email"`
	TemplateID    string    `json:"template_id"`
	Status        string    `json:"status"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// RepositoryInterface defines the contract for order persistence
type RepositoryInterface interface {
	CreateOrder(ctx context.Context, order *Order) error
	GetOrder(ctx context.Context, id string) (*Order, error)
	UpdateOrderStatus(ctx context.Context, id string, status string) error
	ListOrders(ctx context.Context, customerEmail string) ([]*Order, error)
}

// Service handles order business logic
type Service struct {
	repo RepositoryInterface
}

// NewService creates a new order service
func NewService(repo RepositoryInterface) *Service {
	return &Service{repo: repo}
}

// CreateOrder creates a new order with validation
// Prevent self-gifting: customer and recipient must be different
// This was the unresolved TODO: ensure orders are not created with identical customer and recipient emails.
func (s *Service) CreateOrder(ctx context.Context, customerEmail, recipientEmail, templateID string) (*Order, error) {
	// Validate required fields
	if strings.TrimSpace(customerEmail) == "" {
		return nil, fmt.Errorf("customer_email is required")
	}
	if strings.TrimSpace(recipientEmail) == "" {
		return nil, fmt.Errorf("recipient_email is required")
	}
	if strings.TrimSpace(templateID) == "" {
		return nil, fmt.Errorf("template_id is required")
	}

	// Validate email formats
	if !isValidEmail(customerEmail) {
		return nil, fmt.Errorf("invalid customer_email format")
	}
	if !isValidEmail(recipientEmail) {
		return nil, fmt.Errorf("invalid recipient_email format")
	}

	// Prevent self-gifting: customer and recipient must be different
	if strings.EqualFold(customerEmail, recipientEmail) {
		return nil, fmt.Errorf("customer and recipient must be different")
	}

	now := time.Now()
	order := &Order{
		ID:             uuid.New().String(),
		CustomerEmail:  customerEmail,
		RecipientEmail: recipientEmail,
		TemplateID:     templateID,
		Status:         "pending",
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	if err := s.repo.CreateOrder(ctx, order); err != nil {
		return nil, fmt.Errorf("failed to create order: %w", err)
	}

	return order, nil
}

// GetOrder retrieves an order by ID
func (s *Service) GetOrder(ctx context.Context, id string) (*Order, error) {
	if strings.TrimSpace(id) == "" {
		return nil, fmt.Errorf("order id is required")
	}

	order, err := s.repo.GetOrder(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get order: %w", err)
	}

	return order, nil
}

// UpdateOrderStatus updates the status of an order
func (s *Service) UpdateOrderStatus(ctx context.Context, id string, status string) error {
	if strings.TrimSpace(id) == "" {
		return fmt.Errorf("order id is required")
	}
	if strings.TrimSpace(status) == "" {
		return fmt.Errorf("status is required")
	}

	if err := s.repo.UpdateOrderStatus(ctx, id, status); err != nil {
		return fmt.Errorf("failed to update order status: %w", err)
	}

	return nil
}

// ListOrders retrieves all orders for a customer
func (s *Service) ListOrders(ctx context.Context, customerEmail string) ([]*Order, error) {
	if strings.TrimSpace(customerEmail) == "" {
		return nil, fmt.Errorf("customer_email is required")
	}

	orders, err := s.repo.ListOrders(ctx, customerEmail)
	if err != nil {
		return nil, fmt.Errorf("failed to list orders: %w", err)
	}

	return orders, nil
}

// isValidEmail performs a basic email validation
func isValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	if email == "" {
		return false
	}

	// Basic email regex pattern
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	re := regexp.MustCompile(pattern)
	return re.MatchString(email)
}
