const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface OrderRequest {
  template_id: string;
  user_name: string;
  user_email: string;
  [key: string]: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface OrderResponse {
  id: string;
  status: string;
  details?: ValidationError[];
  message?: string;
}

/**
 * Submit an order to the Go API.
 * Handles network errors, non-JSON responses, and validation errors gracefully.
 */
export async function submitOrder(order: OrderRequest): Promise<OrderResponse> {
  try {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    // If response is not ok, attempt to parse error details
    if (!response.ok) {
      let errorDetails: ValidationError[] = [];
      let errorMessage = `API error: ${response.status}`;

      try {
        const errorBody = await response.json();
        if (errorBody.details && Array.isArray(errorBody.details)) {
          errorDetails = errorBody.details;
        }
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch (parseError) {
        // If response body is not valid JSON (e.g., HTML error page),
        // fall back to generic error message
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }

      return {
        id: '',
        status: 'error',
        details: errorDetails,
        message: errorMessage,
      };
    }

    // Parse successful response
    const data = await response.json();
    return {
      id: data.id || '',
      status: data.status || 'success',
      details: data.details,
      message: data.message,
    };
  } catch (error) {
    // Network error or other fetch failure
    const errorMessage = error instanceof Error ? error.message : 'Network error';
    return {
      id: '',
      status: 'error',
      details: [],
      message: `Failed to submit order: ${errorMessage}`,
    };
  }
}
