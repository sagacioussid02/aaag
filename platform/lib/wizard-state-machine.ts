/**
 * Wizard State Machine
 *
 * Defines the valid state transitions for the AaaG wizard.
 * Steps: landing → customization → review → submit → confirmation
 *
 * All transitions are guarded; invalid transitions throw an error.
 */

export type WizardStep = 'landing' | 'customization' | 'review' | 'submit' | 'confirmation';

export interface WizardState {
  currentStep: WizardStep;
  customizationData?: {
    appName: string;
    description: string;
    templateId: string;
  };
  reviewConfirmed?: boolean;
  orderId?: string;
}

export class WizardStateMachine {
  private state: WizardState;

  constructor(initialStep: WizardStep = 'landing') {
    this.state = { currentStep: initialStep };
  }

  /**
   * Get the current state.
   */
  getState(): WizardState {
    return { ...this.state };
  }

  /**
   * Check if a transition from current step to target step is valid.
   */
  canTransition(targetStep: WizardStep): boolean {
    const { currentStep } = this.state;

    // Define valid transitions
    const validTransitions: Record<WizardStep, WizardStep[]> = {
      landing: ['customization'],
      customization: ['review', 'landing'], // can go back to landing
      review: ['submit', 'customization'], // can go back to customization
      submit: ['confirmation'],
      confirmation: [], // terminal state
    };

    return validTransitions[currentStep]?.includes(targetStep) ?? false;
  }

  /**
   * Transition to the next step if valid.
   * Throws an error if the transition is invalid.
   */
  transitionTo(targetStep: WizardStep, data?: Partial<WizardState>): void {
    if (!this.canTransition(targetStep)) {
      throw new Error(
        `Invalid transition from ${this.state.currentStep} to ${targetStep}`
      );
    }

    // Validate required data for certain transitions
    if (targetStep === 'review' && !this.state.customizationData) {
      throw new Error('Customization data is required before proceeding to review');
    }

    if (targetStep === 'submit' && !this.state.reviewConfirmed) {
      throw new Error('Review must be confirmed before submitting');
    }

    // Update state
    this.state = {
      ...this.state,
      currentStep: targetStep,
      ...data,
    };
  }

  /**
   * Set customization data and validate it.
   */
  setCustomizationData(data: {
    appName: string;
    description: string;
    templateId: string;
  }): void {
    if (!data.appName || !data.description || !data.templateId) {
      throw new Error('All customization fields are required');
    }
    this.state.customizationData = data;
  }

  /**
   * Confirm the review step.
   */
  confirmReview(): void {
    if (this.state.currentStep !== 'review') {
      throw new Error('Review can only be confirmed from the review step');
    }
    this.state.reviewConfirmed = true;
  }

  /**
   * Set the order ID after successful submission.
   */
  setOrderId(orderId: string): void {
    this.state.orderId = orderId;
  }

  /**
   * Reset the state machine to the landing step.
   */
  reset(): void {
    this.state = { currentStep: 'landing' };
  }
}
