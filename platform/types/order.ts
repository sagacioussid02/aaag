/**
 * TypeScript types for order-related data structures.
 */

export interface WizardFormData {
  email: string;
  template_id: string;
  recipient_name?: string;
  gift_message?: string;
  [key: string]: unknown; // Allow additional wizard step inputs
}

export interface Order {
  id: string;
  user_email: string;
  template_id: string;
  status: 'pending' | 'payment_pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  payment_url?: string;
  app_url?: string;
}

export interface OrderError {
  message: string;
  field?: string; // Field name if validation error
  status: number;
}
