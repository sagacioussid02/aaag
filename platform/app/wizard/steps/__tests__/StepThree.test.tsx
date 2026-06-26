import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StepThree from '../StepThree';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const TEMPLATES = [
  { id: 'template-1', name: 'Portfolio' },
  { id: 'template-2', name: 'Blog' },
];

const mockData = {
  templateId: 'template-1',
  name: 'John Doe',
  email: 'john@example.com',
  description: 'My app description',
};

describe('StepThree', () => {
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    mockFetch.mockClear();
    mockOnComplete.mockClear();
    mockOnError.mockClear();
  });

  it('should display order summary with all data', () => {
    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/my app description/i)).toBeInTheDocument();
    expect(screen.getByText(/portfolio/i)).toBeInTheDocument();
  });

  it('should submit order successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ orderId: 'order-123' }),
    });

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/orders', expect.any(Object));
      expect(mockOnComplete).toHaveBeenCalledWith({ orderId: 'order-123' });
    });
  });

  it('should handle validation error from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid email format' }),
    });

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid email format');
    });
  });

  it('should handle network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit order')
      );
    });
  });

  it('should handle server error (5xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.stringContaining('server error')
      );
    });
  });

  it('should disable submit button while submitting', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ orderId: 'order-123' }),
      }), 100))
    );

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should reset isSubmitting state on error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation error' }),
    });

    render(
      <StepThree
        data={mockData}
        templates={TEMPLATES}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});
