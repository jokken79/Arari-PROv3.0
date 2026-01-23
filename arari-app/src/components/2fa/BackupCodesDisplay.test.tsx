/**
 * BackupCodesDisplay.test.tsx
 *
 * Comprehensive test suite for BackupCodesDisplay component.
 * Tests backup codes rendering, clipboard functionality, download functionality,
 * UI states, accessibility, and responsive grid layout.
 *
 * Component: BackupCodesDisplay.tsx
 * - Displays 10 backup codes in responsive grid (2-3 columns)
 * - Provides copy-to-clipboard functionality with visual feedback
 * - Provides download functionality to generate text file
 * - Shows security warnings about single-use nature
 * - Supports optional callback when codes are copied
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BackupCodesDisplay } from './BackupCodesDisplay';

describe('BackupCodesDisplay Component', () => {
  const mockBackupCodes = [
    'ABC123DEF456',
    'GHI789JKL012',
    'MNO345PQR678',
    'STU901VWX234',
    'YZA567BCD890',
    'EFG123HIJ456',
    'KLM789NOP012',
    'QRS345TUV678',
    'WXY901ZAB234',
    'CDE567FGH890',
  ];

  // Mock clipboard API
  Object.assign(navigator, {
    clipboard: {
      writeText: jest.fn(() => Promise.resolve()),
    },
  });

  // Mock document methods for download
  const mockCreateElement = jest.spyOn(document, 'createElement');
  const mockAppendChild = jest.spyOn(document.body, 'appendChild');
  const mockRemoveChild = jest.spyOn(document.body, 'removeChild');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Backup Codes Display', () => {
    it('should render all 10 backup codes', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      mockBackupCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('should display codes in grid layout', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass('grid');
    });

    it('should use 2 columns on mobile and 3 on medium screens', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-2', 'md:grid-cols-3');
    });

    it('should have appropriate spacing between codes', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-2');
    });

    it('should render each code in individual container with styling', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const codeContainers = container.querySelectorAll('.bg-gray-50');
      expect(codeContainers.length).toBeGreaterThanOrEqual(10);

      codeContainers.forEach(container => {
        expect(container).toHaveClass('p-2', 'rounded', 'text-center', 'font-bold');
      });
    });

    it('should display codes in monospace font', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const parentContainer = container.querySelector('.font-mono');
      expect(parentContainer).toBeInTheDocument();
      expect(parentContainer).toHaveClass('text-sm');
    });

    it('should have hover effect on code elements', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const codeContainers = container.querySelectorAll('.hover\\:bg-gray-100');
      expect(codeContainers.length).toBeGreaterThanOrEqual(10);
    });

    it('should display codes with wide letter spacing', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const spacedElements = container.querySelectorAll('.tracking-wider');
      expect(spacedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Copy to Clipboard Functionality', () => {
    it('should have copy to clipboard button', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy all codes to clipboard when button clicked', async () => {
      const user = userEvent.setup();
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        mockBackupCodes.join('\n')
      );
    });

    it('should call onCopyToClipboard callback when provided', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      render(
        <BackupCodesDisplay
          backupCodes={mockBackupCodes}
          onCopyToClipboard={mockCallback}
        />
      );

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not crash if onCopyToClipboard is not provided', async () => {
      const user = userEvent.setup();
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('should show "✓ Copied" badge after clicking copy', async () => {
      const user = userEvent.setup();
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Copied')).toBeInTheDocument();
      });
    });

    it('should display copy button with emoji icon', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      expect(copyButton.textContent).toContain('📋');
    });

    it('should have yellow styling on copy button', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      expect(copyButton).toHaveClass('bg-yellow-600', 'text-white');
    });

    it('should have hover effect on copy button', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      expect(copyButton).toHaveClass('hover:bg-yellow-700');
    });
  });

  describe('Copy Timeout and State Reset', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should reset copied state after 2 seconds', async () => {
      const user = userEvent.setup({ delay: null }); // Use fake timers
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      // Initially shows copied state
      await waitFor(() => {
        expect(screen.getByText('✓ Copied')).toBeInTheDocument();
      });

      // Fast-forward time
      jest.advanceTimersByTime(2000);

      // Should revert to original text
      await waitFor(() => {
        expect(screen.getByText(/📋 Copy to Clipboard/i)).toBeInTheDocument();
      });
    });

    it('should show copied state exactly before timeout', async () => {
      const user = userEvent.setup({ delay: null });
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      jest.advanceTimersByTime(1999);

      await waitFor(() => {
        expect(screen.getByText('✓ Copied')).toBeInTheDocument();
      });
    });
  });

  describe('Download Functionality', () => {
    it('should have download button', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      expect(downloadButton).toBeInTheDocument();
    });

    it('should display download button with emoji', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      expect(downloadButton.textContent).toContain('⬇️');
    });

    it('should have yellow styling on download button', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      expect(downloadButton).toHaveClass('bg-yellow-600', 'text-white');
    });

    it('should create and trigger download when download clicked', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      expect(mockElement.click).toHaveBeenCalled();
    });

    it('should set correct download filename', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      expect(mockElement.setAttribute).toHaveBeenCalledWith(
        'download',
        'backup-codes.txt'
      );
    });

    it('should include all codes in download file', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      const setAttributeCalls = mockElement.setAttribute.mock.calls;
      const hrefCall = setAttributeCalls.find((call: any[]) => call[0] === 'href');

      if (hrefCall) {
        const href = hrefCall[1];
        // Verify all codes are in the data URL
        mockBackupCodes.forEach(code => {
          expect(href).toContain(encodeURIComponent(code));
        });
      }
    });

    it('should include header in download file', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      const setAttributeCalls = mockElement.setAttribute.mock.calls;
      const hrefCall = setAttributeCalls.find((call: any[]) => call[0] === 'href');

      if (hrefCall) {
        const href = hrefCall[1];
        expect(href).toContain('ArariPRO%202FA%20Backup%20Codes');
      }
    });

    it('should include timestamp in download file', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      const setAttributeCalls = mockElement.setAttribute.mock.calls;
      const hrefCall = setAttributeCalls.find((call: any[]) => call[0] === 'href');

      if (hrefCall) {
        const href = hrefCall[1];
        expect(href).toContain('Generated%3A');
      }
    });

    it('should include security warning in download file', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      const setAttributeCalls = mockElement.setAttribute.mock.calls;
      const hrefCall = setAttributeCalls.find((call: any[]) => call[0] === 'href');

      if (hrefCall) {
        const href = hrefCall[1];
        expect(href).toContain('IMPORTANT');
      }
    });

    it('should create data URL with text/plain mime type', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      const setAttributeCalls = mockElement.setAttribute.mock.calls;
      const hrefCall = setAttributeCalls.find((call: any[]) => call[0] === 'href');

      if (hrefCall) {
        const href = hrefCall[1];
        expect(href).toContain('data:text/plain');
      }
    });

    it('should temporarily add and remove element from DOM', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const downloadButton = screen.getByText(/Download/i);
      await user.click(downloadButton);

      expect(mockAppendChild).toHaveBeenCalledWith(mockElement);
      expect(mockRemoveChild).toHaveBeenCalledWith(mockElement);
    });
  });

  describe('UI Layout and Styling', () => {
    it('should have yellow warning background', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const mainContainer = container.querySelector('.bg-yellow-50');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have yellow border', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const mainContainer = container.querySelector('.border-2.border-yellow-200');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const mainContainer = container.querySelector('.rounded-lg');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have adequate padding', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const mainContainer = container.querySelector('.p-6');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should display heading with emoji icon', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const heading = screen.getByText(/🔐 Backup Codes/i);
      expect(heading).toBeInTheDocument();
    });

    it('should have large styled heading', () => {
      const heading = screen.getByText(/🔐 Backup Codes/i);
      expect(heading).toHaveClass('text-lg', 'font-bold', 'text-yellow-900');
    });

    it('should display description text', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      expect(
        screen.getByText(/Save these codes in a secure location/i)
      ).toBeInTheDocument();
    });

    it('should have buttons side by side with gap', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const buttonContainer = container.querySelector('.flex.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('should have buttons that flex equally', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const buttons = container.querySelectorAll('.flex-1');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it('should have separator above warning section', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const separator = container.querySelector('.border-t.border-yellow-200');
      expect(separator).toBeInTheDocument();
    });

    it('should have padding above warning section', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const warningSection = container.querySelector('.pt-4');
      expect(warningSection).toBeInTheDocument();
    });
  });

  describe('Security Warnings', () => {
    it('should display warning about single-use codes', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      expect(
        screen.getByText(/Each backup code can only be used once/i)
      ).toBeInTheDocument();
    });

    it('should display warning with icon', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const warning = screen.getByText(/⚠️/);
      expect(warning).toBeInTheDocument();
    });

    it('should mark IMPORTANT text as strong', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const important = screen.getByText('IMPORTANT:');
      expect(important.tagName).toBe('STRONG');
    });

    it('should warn against sharing codes', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      expect(
        screen.getByText(/never share them with anyone/i)
      ).toBeInTheDocument();
    });

    it('should display security notice in small text', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const warningText = container.querySelector('.text-xs.text-yellow-800');
      expect(warningText).toBeInTheDocument();
    });

    it('should instruct to store codes securely', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      expect(screen.getByText(/Store them securely/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have clear heading hierarchy', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const heading = screen.getByText(/🔐 Backup Codes/i);
      expect(heading.tagName).toBe('H3');
    });

    it('should have descriptive button text', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      expect(screen.getByText(/Copy to Clipboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Download/i)).toBeInTheDocument();
    });

    it('should buttons have appropriate styling for distinction', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      const downloadButton = screen.getByText(/Download/i);

      expect(copyButton).toHaveClass('font-medium');
      expect(downloadButton).toHaveClass('font-medium');
    });

    it('should have proper text hierarchy for warning', () => {
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const importantText = screen.getByText('IMPORTANT:');
      expect(importantText.tagName).toBe('STRONG');
    });

    it('should have adequate text color contrast', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const textElements = container.querySelectorAll('[class*="text-yellow"]');
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('should provide clear state feedback for copy action', async () => {
      const user = userEvent.setup();
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(screen.getByText('✓ Copied')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Grid', () => {
    it('should render 2-column grid on small screens', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should render 3-column grid on medium screens and up', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const grid = container.querySelector('.md\\:grid-cols-3');
      expect(grid).toBeInTheDocument();
    });

    it('should maintain consistent gap in responsive layout', () => {
      const { container } = render(
        <BackupCodesDisplay backupCodes={mockBackupCodes} />
      );

      const grid = container.querySelector('.gap-2');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty backup codes array', () => {
      const { container } = render(<BackupCodesDisplay backupCodes={[]} />);

      const codeElements = container.querySelectorAll('.bg-gray-50');
      expect(codeElements.length).toBe(0);
    });

    it('should handle fewer than 10 codes', () => {
      const fewCodes = ['CODE1', 'CODE2', 'CODE3'];
      render(<BackupCodesDisplay backupCodes={fewCodes} />);

      fewCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('should handle more than 10 codes', () => {
      const manyCodes = Array.from({ length: 20 }, (_, i) => `CODE${i + 1}`);
      render(<BackupCodesDisplay backupCodes={manyCodes} />);

      manyCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('should handle codes with special characters', () => {
      const specialCodes = ['ABC-123-DEF', 'GHI@456@JKL'];
      render(<BackupCodesDisplay backupCodes={specialCodes} />);

      specialCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('should handle very long codes', () => {
      const longCodes = ['A'.repeat(50)];
      render(<BackupCodesDisplay backupCodes={longCodes} />);

      expect(screen.getByText('A'.repeat(50))).toBeInTheDocument();
    });

    it('should handle rapid copy clicks', async () => {
      const user = userEvent.setup();
      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);

      await user.click(copyButton);
      await user.click(copyButton);
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(3);
    });

    it('should handle copy and download in sequence', async () => {
      const user = userEvent.setup();
      const mockElement = {
        click: jest.fn(),
        setAttribute: jest.fn(),
        style: {},
      } as any;

      mockCreateElement.mockReturnValue(mockElement);

      render(<BackupCodesDisplay backupCodes={mockBackupCodes} />);

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      const downloadButton = screen.getByText(/Download/i);

      await user.click(copyButton);
      await user.click(downloadButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(mockElement.click).toHaveBeenCalled();
    });
  });

  describe('Callback Handling', () => {
    it('should call callback only once per click', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      render(
        <BackupCodesDisplay
          backupCodes={mockBackupCodes}
          onCopyToClipboard={mockCallback}
        />
      );

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should call callback after clipboard write completes', async () => {
      const user = userEvent.setup();
      const mockCallback = jest.fn();

      (navigator.clipboard.writeText as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <BackupCodesDisplay
          backupCodes={mockBackupCodes}
          onCopyToClipboard={mockCallback}
        />
      );

      const copyButton = screen.getByText(/Copy to Clipboard/i);
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
    });
  });
});
