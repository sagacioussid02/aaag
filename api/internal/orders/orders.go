package orders

import (
	"context"
	"regexp"
)

// Order represents a gift order in the system
type Order struct {
	ID            string
	CustomerID    string
	RecipientID   string
	CustomerEmail string
	RecipientEmail string
	TemplateID    string
	Status        string // TODO(medium, data): refactor to enum type (tracked in issue #42)
	CreatedAt     string
	UpdatedAt     string
}

// CreateOrderRequest represents the input for creating an order
type CreateOrderRequest struct {
	CustomerID     string `json:"customer_id" binding:"required"`
	RecipientID    string `json:"recipient_id" binding:"required"`
	CustomerEmail  string `json:"customer_email" binding:"required"`
	RecipientEmail string `json:"recipient_email" binding:"required"`
	TemplateID     string `json:"template_id" binding:"required"`
}

// OrderRepository defines the interface for order persistence
type OrderRepository interface {
	CreateOrder(ctx context.Context, order *Order) error
	UpdateOrderStatus(ctx context.Context, orderID string, status string) error
	ListOrders(ctx context.Context, customerID string) ([]*Order, error)
}

// OrderService handles order business logic
type OrderService struct {
	repo OrderRepository
}

// NewOrderService creates a new order service
func NewOrderService(repo OrderRepository) *OrderService {
	return &OrderService{repo: repo}
}

// CreateOrder creates a new order with self-gifting prevention
func (s *OrderService) CreateOrder(ctx context.Context, req *CreateOrderRequest) (*Order, error) {
	// Prevent self-gifting: customer and recipient must be different
	if req.CustomerID == req.RecipientID {
		return nil, ErrSelfGiftingNotAllowed
	}

	// Validate email addresses
	if !isValidEmail(req.CustomerEmail) {
		return nil, ErrInvalidCustomerEmail
	}
	if !isValidEmail(req.RecipientEmail) {
		return nil, ErrInvalidRecipientEmail
	}

	// Validate required fields
	if req.TemplateID == "" {
		return nil, ErrMissingTemplateID
	}

	order := &Order{
		CustomerID:     req.CustomerID,
		RecipientID:    req.RecipientID,
		CustomerEmail:  req.CustomerEmail,
		RecipientEmail: req.RecipientEmail,
		TemplateID:     req.TemplateID,
		Status:         "pending",
	}

	if err := s.repo.CreateOrder(ctx, order); err != nil {
		return nil, err
	}

	return order, nil
}

// UpdateOrderStatus updates the status of an order
func (s *OrderService) UpdateOrderStatus(ctx context.Context, orderID string, status string) error {
	return s.repo.UpdateOrderStatus(ctx, orderID, status)
}

// ListOrders lists all orders for a customer
func (s *OrderService) ListOrders(ctx context.Context, customerID string) ([]*Order, error) {
	return s.repo.ListOrders(ctx, customerID)
}

// isValidEmail validates an email address using a simple regex
func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	// Simple email validation regex
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	matched, _ := regexp.MatchString(pattern, email)
	return matched
}
