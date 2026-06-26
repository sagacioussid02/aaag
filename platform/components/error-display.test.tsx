import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from './error-display';

describe('ErrorDisplay', () => {
  it('should render generic error message', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={{ message: 'Something went wrong' }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render field-specific error message', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={{
          message: 'Validation failed',
          fields: { email: 'Invalid email format' },
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Invalid email format')).toBeInTheDocument();
  });

  it('should render multiple field errors', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={{
          message: 'Validation failed',
          fields: {
            email: 'Invalid email',
            recipient_name: 'Name is required',
          },
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Invalid email')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={{ message: 'Error occurred' }}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should have alert role for accessibility', () => {
    const onDismiss = jest.fn();
    const { container } = render(
      <ErrorDisplay
        error={{ message: 'Error occurred' }}
        onDismiss={onDismiss}
      />
    );

    const alertElement = container.querySelector('[role="alert"]');
    expect(alertElement).toBeInTheDocument();
  });

  it('should not render when error is null', () => {
    const onDismiss = jest.fn();
    const { container } = render(
      <ErrorDisplay error={null} onDismiss={onDismiss} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should prioritize field-specific error over generic message', () => {
    const onDismiss = jest.fn();
    render(
      <ErrorDisplay
        error={{
          message: 'Generic error',
          fields: { email: 'Specific email error' },
        }}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Specific email error')).toBeInTheDocument();
    expect(screen.queryByText('Generic error')).not.toBeInTheDocument();
  });
});
