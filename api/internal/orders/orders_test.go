package orders

import (
	"context"
	"errors"
	"testing"
)

// MockOrderRepository is a mock implementation of OrderRepository for testing
type MockOrderRepository struct {
	orders map[string]*Order
}

// NewMockOrderRepository creates a new mock repository
func NewMockOrderRepository() *MockOrderRepository {
	return &MockOrderRepository{
		orders: make(map[string]*Order),
	}
}

// CreateOrder stores an order in the mock repository
func (m *MockOrderRepository) CreateOrder(ctx context.Context, order *Order) error {
	if order.ID == "" {
		order.ID = "order_" + order.CustomerID + "_" + order.RecipientID
	}
	m.orders[order.ID] = order
	return nil
}

// UpdateOrderStatus updates an order's status
func (m *MockOrderRepository) UpdateOrderStatus(ctx context.Context, orderID string, status string) error {
	if order, exists := m.orders[orderID]; exists {
		order.Status = status
		return nil
	}
	return errors.New("order not found")
}

// ListOrders returns all orders for a customer
func (m *MockOrderRepository) ListOrders(ctx context.Context, customerID string) ([]*Order, error) {
	var result []*Order
	for _, order := range m.orders {
		if order.CustomerID == customerID {
			result = append(result, order)
		}
	}
	return result, nil
}

// Test errors
var (
	ErrSelfGiftingNotAllowed = errors.New("customer and recipient cannot be the same")
	ErrInvalidCustomerEmail  = errors.New("invalid customer email")
	ErrInvalidRecipientEmail = errors.New("invalid recipient email")
	ErrMissingTemplateID     = errors.New("template_id is required")
)

// TestCreateOrderSuccess tests successful order creation
func TestCreateOrderSuccess(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "recipient@example.com",
		TemplateID:     "template_1",
	}

	order, err := service.CreateOrder(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if order.CustomerID != req.CustomerID {
		t.Errorf("expected customer_id %s, got %s", req.CustomerID, order.CustomerID)
	}
	if order.Status != "pending" {
		t.Errorf("expected status 'pending', got %s", order.Status)
	}
}

// TestCreateOrderSelfGiftingPrevented tests that self-gifting is prevented
func TestCreateOrderSelfGiftingPrevented(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "cust_123", // Same as customer
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "customer@example.com",
		TemplateID:     "template_1",
	}

	_, err := service.CreateOrder(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for self-gifting, got nil")
	}
	if !errors.Is(err, ErrSelfGiftingNotAllowed) {
		t.Errorf("expected ErrSelfGiftingNotAllowed, got %v", err)
	}
}

// TestCreateOrderMissingCustomerEmail tests validation of missing customer email
func TestCreateOrderMissingCustomerEmail(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "", // Missing
		RecipientEmail: "recipient@example.com",
		TemplateID:     "template_1",
	}

	_, err := service.CreateOrder(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for missing customer email, got nil")
	}
}

// TestCreateOrderMissingRecipientEmail tests validation of missing recipient email
func TestCreateOrderMissingRecipientEmail(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "", // Missing
		TemplateID:     "template_1",
	}

	_, err := service.CreateOrder(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for missing recipient email, got nil")
	}
}

// TestCreateOrderMissingTemplateID tests validation of missing template_id
func TestCreateOrderMissingTemplateID(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "recipient@example.com",
		TemplateID:     "", // Missing
	}

	_, err := service.CreateOrder(context.Background(), req)
	if err == nil {
		t.Fatal("expected error for missing template_id, got nil")
	}
}

// TestIsValidEmailValidFormat tests email validation with valid format
func TestIsValidEmailValidFormat(t *testing.T) {
	tests := []struct {
		email string
		valid bool
	}{
		{"user@example.com", true},
		{"test.user@example.co.uk", true},
		{"user+tag@example.com", true},
		{"", false},
		{"invalid", false},
		{"invalid@", false},
		{"@example.com", false},
		{"user@.com", false},
	}

	for _, tt := range tests {
		t := tt // Capture for parallel safety
		t.Run(tt.email, func(t *testing.T) {
			result := isValidEmail(tt.email)
			if result != tt.valid {
				t.Errorf("isValidEmail(%q) = %v, want %v", tt.email, result, tt.valid)
			}
		})
	}
}

// TestUpdateOrderStatus tests updating an order's status
func TestUpdateOrderStatus(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	// Create an order first
	req := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "recipient@example.com",
		TemplateID:     "template_1",
	}

	order, _ := service.CreateOrder(context.Background(), req)

	// Update status
	err := service.UpdateOrderStatus(context.Background(), order.ID, "completed")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Verify status was updated
	updatedOrder := repo.orders[order.ID]
	if updatedOrder.Status != "completed" {
		t.Errorf("expected status 'completed', got %s", updatedOrder.Status)
	}
}

// TestListOrders tests listing orders for a customer
func TestListOrders(t *testing.T) {
	repo := NewMockOrderRepository()
	service := NewOrderService(repo)

	// Create multiple orders
	req1 := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_456",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "recipient@example.com",
		TemplateID:     "template_1",
	}

	req2 := &CreateOrderRequest{
		CustomerID:     "cust_123",
		RecipientID:    "recip_789",
		CustomerEmail:  "customer@example.com",
		RecipientEmail: "another@example.com",
		TemplateID:     "template_2",
	}

	req3 := &CreateOrderRequest{
		CustomerID:     "cust_999",
		RecipientID:    "recip_456",
		CustomerEmail:  "other@example.com",
		RecipientEmail: "recipient@example.com",
		TemplateID:     "template_1",
	}

	service.CreateOrder(context.Background(), req1)
	service.CreateOrder(context.Background(), req2)
	service.CreateOrder(context.Background(), req3)

	// List orders for cust_123
	orders, err := service.ListOrders(context.Background(), "cust_123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(orders) != 2 {
		t.Errorf("expected 2 orders, got %d", len(orders))
	}

	for _, order := range orders {
		if order.CustomerID != "cust_123" {
			t.Errorf("expected customer_id 'cust_123', got %s", order.CustomerID)
		}
	}
}
