const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface OrderRequest {
  template_id: string;
  user_name: string;
  user_email: string;
  recipient_name: string;
  recipient_email: string;
  [key: string]: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: ValidationError[];
  message?: string;
}

export interface SubmitOrderResponse {
  order_id: string;
  status: string;
  created_at: string;
}

export async function submitOrder(order: OrderRequest): Promise<SubmitOrderResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse;
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If response body is not JSON (e.g., 500 with HTML), create a generic error
        const error = new Error(`API error: ${response.status} ${response.statusText}`) as Error & { details?: ValidationError[] };
        error.details = undefined;
        throw error;
      }

      const error = new Error(errorData.error || errorData.message || 'API error') as Error & { details?: ValidationError[] };
      error.details = errorData.details;
      throw error;
    }

    const data = await response.json();
    return data as SubmitOrderResponse;
  } catch (error) {
    // Re-throw with proper error structure
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error occurred');
  }
}
