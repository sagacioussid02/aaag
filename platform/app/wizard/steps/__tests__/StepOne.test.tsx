import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StepOne from '../StepOne';

const TEMPLATES = [
  { id: 'template-1', name: 'Portfolio' },
  { id: 'template-2', name: 'Blog' },
  { id: 'template-3', name: 'E-commerce' },
];

describe('StepOne', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    mockOnComplete.mockClear();
  });

  it('should render template selection options', () => {
    render(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate={null}
        onComplete={mockOnComplete}
      />
    );

    TEMPLATES.forEach((template) => {
      expect(screen.getByText(template.name)).toBeInTheDocument();
    });
  });

  it('should disable Continue button when no template is selected', () => {
    render(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate={null}
        onComplete={mockOnComplete}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('should enable Continue button when a template is selected', () => {
    render(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate="template-1"
        onComplete={mockOnComplete}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('should call onComplete with selected template when Continue is clicked', () => {
    render(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate="template-1"
        onComplete={mockOnComplete}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalledWith({
      templateId: 'template-1',
    });
  });

  it('should update selected template when user clicks a different template', () => {
    const { rerender } = render(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate="template-1"
        onComplete={mockOnComplete}
      />
    );

    const template2Button = screen.getByRole('button', { name: /blog/i });
    fireEvent.click(template2Button);

    rerender(
      <StepOne
        templates={TEMPLATES}
        selectedTemplate="template-2"
        onComplete={mockOnComplete}
      />
    );

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(mockOnComplete).toHaveBeenCalledWith({
      templateId: 'template-2',
    });
  });
});
