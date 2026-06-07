package orders

import (
	"context"
	"errors"
	"testing"
	"time"
)

// MockRepository is a mock implementation of RepositoryInterface for testing.
type MockRepository struct {
	orders map[string]*Order
}

func NewMockRepository() *MockRepository {
	return &MockRepository{
		orders: make(map[string]*Order),
	}
}

func (m *MockRepository) CreateOrder(ctx context.Context, order *Order) error {
	if order.ID == "" {
		return errors.New("order id is required")
	}
	m.orders[order.ID] = order
	return nil
}

func (m *MockRepository) GetOrder(ctx context.Context, id string) (*Order, error) {
	if order, exists := m.orders[id]; exists {
		return order, nil
	}
	return nil, errors.New("order not found")
}

func (m *MockRepository) UpdateOrder(ctx context.Context, order *Order) error {
	if _, exists := m.orders[order.ID]; !exists {
		return errors.New("order not found")
	}
	m.orders[order.ID] = order
	return nil
}

func (m *MockRepository) ListOrders(ctx context.Context, customerEmail string) ([]*Order, error) {
	var result []*Order
	for _, order := range m.orders {
		if order.CustomerEmail == customerEmail {
			result = append(result, order)
		}
	}
	return result, nil
}

// TestCreateOrderSuccess tests successful order creation.
func TestCreateOrderSuccess(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	order, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1", "custom data")

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
}

// TestCreateOrderSelfGiftingPrevented tests that self-gifting is prevented.
// This is the fix for the TODO: customer and recipient must be different.
func TestCreateOrderSelfGiftingPrevented(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "same@example.com", "same@example.com", "template-1", "custom data")

	if err == nil {
		t.Fatal("expected error for self-gifting, got nil")
	}
	if err.Error() != "customer_email and recipient_email must be different" {
		t.Errorf("expected self-gifting error, got %v", err)
	}
}

// TestCreateOrderMissingCustomerEmail tests validation of required fields.
func TestCreateOrderMissingCustomerEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "", "recipient@example.com", "template-1", "custom data")

	if err == nil {
		t.Fatal("expected error for missing customer_email, got nil")
	}
}

// TestCreateOrderMissingRecipientEmail tests validation of required fields.
func TestCreateOrderMissingRecipientEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "", "template-1", "custom data")

	if err == nil {
		t.Fatal("expected error for missing recipient_email, got nil")
	}
}

// TestCreateOrderMissingTemplateID tests validation of required fields.
func TestCreateOrderMissingTemplateID(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "", "custom data")

	if err == nil {
		t.Fatal("expected error for missing template_id, got nil")
	}
}

// TestCreateOrderInvalidCustomerEmail tests email validation.
func TestCreateOrderInvalidCustomerEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "invalid-email", "recipient@example.com", "template-1", "custom data")

	if err == nil {
		t.Fatal("expected error for invalid customer_email, got nil")
	}
}

// TestCreateOrderInvalidRecipientEmail tests email validation.
func TestCreateOrderInvalidRecipientEmail(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	_, err := svc.CreateOrder(ctx, "customer@example.com", "invalid-email", "template-1", "custom data")

	if err == nil {
		t.Fatal("expected error for invalid recipient_email, got nil")
	}
}

// TestGetOrder tests order retrieval.
func TestGetOrder(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	created, _ := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1", "custom data")

	retrieved, err := svc.GetOrder(ctx, created.ID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if retrieved.ID != created.ID {
		t.Errorf("expected id %q, got %q", created.ID, retrieved.ID)
	}
}

// TestUpdateOrderStatus tests order status updates.
func TestUpdateOrderStatus(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	created, _ := svc.CreateOrder(ctx, "customer@example.com", "recipient@example.com", "template-1", "custom data")

	updated, err := svc.UpdateOrderStatus(ctx, created.ID, "completed")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if updated.Status != "completed" {
		t.Errorf("expected status 'completed', got %q", updated.Status)
	}
	if updated.UpdatedAt.Before(created.CreatedAt) {
		t.Error("expected UpdatedAt to be after CreatedAt")
	}
}

// TestListOrders tests listing orders by customer email.
func TestListOrders(t *testing.T) {
	repo := NewMockRepository()
	svc := NewOrderService(repo)

	ctx := context.Background()
	customerEmail := "customer@example.com"

	// Create multiple orders
	svc.CreateOrder(ctx, customerEmail, "recipient1@example.com", "template-1", "data1")
	svc.CreateOrder(ctx, customerEmail, "recipient2@example.com", "template-2", "data2")
	svc.CreateOrder(ctx, "other@example.com", "recipient3@example.com", "template-3", "data3")

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
