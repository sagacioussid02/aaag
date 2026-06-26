import { CreateOrderRequest, CreateOrderResponse } from '@/types/order';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL environment variable is required. Please set it in your .env.local file.'
  );
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public fieldErrors?: Record<string, string>,
    message?: string
  ) {
    super(message || `API Error: ${statusCode}`);
    this.name = 'ApiError';
  }
}

export async function createOrder(
  data: CreateOrderRequest
): Promise<CreateOrderResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.fieldErrors,
        errorData.message || `Order creation failed with status ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(0, undefined, 'Request timeout. Please check your connection and try again.');
    }
    throw new ApiError(0, undefined, error instanceof Error ? error.message : 'Unknown error occurred');
  } finally {
    clearTimeout(timeoutId);
  }
}
