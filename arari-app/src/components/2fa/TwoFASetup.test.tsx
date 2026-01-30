import React from 'react'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TwoFASetup } from './TwoFASetup'

// Mock subcomponents
jest.mock('./QRCodeDisplay', () => ({
  QRCodeDisplay: () => <div data-testid="qr-code">QR Code Mock</div>,
}))
jest.mock('./BackupCodesDisplay', () => ({
  BackupCodesDisplay: () => <div data-testid="backup-codes">Backup Codes Mock</div>,
}))
jest.mock('./VerifyCodeInput', () => ({
  VerifyCodeInput: () => <div data-testid="verify-input">Verify Input Mock</div>,
}))

// Mock 2FA hooks with proper return values
jest.mock('@/hooks/use2FA', () => ({
  use2FASetup: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
  useVerify2FA: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}))

describe('TwoFASetup', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
  })

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <TwoFASetup />
      </QueryClientProvider>
    )

  it('renders start step', () => {
    renderComponent()
    expect(screen.getByText(/Enable/i)).toBeInTheDocument()
  })

  it('has start button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument()
  })

  it('shows required items for setup', () => {
    renderComponent()
    // Use getAllByText since there may be multiple matches
    expect(screen.getAllByText(/authenticator/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/backup/i).length).toBeGreaterThan(0)
  })
})
