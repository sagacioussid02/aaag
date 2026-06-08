import { test, expect } from '@playwright/test';

test.describe('Wizard Happy Path', () => {
  test('should complete full wizard flow from landing to order submission', async ({ page }) => {
    // Navigate to landing page
    await page.goto('/');
    
    // Verify landing page is loaded
    await expect(page).toHaveTitle(/AaaG|Apps As A Gift/);
    
    // Click on "Get Started" or similar CTA button to enter wizard
    const ctaButton = page.locator('button:has-text("Get Started"), button:has-text("Start Now"), a:has-text("Get Started"), a:has-text("Start Now")');
    await expect(ctaButton).toBeVisible();
    await ctaButton.first().click();
    
    // Wait for wizard page to load
    await page.waitForURL(/.*wizard.*/);
    
    // Fill in customization form
    // Assuming form has basic fields like app name, description, etc.
    const appNameInput = page.locator('input[name="appName"], input[placeholder*="app name" i], input[placeholder*="name" i]').first();
    if (await appNameInput.isVisible()) {
      await appNameInput.fill('Test App');
    }
    
    const descriptionInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
    if (await descriptionInput.isVisible()) {
      await descriptionInput.fill('A test application for E2E validation');
    }
    
    // Click next/continue button to proceed through wizard steps
    let nextButton = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed")');
    while (await nextButton.isVisible()) {
      await nextButton.first().click();
      // Wait for next step to load
      await page.waitForTimeout(500);
      nextButton = page.locator('button:has-text("Next"), button:has-text("Continue"), button:has-text("Proceed")');
    }
    
    // Submit order
    const submitButton = page.locator('button:has-text("Submit"), button:has-text("Create"), button:has-text("Order"), button:has-text("Confirm")');
    await expect(submitButton).toBeVisible();
    await submitButton.first().click();
    
    // Verify success state
    // Wait for success page or confirmation message
    await page.waitForURL(/.*success.*|.*confirmation.*|.*dashboard.*/, { timeout: 10000 }).catch(() => {
      // If URL doesn't change, look for success message
    });
    
    // Check for success indicator (message, heading, or redirect)
    const successIndicator = page.locator(
      'text=/success|confirmation|order.*created|thank you/i, h1:has-text("Success"), h1:has-text("Confirmation")'
    );
    
    // Either success page loaded or success message is visible
    const isSuccessPage = page.url().includes('success') || page.url().includes('confirmation') || page.url().includes('dashboard');
    const isSuccessMessage = await successIndicator.isVisible().catch(() => false);
    
    expect(isSuccessPage || isSuccessMessage).toBeTruthy();
  });
});
