package orders

import (
	"context"
	"errors"
	"testing"
	"time"
)

// MockRepository is a test double for RepositoryInterface
type MockRepository struct {
	orders map[string]*Order
	err    error
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		orders: make(map[string]*Order),
	}
}

func (m *MockRepository) CreateOrder(ctx context.Context, order *Order) error {
	if m.err != nil {
		return m.err
	}
	m.orders[order.ID] = order
	return nil
}

func (m *MockRepository) GetOrder(ctx context.Context, id string) (*Order, error) {
	if m.err != nil {
		return nil, m.err
	}
	order, ok := m.orders[id]
	if !ok {
		return nil, errors.New("order not found")
	}
	return order, nil
}

func (m *MockRepository) UpdateOrderStatus(ctx context.Context, id string, status string) error {
	if m.err != nil {
		return m.err
	}
	order, ok := m.orders[id]
	if !ok {
		return errors.New("order not found")
	}
	order.Status = status
	order.UpdatedAt = time.Now()
	return nil
}

func (m *MockRepository) ListOrders(ctx context.Context, customerEmail string) ([]*Order, error) {
	if m.err != nil {
		return nil, m.err
	}
	var result []*Order
	for _, order := range m.orders {
		if order.CustomerEmail == customerEmail {
			result = append(result, order)
		}
	}
	return result, nil
}

func TestCreateOrderSuccess(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	order, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if order == nil {
		t.Fatal("expected order, got nil")
	}
	if order.CustomerEmail != "customer@example.com" {
		t.Errorf("expected customer_email 'customer@example.com', got %q", order.CustomerEmail)
	}
	if order.RecipientEmail != "recipient@example.com" {
		t.Errorf("expected recipient_email 'recipient@example.com', got %q", order.RecipientEmail)
	}
	if order.Status != "pending" {
		t.Errorf("expected status 'pending', got %q", order.Status)
	}
	if order.ID == "" {
		t.Error("expected non-empty order ID")
	}
}

func TestCreateOrderSelfGiftingPrevented(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "same@example.com", "same@example.com", "template-1")

	if err == nil {
		t.Fatal("expected error for self-gifting, got nil")
	}
	if err.Error() != "customer and recipient must be different" {
		t.Errorf("expected 'customer and recipient must be different', got %q", err.Error())
	}
}

func TestCreateOrderSelfGiftingPreventedCaseInsensitive(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "Same@Example.com", "same@example.com", "template-1")

	if err == nil {
		t.Fatal("expected error for self-gifting (case-insensitive), got nil")
	}
}

func TestCreateOrderMissingCustomerEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "", "recipient@example.com", "template-1")

	if err == nil {
		t.Fatal("expected error for missing customer_email, got nil")
	}
	if err.Error() != "customer_email is required" {
		t.Errorf("expected 'customer_email is required', got %q", err.Error())
	}
}

func TestCreateOrderMissingRecipientEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "", "template-1")

	if err == nil {
		t.Fatal("expected error for missing recipient_email, got nil")
	}
	if err.Error() != "recipient_email is required" {
		t.Errorf("expected 'recipient_email is required', got %q", err.Error())
	}
}

func TestCreateOrderMissingTemplateID(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "")

	if err == nil {
		t.Fatal("expected error for missing template_id, got nil")
	}
	if err.Error() != "template_id is required" {
		t.Errorf("expected 'template_id is required', got %q", err.Error())
	}
}

func TestCreateOrderInvalidCustomerEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "not-an-email", "recipient@example.com", "template-1")

	if err == nil {
		t.Fatal("expected error for invalid customer_email, got nil")
	}
	if err.Error() != "invalid customer_email format" {
		t.Errorf("expected 'invalid customer_email format', got %q", err.Error())
	}
}

func TestCreateOrderInvalidRecipientEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "not-an-email", "template-1")

	if err == nil {
		t.Fatal("expected error for invalid recipient_email, got nil")
	}
	if err.Error() != "invalid recipient_email format" {
		t.Errorf("expected 'invalid recipient_email format', got %q", err.Error())
	}
}

func TestIsValidEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
		want  bool
	}{
		{"valid email", "user@example.com", true},
		{"valid email with dots", "user.name@example.co.uk", true},
		{"valid email with plus", "user+tag@example.com", true},
		{"valid email with numbers", "user123@example.com", true},
		{"invalid email no at", "userexample.com", false},
		{"invalid email no domain", "user@", false},
		{"invalid email no local", "@example.com", false},
		{"invalid email empty", "", false},
		{"invalid email whitespace", "   ", false},
		{"invalid email no tld", "user@example", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := isValidEmail(tt.email)
			if got != tt.want {
				t.Errorf("isValidEmail(%q) = %v, want %v", tt.email, got, tt.want)
			}
		})
	}
}

func TestGetOrder(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	order, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1")
	if err != nil {
		t.Fatalf("failed to create order: %v", err)
	}

	retrieved, err := svc.GetOrder(ctx, order.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if retrieved.ID != order.ID {
		t.Errorf("expected order ID %q, got %q", order.ID, retrieved.ID)
	}
}

func TestGetOrderMissingID(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.GetOrder(ctx, "")

	if err == nil {
		t.Fatal("expected error for missing order id, got nil")
	}
	if err.Error() != "order id is required" {
		t.Errorf("expected 'order id is required', got %q", err.Error())
	}
}

func TestUpdateOrderStatus(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	order, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1")
	if err != nil {
		t.Fatalf("failed to create order: %v", err)
	}

	err = svc.UpdateOrderStatus(ctx, order.ID, "completed")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	updated, err := svc.GetOrder(ctx, order.ID)
	if err != nil {
		t.Fatalf("failed to get order: %v", err)
	}
	if updated.Status != "completed" {
		t.Errorf("expected status 'completed', got %q", updated.Status)
	}
}

func TestUpdateOrderStatusMissingID(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	err := svc.UpdateOrderStatus(ctx, "", "completed")

	if err == nil {
		t.Fatal("expected error for missing order id, got nil")
	}
	if err.Error() != "order id is required" {
		t.Errorf("expected 'order id is required', got %q", err.Error())
	}
}

func TestUpdateOrderStatusMissingStatus(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	err := svc.UpdateOrderStatus(ctx, "order-123", "")

	if err == nil {
		t.Fatal("expected error for missing status, got nil")
	}
	if err.Error() != "status is required" {
		t.Errorf("expected 'status is required', got %q", err.Error())
	}
}

func TestListOrders(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	customerEmail := "customer@example.com"

	// Create multiple orders
	_, err := svc.CreateOrder(ctx, customerEmail, "recipient1@example.com", "template-1")
	if err != nil {
		t.Fatalf("failed to create first order: %v", err)
	}

	_, err = svc.CreateOrder(ctx, customerEmail, "recipient2@example.com", "template-2")
	if err != nil {
		t.Fatalf("failed to create second order: %v", err)
	}

	_, err = svc.CreateOrder(ctx, "other@example.com", "recipient3@example.com", "template-3")
	if err != nil {
		t.Fatalf("failed to create third order: %v", err)
	}

	orders, err := svc.ListOrders(ctx, customerEmail)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(orders) != 2 {
		t.Errorf("expected 2 orders, got %d", len(orders))
	}

	for _, order := range orders {
		if order.CustomerEmail != customerEmail {
			t.Errorf("expected customer_email %q, got %q", customerEmail, order.CustomerEmail)
		}
	}
}

func TestListOrdersMissingEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	_, err := svc.ListOrders(ctx, "")

	if err == nil {
		t.Fatal("expected error for missing customer_email, got nil")
	}
	if err.Error() != "customer_email is required" {
		t.Errorf("expected 'customer_email is required', got %q", err.Error())
	}
}

func TestListOrdersEmpty(t *testing.T) {
	repo := NewMockRepository()
	svc := NewService(repo)

	ctx := context.Background()
	orders, err := svc.ListOrders(ctx, "nonexistent@example.com")

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(orders) != 0 {
		t.Errorf("expected 0 orders, got %d", len(orders))
	}
}
