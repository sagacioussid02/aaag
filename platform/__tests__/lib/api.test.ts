import { submitOrder, OrderRequest } from '../../lib/api';

// Mock fetch globally
global.fetch = jest.fn();

describe('submitOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit a valid order and return success response', async () => {
    const mockResponse = {
      id: 'order-123',
      status: 'created',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.id).toBe('order-123');
    expect(result.status).toBe('created');
    expect(result.details).toBeUndefined();
  });

  it('should handle validation errors with field details', async () => {
    const mockErrorResponse = {
      message: 'Validation failed',
      details: [
        { field: 'user_name', message: 'user_name is required' },
      ],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => mockErrorResponse,
    });

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: '',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.status).toBe('error');
    expect(result.details).toHaveLength(1);
    expect(result.details?.[0].field).toBe('user_name');
    expect(result.message).toBe('Validation failed');
  });

  it('should handle non-JSON error response (e.g., HTML 500 error page)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.status).toBe('error');
    expect(result.details).toEqual([]);
    expect(result.message).toContain('Server error');
    expect(result.message).toContain('500');
  });

  it('should handle error response with missing details field', async () => {
    const mockErrorResponse = {
      message: 'Something went wrong',
      // No 'details' field
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => mockErrorResponse,
    });

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.status).toBe('error');
    expect(result.details).toEqual([]);
    expect(result.message).toBe('Something went wrong');
  });

  it('should handle network error (fetch throws)', async () => {
    const networkError = new Error('Network request failed');
    (global.fetch as jest.Mock).mockRejectedValueOnce(networkError);

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.status).toBe('error');
    expect(result.details).toEqual([]);
    expect(result.message).toContain('Failed to submit order');
    expect(result.message).toContain('Network request failed');
  });

  it('should handle network error with generic message when error is not an Error object', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce('Unknown error');

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    const result = await submitOrder(order);

    expect(result.status).toBe('error');
    expect(result.details).toEqual([]);
    expect(result.message).toContain('Failed to submit order');
    expect(result.message).toContain('Network error');
  });

  it('should use fallback API URL when NEXT_PUBLIC_API_URL is not set', async () => {
    const mockResponse = {
      id: 'order-123',
      status: 'created',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const order: OrderRequest = {
      template_id: 'template-1',
      user_name: 'John Doe',
      user_email: 'john@example.com',
    };

    await submitOrder(order);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.any(Object)
    );
  });
});
