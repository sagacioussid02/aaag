const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface WizardRequest {
  recipient_name: string;
  occasion: string;
  theme: string;
  custom_message?: string;
}

export interface GeneratedAppResponse {
  title: string;
  description: string;
  code: string;
  gift_url?: string;
}

export async function generateMicroApp(request: WizardRequest): Promise<GeneratedAppResponse> {
  const response = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}
