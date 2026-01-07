import { cn, formatYen, formatPercent, comparePeriods } from '@/lib/utils'

describe('Utils Functions', () => {
  describe('cn - className merge', () => {
    it('merges class names correctly', () => {
      const result = cn('foo', 'bar')
      expect(result).toContain('foo')
      expect(result).toContain('bar')
    })

    it('handles conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden')
      expect(result).toContain('base')
      expect(result).toContain('conditional')
      expect(result).not.toContain('hidden')
    })

    it('handles empty inputs', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })

  describe('formatYen', () => {
    it('formats positive numbers with yen symbol', () => {
      const result = formatYen(123456)
      expect(result).toContain('123,456')
      // Japanese yen can be either ¥ or ￥ depending on locale
      expect(result).toMatch(/[¥￥]/)
    })

    it('formats zero correctly', () => {
      const result = formatYen(0)
      expect(result).toContain('0')
    })

    it('formats negative numbers', () => {
      const result = formatYen(-50000)
      expect(result).toContain('50,000')
      expect(result).toContain('-')
    })

    it('handles decimal values', () => {
      const result = formatYen(12345.67)
      // Should round or truncate to whole yen
      expect(result).toMatch(/12,345|12,346/)
    })
  })

  describe('formatPercent', () => {
    it('formats percentage with symbol', () => {
      const result = formatPercent(15.5)
      expect(result).toContain('15.5')
      expect(result).toContain('%')
    })

    it('handles zero percent', () => {
      const result = formatPercent(0)
      expect(result).toContain('0')
      expect(result).toContain('%')
    })

    it('handles negative percentages', () => {
      const result = formatPercent(-5.2)
      expect(result).toContain('5.2')
      expect(result).toContain('-')
    })
  })

  describe('comparePeriods - Period Sorting', () => {
    it('sorts periods chronologically (ascending)', () => {
      const periods = ['2025年2月', '2025年10月', '2024年12月', '2025年1月']
      const sorted = [...periods].sort(comparePeriods)

      expect(sorted[0]).toBe('2024年12月')
      expect(sorted[1]).toBe('2025年1月')
      expect(sorted[2]).toBe('2025年2月')
      expect(sorted[3]).toBe('2025年10月')
    })

    it('handles same month different years', () => {
      const periods = ['2025年5月', '2024年5月', '2023年5月']
      const sorted = [...periods].sort(comparePeriods)

      expect(sorted[0]).toBe('2023年5月')
      expect(sorted[1]).toBe('2024年5月')
      expect(sorted[2]).toBe('2025年5月')
    })

    it('handles alphabetical edge case (10 vs 2)', () => {
      // This is the bug that was fixed - 10月 should come after 2月
      const periods = ['2025年10月', '2025年2月']
      const sorted = [...periods].sort(comparePeriods)

      expect(sorted[0]).toBe('2025年2月')
      expect(sorted[1]).toBe('2025年10月')
    })

    it('handles single digit months', () => {
      const periods = ['2025年9月', '2025年1月', '2025年5月']
      const sorted = [...periods].sort(comparePeriods)

      expect(sorted[0]).toBe('2025年1月')
      expect(sorted[1]).toBe('2025年5月')
      expect(sorted[2]).toBe('2025年9月')
    })
  })
})

describe('Margin Color Classification', () => {
  // Based on 製造派遣 standards from CLAUDE.md
  const getMarginColor = (margin: number): string => {
    if (margin >= 18) return 'emerald' // Excellent
    if (margin >= 15) return 'green'   // Target
    if (margin >= 12) return 'amber'   // Close
    if (margin >= 10) return 'orange'  // Improve
    return 'red'                        // Below standard
  }

  it('classifies excellent margins (≥18%)', () => {
    expect(getMarginColor(18)).toBe('emerald')
    expect(getMarginColor(20)).toBe('emerald')
    expect(getMarginColor(25)).toBe('emerald')
  })

  it('classifies target margins (15-18%)', () => {
    expect(getMarginColor(15)).toBe('green')
    expect(getMarginColor(16.5)).toBe('green')
    expect(getMarginColor(17.9)).toBe('green')
  })

  it('classifies close margins (12-15%)', () => {
    expect(getMarginColor(12)).toBe('amber')
    expect(getMarginColor(13)).toBe('amber')
    expect(getMarginColor(14.9)).toBe('amber')
  })

  it('classifies improve margins (10-12%)', () => {
    expect(getMarginColor(10)).toBe('orange')
    expect(getMarginColor(11)).toBe('orange')
    expect(getMarginColor(11.9)).toBe('orange')
  })

  it('classifies below standard margins (<10%)', () => {
    expect(getMarginColor(5)).toBe('red')
    expect(getMarginColor(9.9)).toBe('red')
    expect(getMarginColor(0)).toBe('red')
    expect(getMarginColor(-5)).toBe('red')
  })
})

describe('Billing Calculations', () => {
  // Test billing rate multipliers
  const calculateBilling = (
    workHours: number,
    overtimeHours: number,
    overtime60Plus: number,
    nightHours: number,
    holidayHours: number,
    billingRate: number
  ): number => {
    const base = workHours * billingRate
    const overtime = overtimeHours * billingRate * 1.25
    const overtime60 = overtime60Plus * billingRate * 1.5
    const night = nightHours * billingRate * 0.25 // Extra premium
    const holiday = holidayHours * billingRate * 1.35

    return base + overtime + overtime60 + night + holiday
  }

  it('calculates base hours correctly', () => {
    const result = calculateBilling(168, 0, 0, 0, 0, 1700)
    expect(result).toBe(285600) // 168 × 1700
  })

  it('calculates overtime ≤60h at 1.25×', () => {
    const result = calculateBilling(168, 40, 0, 0, 0, 1700)
    // Base: 285,600 + OT: 40 × 1700 × 1.25 = 85,000
    expect(result).toBe(370600)
  })

  it('calculates overtime >60h at 1.5×', () => {
    const result = calculateBilling(168, 60, 13, 0, 0, 1700)
    // Base: 285,600 + OT≤60: 127,500 + OT>60: 33,150
    expect(result).toBe(446250)
  })

  it('calculates night premium at 0.25× extra', () => {
    const result = calculateBilling(168, 0, 0, 20, 0, 1700)
    // Base: 285,600 + Night: 20 × 1700 × 0.25 = 8,500
    expect(result).toBe(294100)
  })

  it('calculates holiday at 1.35×', () => {
    const result = calculateBilling(160, 0, 0, 0, 16, 1700)
    // Base: 272,000 + Holiday: 16 × 1700 × 1.35 = 36,720
    expect(result).toBe(308720)
  })
})

describe('Company Cost Calculations', () => {
  // Test insurance rates for 2025
  const calculateCompanyCost = (
    grossSalary: number,
    socialInsurance: number,
    welfarePension: number
  ) => {
    const companySocialInsurance = socialInsurance + welfarePension // 労使折半
    const employmentInsurance = grossSalary * 0.009 // 0.90% for 2025
    const workersComp = grossSalary * 0.003 // 0.30% manufacturing

    return {
      companySocialInsurance,
      employmentInsurance,
      workersComp,
      totalCost: grossSalary + companySocialInsurance + employmentInsurance + workersComp,
    }
  }

  it('calculates company social insurance as equal to employee', () => {
    const result = calculateCompanyCost(300000, 18000, 35000)
    expect(result.companySocialInsurance).toBe(53000) // 18000 + 35000
  })

  it('calculates employment insurance at 0.90%', () => {
    const result = calculateCompanyCost(300000, 18000, 35000)
    expect(result.employmentInsurance).toBe(2700) // 300000 × 0.009
  })

  it('calculates workers comp at 0.30%', () => {
    const result = calculateCompanyCost(300000, 18000, 35000)
    expect(result.workersComp).toBe(900) // 300000 × 0.003
  })

  it('calculates total company cost correctly', () => {
    const result = calculateCompanyCost(300000, 18000, 35000)
    // 300000 + 53000 + 2700 + 900 = 356,600
    expect(result.totalCost).toBe(356600)
  })
})
