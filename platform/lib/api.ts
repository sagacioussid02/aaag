// API client for AaaG platform

export interface OrderRequest {
  template_id: string;
  user_name: string;
  user_email: string;
  personalization_data: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OrderResponse {
  order_id: string;
  status: string;
  created_at: string;
}

export interface ApiError {
  error: string;
  details?: ValidationError[];
}

/**
 * Submit an order to the Go API.
 * Returns the order response on success.
 * Throws an error with validation details on failure.
 */
export async function submitOrder(order: OrderRequest): Promise<OrderResponse> {
  const response = await fetch('http://localhost:8080/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(order),
  });

  if (!response.ok) {
    const errorData: ApiError = await response.json();
    const error = new Error(errorData.error) as Error & { details?: ValidationError[] };
    if (errorData.details) {
      error.details = errorData.details;
    }
    throw error;
  }

  return response.json();
}
