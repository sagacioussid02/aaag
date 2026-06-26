import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WizardPage from './page';

// Mock the API module
jest.mock('../../lib/api', () => ({
  createOrder: jest.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public fields?: Record<string, string>) {
      super(message);
    }
  },
}));

const mockCreateOrder = require('../../lib/api').createOrder;

describe('WizardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render step 0 with template selection', () => {
    render(<WizardPage />);

    expect(screen.getByText(/select a template/i)).toBeInTheDocument();
  });

  it('should require template_id on step 0 before proceeding', async () => {
    render(<WizardPage />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please select a template/i)
      ).toBeInTheDocument();
    });
  });

  it('should allow proceeding to step 1 after selecting template', async () => {
    render(<WizardPage />);

    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);

    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });
  });

  it('should require email on step 2 before submission', async () => {
    render(<WizardPage />);

    // Navigate to step 2
    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('should clear error when user corrects input', async () => {
    render(<WizardPage />);

    // Navigate to step 2 and trigger email error
    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/email/i);
    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
    });

    // User corrects the email
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    await waitFor(() => {
      expect(
        screen.queryByText(/please enter a valid email/i)
      ).not.toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    mockCreateOrder.mockResolvedValueOnce({
      id: 'order-123',
      status: 'pending',
    });

    render(<WizardPage />);

    // Step 0: Select template
    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });

    // Step 1: Enter name
    const nameInput = screen.getByPlaceholderText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    // Step 2: Enter email and submit
    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          template_id: 'template-1',
          recipient_name: 'John Doe',
          email: 'john@example.com',
        })
      );
    });
  });

  it('should display field-specific error from API response', async () => {
    const ApiError = require('../../lib/api').ApiError;
    mockCreateOrder.mockRejectedValueOnce(
      new ApiError('Validation failed', { email: 'Email already exists' })
    );

    render(<WizardPage />);

    // Navigate to step 2
    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument();
    });
  });

  it('should reject invalid email format', async () => {
    render(<WizardPage />);

    // Navigate to step 2
    const templateOption = screen.getByRole('radio', { name: /template 1/i });
    fireEvent.click(templateOption);
    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/recipient name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/recipient name/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/email/i)).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email/i)
      ).toBeInTheDocument();
    });
  });
});
