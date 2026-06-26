import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepTwo from '../StepTwo';

describe('StepTwo', () => {
  const mockOnComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
    mockOnError.mockClear();
  });

  it('should render all required input fields', () => {
    render(
      <StepTwo
        data={{}}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('should disable Continue button when required fields are empty', () => {
    render(
      <StepTwo
        data={{}}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('should enable Continue button when all required fields are filled', async () => {
    const user = userEvent.setup();
    render(
      <StepTwo
        data={{}}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(descriptionInput, 'My app description');

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('should display error message when Continue is clicked with empty fields', async () => {
    const user = userEvent.setup();
    render(
      <StepTwo
        data={{}}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'John Doe');

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.stringContaining('required')
    );
  });

  it('should call onComplete with form data when all fields are valid', async () => {
    const user = userEvent.setup();
    render(
      <StepTwo
        data={{}}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    await user.type(nameInput, 'John Doe');
    await user.type(emailInput, 'john@example.com');
    await user.type(descriptionInput, 'My app description');

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      description: 'My app description',
    });
  });

  it('should populate fields with existing data', async () => {
    const existingData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      description: 'Existing description',
    };

    render(
      <StepTwo
        data={existingData}
        onComplete={mockOnComplete}
        onError={mockOnError}
      />
    );

    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
  });
});
