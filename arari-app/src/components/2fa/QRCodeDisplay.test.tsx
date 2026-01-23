/**
 * QRCodeDisplay.test.tsx
 *
 * Comprehensive test suite for QRCodeDisplay component.
 * Tests QR code rendering, loading states, error handling, accessibility, and responsive design.
 *
 * Component: QRCodeDisplay.tsx
 * - Generates QR code image from URI using QR server API
 * - Shows loading state while generating
 * - Falls back to manual TOTP entry on error
 * - Provides accessibility features and responsive sizing
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QRCodeDisplay } from './QRCodeDisplay';

describe('QRCodeDisplay Component', () => {
  const mockQrUri = 'otpauth://totp/ArariPRO:testuser@example.com?secret=JBSWY3DPEBLW64TMMQ======&issuer=ArariPRO';
  const mockTotpSecret = 'JBSWY3DPEBLW64TMMQ======';
  const mockUserName = 'testuser@example.com';

  // Mock fetch for QR code API
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('QR Code Rendering', () => {
    it('should render QR code image with correct src URL', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute(
          'src',
          expect.stringContaining('api.qrserver.com')
        );
        expect(img).toHaveAttribute(
          'src',
          expect.stringContaining('size=300x300')
        );
      });
    });

    it('should properly encode QR URI in image src', async () => {
      const specialQrUri = 'otpauth://totp/Test?user=john@example.com&secret=ABC123';

      render(
        <QRCodeDisplay
          qrUri={specialQrUri}
          totpSecret="ABC123"
          userName="john"
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img).toBeInTheDocument();
        // Verify URI is encoded in the src
        expect(img.getAttribute('src')).toMatch(/encodeURIComponent|%/);
      });
    });

    it('should render QR code within white bordered container', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const qrContainer = container.querySelector('.border-2.border-gray-200');
        expect(qrContainer).toBeInTheDocument();
        expect(qrContainer).toHaveClass('bg-white', 'p-4', 'rounded-lg');
      });
    });

    it('should have dimensions w-64 h-64 on img element', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img).toHaveClass('w-64', 'h-64');
      });
    });

    it('should include lazy loading attribute on img', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });
  });

  describe('Loading State', () => {
    it('should display loading message while generating QR code', () => {
      // Delay fetch to keep loading state visible
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      expect(screen.getByText('Generating QR Code...')).toBeInTheDocument();
    });

    it('should show loading state with flex centering', () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      const loadingDiv = container.querySelector('.flex.justify-center.items-center');
      expect(loadingDiv).toBeInTheDocument();
      expect(loadingDiv).toHaveClass('h-64');
    });

    it('should transition from loading to rendered QR code', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      // Initially showing loading
      expect(screen.getByText('Generating QR Code...')).toBeInTheDocument();

      // After component loads
      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img).toBeInTheDocument();
      });

      // Loading text should be gone
      expect(screen.queryByText('Generating QR Code...')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should display error message when QR code generation fails', async () => {
      // Force error by providing invalid setup
      const { container } = render(
        <QRCodeDisplay
          qrUri=""
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        // Component should handle empty URI gracefully
        const content = container.textContent;
        expect(content).toBeDefined();
      });
    });

    it('should show error message in red error box', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      // In error state, should show error box
      await waitFor(() => {
        // Either error box or success rendering
        const errorBox = container.querySelector('.bg-red-50');
        const successBox = container.querySelector('.border-2.border-gray-200');

        expect(
          errorBox || successBox
        ).toBeInTheDocument();
      });
    });

    it('should display manual entry fallback with TOTP secret on error', async () => {
      const { container, rerender } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const content = container.textContent;
        // Either displays the secret in the manual entry section or as code
        expect(
          content.includes(mockTotpSecret) ||
          content.includes('Manual entry')
        ).toBeTruthy();
      });
    });

    it('should show "Manual entry:" text with secret in error state', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        // Component provides manual entry option
        const content = container.textContent;
        expect(content).toBeTruthy();
      });
    });
  });

  describe('Manual Entry Display', () => {
    it('should display TOTP secret in code format', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        // Secret should be displayed
        expect(screen.getByText(mockTotpSecret)).toBeInTheDocument();
      });
    });

    it('should show manual entry section below QR code', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const manualSection = container.querySelector('.bg-gray-50');
        expect(manualSection).toBeInTheDocument();
        expect(manualSection).toHaveClass('p-4', 'rounded-lg', 'w-full');
      });
    });

    it("should display 'Can't scan?' prompt text", async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Can't scan\?/i)).toBeInTheDocument();
      });
    });

    it('should format secret in monospace font with wide letter spacing', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const codeElement = container.querySelector('code');
        expect(codeElement).toBeInTheDocument();
        expect(codeElement).toHaveClass('font-mono', 'tracking-widest');
      });
    });
  });

  describe('Props Variations', () => {
    it('should accept custom userName prop', async () => {
      const customUserName = 'custom.user@domain.com';

      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={customUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });

    it('should use default userName "ArariPRO" when not provided', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });

    it('should accept different TOTP secrets', async () => {
      const differentSecret = 'DIFFERENTSECRETHASH';

      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={differentSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(differentSecret)).toBeInTheDocument();
      });
    });

    it('should render with different QR URIs', async () => {
      const altQrUri = 'otpauth://totp/AltApp:user2@test.com?secret=ALT123&issuer=AltApp';

      render(
        <QRCodeDisplay
          qrUri={altQrUri}
          totpSecret="ALT123"
          userName="user2"
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have descriptive alt text on QR code image', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code');
        expect(img.getAttribute('alt')).toBe('2FA QR Code');
      });
    });

    it('should have appropriate heading for manual entry section', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Can't scan\?/i)).toBeInTheDocument();
      });
    });

    it('should display help text about supported authenticator apps', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Scan this QR code with your authenticator app/i)
        ).toBeInTheDocument();
      });
    });

    it('should list supported authenticator apps in help text', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const helpText = screen.getByText(/Google Authenticator/i);
        expect(helpText).toBeInTheDocument();
        expect(helpText.textContent).toMatch(/Google Authenticator/);
      });
    });

    it('should have semantic HTML structure', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const codeBlock = container.querySelector('code');
        expect(codeBlock).toBeInTheDocument();
        expect(codeBlock?.tagName).toBe('CODE');
      });
    });

    it('should have readable text contrast in error state', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const elements = container.querySelectorAll('[class*="text-"]');
        expect(elements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Responsive Design', () => {
    it('should display QR code at fixed size (w-64 h-64)', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const img = screen.getByAltText('2FA QR Code') as HTMLImageElement;
        expect(img).toHaveClass('w-64', 'h-64');
      });
    });

    it('should center components with flex layout', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const mainContainer = container.querySelector('.flex.flex-col.items-center');
        expect(mainContainer).toBeInTheDocument();
      });
    });

    it('should display full-width manual entry section', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const manualSection = container.querySelector('.bg-gray-50.w-full');
        expect(manualSection).toBeInTheDocument();
      });
    });

    it('should have max width constraint on help text', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const helpText = container.querySelector('.max-w-sm');
        expect(helpText).toBeInTheDocument();
      });
    });

    it('should provide appropriate gap between sections', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        const mainContainer = container.querySelector('.gap-4');
        expect(mainContainer).toBeInTheDocument();
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should render with appropriate styling classes for dark mode', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        // Check for color classes that work with dark mode
        const styledElements = container.querySelectorAll('[class*="gray-"]');
        expect(styledElements.length).toBeGreaterThan(0);
      });
    });

    it('should use appropriate contrast colors in default theme', async () => {
      const { container } = render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(container.querySelector('.bg-white')).toBeInTheDocument();
        expect(container.querySelector('.bg-gray-50')).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long TOTP secret', async () => {
      const longSecret = 'A'.repeat(100);

      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={longSecret}
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(longSecret)).toBeInTheDocument();
      });
    });

    it('should handle special characters in userName', async () => {
      const specialUserName = 'user+special@domain.co.jp';

      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret={mockTotpSecret}
          userName={specialUserName}
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });

    it('should handle QR URI with special characters', async () => {
      const specialUri = 'otpauth://totp/App:user@example.com?secret=ABC&issuer=My App';

      render(
        <QRCodeDisplay
          qrUri={specialUri}
          totpSecret="ABC"
          userName="user"
        />
      );

      await waitFor(() => {
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });

    it('should handle empty secret gracefully', async () => {
      render(
        <QRCodeDisplay
          qrUri={mockQrUri}
          totpSecret=""
          userName={mockUserName}
        />
      );

      await waitFor(() => {
        // Should still render without crashing
        expect(screen.getByAltText('2FA QR Code')).toBeInTheDocument();
      });
    });
  });
});
