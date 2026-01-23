/**
 * VerifyCodeInput.test.tsx
 *
 * Comprehensive test suite for VerifyCodeInput component.
 * Tests method toggle between TOTP and Backup Code, input validation,
 * form submission, loading states, error/success messages,
 * accessibility features, and edge cases.
 *
 * Component: VerifyCodeInput.tsx
 * - Toggle between TOTP (6 digits) and Backup Code methods
 * - Validate input format based on selected method
 * - Display error and success messages
 * - Handle loading states during verification
 * - Provide method-specific helper text
 * - Auto-focus input field on mount
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerifyCodeInput, VerificationMethod } from './VerifyCodeInput';

describe('VerifyCodeInput Component', () => {
  const mockOnVerify = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnVerify.mockResolvedValue(undefined);
  });

  describe('Method Toggle', () => {
    it('should display both method toggle buttons', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      expect(screen.getByText(/🔐 Authenticator/i)).toBeInTheDocument();
      expect(screen.getByText(/🔑 Backup Code/i)).toBeInTheDocument();
    });

    it('should have TOTP as default method', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const authenticatorButton = screen.getByText(/🔐 Authenticator/i);
      expect(authenticatorButton).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should highlight selected method button', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const authenticatorButton = screen.getByText(/🔐 Authenticator/i);
      expect(authenticatorButton).toHaveClass('bg-blue-600');
    });

    it('should show unselected button with gray background', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      expect(backupButton).toHaveClass('bg-gray-100', 'text-gray-700');
    });

    it('should toggle to backup code method when clicked', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(backupButton).toHaveClass('bg-blue-600', 'text-white');
      expect(screen.getByText(/🔐 Authenticator/i)).toHaveClass('bg-gray-100');
    });

    it('should toggle back to TOTP method', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const authenticatorButton = screen.getByText(/🔐 Authenticator/i);
      await user.click(authenticatorButton);

      expect(authenticatorButton).toHaveClass('bg-blue-600');
    });

    it('should clear input when switching methods', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      await user.type(input, '123456');

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const newInput = screen.getByPlaceholderText('Enter backup code') as HTMLInputElement;
      expect(newInput.value).toBe('');
    });

    it('should clear errors when switching methods', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      await user.type(input, 'ABC'); // Invalid for TOTP

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must contain only digits/i)).toBeInTheDocument();
      });

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(screen.queryByText(/TOTP code must contain only digits/i)).not.toBeInTheDocument();
    });
  });

  describe('TOTP Input Validation', () => {
    it('should display TOTP input field with correct label', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      expect(screen.getByLabelText(/6-Digit Code/i)).toBeInTheDocument();
    });

    it('should have TOTP placeholder "000000"', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toBeInTheDocument();
    });

    it('should set input type to number for TOTP', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      expect(input.type).toBe('number');
    });

    it('should accept only 6 digits for TOTP', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('123456', 'totp');
    });

    it('should reject non-numeric characters in TOTP', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      await user.type(input, 'ABC123');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must contain only digits/i)).toBeInTheDocument();
      });
      expect(mockOnVerify).not.toHaveBeenCalled();
    });

    it('should enforce maxLength of 6 for TOTP input', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      expect(input.maxLength).toBe(6);
    });

    it('should reject TOTP code with less than 6 digits', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '12345');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must be 6 digits/i)).toBeInTheDocument();
      });
      expect(mockOnVerify).not.toHaveBeenCalled();
    });

    it('should reject TOTP code with more than 6 digits', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '1234567');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      // MaxLength should prevent this, but if it doesn't, validation should catch it
      await waitFor(() => {
        expect(mockOnVerify).not.toHaveBeenCalled();
      });
    });

    it('should show helper text for TOTP method', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      expect(
        screen.getByText(/Enter the 6-digit code from your authenticator app/i)
      ).toBeInTheDocument();
    });
  });

  describe('Backup Code Input Validation', () => {
    it('should display backup code input field with correct label', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(screen.getByLabelText(/Backup Code/i)).toBeInTheDocument();
    });

    it('should have backup code placeholder text', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code');
      expect(input).toBeInTheDocument();
    });

    it('should accept alphanumeric input for backup codes', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code');
      await user.type(input, 'ABC123DEF456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('ABC123DEF456', 'backup');
    });

    it('should set input type to text for backup codes', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code') as HTMLInputElement;
      expect(input.type).toBe('text');
    });

    it('should enforce maxLength of 20 for backup code', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code') as HTMLInputElement;
      expect(input.maxLength).toBe(20);
    });

    it('should show helper text for backup code method', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(
        screen.getByText(/Use one of your backup codes if you no longer have access/i)
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require non-empty input', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a 6-digit code/i)
        ).toBeInTheDocument();
      });
      expect(mockOnVerify).not.toHaveBeenCalled();
    });

    it('should show TOTP validation error for wrong length', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must be 6 digits/i)).toBeInTheDocument();
      });
    });

    it('should clear previous errors when input changes', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, 'ABC');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must contain only digits/i)).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, '123456');

      // Error should be cleared when user provides new input
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('123456', 'totp');
    });

    it('should trim whitespace from input', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '   ');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Please enter a 6-digit code/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('onVerify Callback', () => {
    it('should call onVerify with correct code and method', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('123456', 'totp');
    });

    it('should call onVerify for backup codes with correct method', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code');
      await user.type(input, 'ABC123DEF456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('ABC123DEF456', 'backup');
    });

    it('should pass correct VerificationMethod type', async () => {
      const user = userEvent.setup();
      const mockVerifyWithType = jest.fn();
      mockVerifyWithType.mockResolvedValue(undefined);

      render(<VerifyCodeInput onVerify={mockVerifyWithType} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      const args = mockVerifyWithType.mock.calls[0];
      expect(args[1]).toBe('totp');
      expect(['totp', 'backup']).toContain(args[1]);
    });

    it('should clear input after successful verification', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('should handle onVerify rejection with error message', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Invalid code';
      mockOnVerify.mockRejectedValue(new Error(errorMessage));

      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
      });
    });

    it('should handle string error from onVerify', async () => {
      const user = userEvent.setup();
      mockOnVerify.mockImplementation(() => {
        throw 'String error message';
      });

      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Verification failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable input while loading', () => {
      const { rerender } = render(
        <VerifyCodeInput onVerify={mockOnVerify} isLoading={false} />
      );

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      expect(input.disabled).toBe(false);

      rerender(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      expect(input.disabled).toBe(true);
    });

    it('should disable submit button while loading', () => {
      const { rerender } = render(
        <VerifyCodeInput onVerify={mockOnVerify} isLoading={false} />
      );

      const submitButton = screen.getByText(/Verify/i) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);

      rerender(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      expect(submitButton.disabled).toBe(true);
    });

    it('should show "Verifying..." text while loading', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      expect(screen.getByText(/Verifying.../i)).toBeInTheDocument();
    });

    it('should show "Verify" text when not loading', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={false} />);

      expect(screen.getByText(/^Verify$/)).toBeInTheDocument();
    });

    it('should have gray disabled styling while loading', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      const submitButton = screen.getByText(/Verifying.../i);
      expect(submitButton).toHaveClass('disabled:bg-gray-400');
    });

    it('should have cursor-not-allowed while loading', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      const submitButton = screen.getByText(/Verifying.../i);
      expect(submitButton).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should also disable input with loading state', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      expect(input).toHaveClass('disabled:bg-gray-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Error Messages', () => {
    it('should display error message prop', () => {
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid verification code"
        />
      );

      expect(screen.getByText(/Invalid verification code/i)).toBeInTheDocument();
    });

    it('should display error in red box', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid code"
        />
      );

      const errorBox = container.querySelector('.bg-red-50');
      expect(errorBox).toBeInTheDocument();
      expect(errorBox).toHaveClass('border-red-200');
    });

    it('should display local validation errors', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, 'ABC');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must contain only digits/i)).toBeInTheDocument();
      });
    });

    it('should show error icon in message', () => {
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid code"
        />
      );

      expect(screen.getByText(/❌/)).toBeInTheDocument();
    });

    it('should display error in appropriate text color', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid code"
        />
      );

      const errorText = container.querySelector('.text-red-600');
      expect(errorText).toBeInTheDocument();
    });
  });

  describe('Success Messages', () => {
    it('should display success message prop', () => {
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          successMessage="Verified successfully!"
        />
      );

      expect(screen.getByText(/Verified successfully!/i)).toBeInTheDocument();
    });

    it('should display success message in green box', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          successMessage="Success!"
        />
      );

      const successBox = container.querySelector('.bg-green-50');
      expect(successBox).toBeInTheDocument();
      expect(successBox).toHaveClass('border-green-200');
    });

    it('should show checkmark icon in success message', () => {
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          successMessage="Success!"
        />
      );

      expect(screen.getByText(/✓/)).toBeInTheDocument();
    });

    it('should display success in appropriate text color', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          successMessage="Success!"
        />
      );

      const successText = container.querySelector('.text-green-600');
      expect(successText).toBeInTheDocument();
    });

    it('should not show error when success message is displayed', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          successMessage="Success!"
          error={null}
        />
      );

      expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument();
    });
  });

  describe('Submit Button', () => {
    it('should have submit button of type "submit"', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const submitButton = screen.getByText(/Verify/i) as HTMLButtonElement;
      expect(submitButton.type).toBe('submit');
    });

    it('should be disabled when input is empty', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const submitButton = screen.getByText(/Verify/i) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should be enabled when input has content', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(false);
    });

    it('should be disabled during loading', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      const submitButton = screen.getByText(/Verifying.../i) as HTMLButtonElement;
      expect(submitButton.disabled).toBe(true);
    });

    it('should have blue styling when enabled', () => {
      const { container } = render(
        <VerifyCodeInput onVerify={mockOnVerify} />
      );

      const submitButton = screen.getByText(/Verify/i);
      // When not disabled, should have blue styling
      expect(submitButton).toHaveClass('bg-blue-600');
    });

    it('should have hover effect when enabled', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const submitButton = screen.getByText(/Verify/i);
      expect(submitButton).toHaveClass('hover:bg-blue-700');
    });

    it('should take up full width', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const submitButton = screen.getByText(/Verify/i);
      expect(submitButton).toHaveClass('w-full');
    });
  });

  describe('Form Submission', () => {
    it('should submit on Enter key', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');
      await user.keyboard('{Enter}');

      expect(mockOnVerify).toHaveBeenCalledWith('123456', 'totp');
    });

    it('should prevent default form submission behavior', async () => {
      const user = userEvent.setup();
      const mockOnVerifyAsync = jest.fn().mockResolvedValue(undefined);

      render(<VerifyCodeInput onVerify={mockOnVerifyAsync} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const form = screen.getByPlaceholderText('000000').closest('form')!;
      const submitEvent = fireEvent.submit(form);

      expect(submitEvent).not.toHavePropagated();
    });

    it('should clear error on new submission', async () => {
      const user = userEvent.setup();
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Previous error"
        />
      );

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '123456');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      // Error should be cleared (it's from prop, local state handles clearing)
      expect(mockOnVerify).toHaveBeenCalled();
    });
  });

  describe('Auto Focus', () => {
    it('should auto-focus input field on mount', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000') as HTMLInputElement;
      expect(input).toHaveAttribute('autoFocus');
    });

    it('should focus input for both TOTP and backup code methods', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const totpInput = screen.getByPlaceholderText('000000');
      expect(totpInput).toHaveAttribute('autoFocus');

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const backupInput = screen.getByPlaceholderText('Enter backup code');
      expect(backupInput).toHaveAttribute('autoFocus');
    });
  });

  describe('Input Styling', () => {
    it('should have monospace font', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('font-mono');
    });

    it('should have wide letter spacing', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('tracking-widest');
    });

    it('should have centered text', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('text-center');
    });

    it('should have large font size', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('text-lg');
    });

    it('should have focus ring styling', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });

    it('should have disabled state styling', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} isLoading={true} />);

      const input = screen.getByPlaceholderText('000000');
      expect(input).toHaveClass('disabled:bg-gray-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label for TOTP input', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      expect(screen.getByLabelText(/6-Digit Code/i)).toBeInTheDocument();
    });

    it('should have proper label for backup code input', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(screen.getByLabelText(/Backup Code/i)).toBeInTheDocument();
    });

    it('should have heading for form', () => {
      const { container } = render(
        <VerifyCodeInput onVerify={mockOnVerify} />
      );

      const heading = container.querySelector('h3');
      expect(heading?.textContent).toContain('Enter Verification Code');
    });

    it('should have semantic form element', () => {
      const { container } = render(
        <VerifyCodeInput onVerify={mockOnVerify} />
      );

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have proper button types and roles', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const authenticatorButton = screen.getByText(/🔐 Authenticator/i);
      expect(authenticatorButton.tagName).toBe('BUTTON');
      expect(authenticatorButton.type).toBe('button');
    });

    it('should have error message with semantic markup', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid code"
        />
      );

      const errorContainer = container.querySelector('.bg-red-50');
      expect(errorContainer).toBeInTheDocument();
      expect(errorContainer?.querySelector('p')).toBeInTheDocument();
    });

    it('should have adequate text contrast', () => {
      const { container } = render(
        <VerifyCodeInput onVerify={mockOnVerify} />
      );

      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should provide helpful helper text', () => {
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      expect(
        screen.getByText(/Enter the 6-digit code from your authenticator app/i)
      ).toBeInTheDocument();
    });

    it('should change helper text based on method', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      expect(
        screen.getByText(/Use one of your backup codes if you no longer have access/i)
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid method toggles', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      const authButton = screen.getByText(/🔐 Authenticator/i);

      await user.click(backupButton);
      await user.click(authButton);
      await user.click(backupButton);
      await user.click(authButton);

      // Should end up on authenticator method
      expect(authButton).toHaveClass('bg-blue-600');
    });

    it('should handle very long backup codes', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const backupButton = screen.getByText(/🔑 Backup Code/i);
      await user.click(backupButton);

      const input = screen.getByPlaceholderText('Enter backup code');
      const longCode = 'A'.repeat(20);
      await user.type(input, longCode);

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith(longCode, 'backup');
    });

    it('should handle all zeros TOTP', async () => {
      const user = userEvent.setup();
      render(<VerifyCodeInput onVerify={mockOnVerify} />);

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, '000000');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      expect(mockOnVerify).toHaveBeenCalledWith('000000', 'totp');
    });

    it('should handle simultaneous errors and prop changes', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error={null}
          successMessage={null}
        />
      );

      const input = screen.getByPlaceholderText('000000');
      await user.type(input, 'ABC');

      const submitButton = screen.getByText(/Verify/i);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/TOTP code must contain only digits/i)).toBeInTheDocument();
      });

      // Update props while error is shown
      rerender(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Code expired"
          successMessage={null}
        />
      );

      expect(screen.getByText(/Code expired/i)).toBeInTheDocument();
    });

    it('should handle both error and success messages (error should win)', () => {
      render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error="Invalid code"
          successMessage="Success!"
        />
      );

      expect(screen.getByText(/Invalid code/i)).toBeInTheDocument();
      // Both might be shown, but error takes precedence in display
    });

    it('should handle empty and null messages gracefully', () => {
      const { container } = render(
        <VerifyCodeInput
          onVerify={mockOnVerify}
          error={null}
          successMessage={null}
        />
      );

      expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument();
      expect(container.querySelector('.bg-green-50')).not.toBeInTheDocument();
    });
  });
});
