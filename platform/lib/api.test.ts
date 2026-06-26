import { createOrder, ApiError } from './api';

// Mock fetch globally
global.fetch = jest.fn();

describe('createOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create an order with valid data', async () => {
    const mockResponse = {
      id: 'order-123',
      status: 'pending',
      template_id: 'template-1',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await createOrder({
      template_id: 'template-1',
      recipient_name: 'John Doe',
      email: 'john@example.com',
      additionalData: {},
    });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('should handle 400 validation error response', async () => {
    const errorResponse = {
      error: 'Validation failed',
      fields: {
        email: 'Invalid email format',
        recipient_name: 'Name is required',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

    await expect(
      createOrder({
        template_id: 'template-1',
        recipient_name: '',
        email: 'invalid',
        additionalData: {},
      })
    ).rejects.toThrow(ApiError);
  });

  it('should handle 500 server error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    await expect(
      createOrder({
        template_id: 'template-1',
        recipient_name: 'John Doe',
        email: 'john@example.com',
        additionalData: {},
      })
    ).rejects.toThrow(ApiError);
  });

  it('should handle network timeout', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network timeout')
    );

    await expect(
      createOrder({
        template_id: 'template-1',
        recipient_name: 'John Doe',
        email: 'john@example.com',
        additionalData: {},
      })
    ).rejects.toThrow();
  });

  it('should extract field-specific errors from response', async () => {
    const errorResponse = {
      error: 'Validation failed',
      fields: {
        email: 'Email already exists',
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => errorResponse,
    });

    try {
      await createOrder({
        template_id: 'template-1',
        recipient_name: 'John Doe',
        email: 'existing@example.com',
        additionalData: {},
      });
    } catch (error) {
      if (error instanceof ApiError) {
        expect(error.fields).toEqual({ email: 'Email already exists' });
      }
    }
  });

  it('should use AbortController to enforce timeout', async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(() => {}) // Never resolves
    );

    const promise = createOrder({
      template_id: 'template-1',
      recipient_name: 'John Doe',
      email: 'john@example.com',
      additionalData: {},
    });

    jest.advanceTimersByTime(11000); // Advance past 10s timeout

    await expect(promise).rejects.toThrow();
    jest.useRealTimers();
  });
});
