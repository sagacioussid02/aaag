export interface WizardFormData {
  template_id: string;
  recipient_name: string;
  email: string;
  gift_message: string;
  additionalData?: Record<string, unknown>;
}

export interface CreateOrderRequest {
  template_id: string;
  recipient_name: string;
  email: string;
  gift_message: string;
  wizard_data: Record<string, unknown>;
}

export interface CreateOrderResponse {
  id: string;
  status: string;
  created_at: string;
  template_id: string;
  recipient_name: string;
  email: string;
}
