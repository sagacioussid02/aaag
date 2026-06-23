/**
 * API client for AaaG services.
 * Handles communication with Go API (orders, payments, app lifecycle).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface CreateOrderRequest {
  email: string;
  template_id: string;
  wizard_data: Record<string, unknown>; // User inputs from wizard steps
  recipient_name?: string;
  gift_message?: string;
}

export interface CreateOrderResponse {
  id: string;
  status: string;
  payment_url?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  field?: string; // For field-level validation errors
  status: number;
}

/**
 * Create an order via the Go API.
 * @param request Order creation request payload
 * @returns Order response with ID and status, or error
 */
export async function createOrder(
  request: CreateOrderRequest
): Promise<CreateOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      // Go API returned an error response
      throw new ApiError(
        data.error || data.message || 'Failed to create order',
        data.field,
        response.status
      );
    }

    return data as CreateOrderResponse;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Network or parsing error
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      undefined,
      0
    );
  }
}

/**
 * Custom error class for API errors.
 */
class ApiError extends Error implements ApiError {
  field?: string;
  status: number;

  constructor(message: string, field?: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.field = field;
    this.status = status;
  }
}

export { ApiError };
