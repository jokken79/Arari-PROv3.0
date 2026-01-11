"""
Japanese Number Formatting - 日本語数字フォーマット
Converts numbers to Japanese format with 万 (man), 億 (oku), 兆 (cho)

Examples:
  870,000 → 87万円
  1,234,567 → 123万4,567円
  100,000,000 → 1億円
  1,234,567,890 → 12億3,456万7,890円
"""

from typing import Optional


def format_japanese_yen(
    value: Optional[float],
    short: bool = False,
    include_yen: bool = True
) -> str:
    """
    Format number as Japanese Yen with 万/億 notation.

    Args:
        value: The amount to format
        short: If True, abbreviate (87万 instead of 87万0,000円)
        include_yen: If True, add 円 suffix

    Returns:
        Formatted string like "87万円" or "1億2,345万円"

    Examples:
        >>> format_japanese_yen(870000)
        '87万円'
        >>> format_japanese_yen(123456789)
        '1億2,345万6,789円'
        >>> format_japanese_yen(870000, short=True)
        '87万'
        >>> format_japanese_yen(-50000)
        '-5万円'
    """
    if value is None:
        return "0円" if include_yen else "0"

    # Handle negative numbers
    is_negative = value < 0
    value = abs(value)

    # Round to nearest integer for yen
    value = int(round(value))

    suffix = "円" if include_yen else ""
    prefix = "-" if is_negative else ""

    # 兆 (cho) = trillion = 1,000,000,000,000
    cho = value // 1_000_000_000_000
    remainder_after_cho = value % 1_000_000_000_000

    # 億 (oku) = 100 million = 100,000,000
    oku = remainder_after_cho // 100_000_000
    remainder_after_oku = remainder_after_cho % 100_000_000

    # 万 (man) = 10,000
    man = remainder_after_oku // 10_000
    remainder = remainder_after_oku % 10_000

    parts = []

    if cho > 0:
        parts.append(f"{cho:,}兆")

    if oku > 0:
        parts.append(f"{oku:,}億")

    if man > 0:
        parts.append(f"{man:,}万")

    # Handle remainder
    if short:
        # Short format: only show major units
        if not parts:
            # Less than 10,000 yen
            return f"{prefix}{value:,}{suffix}"
        return f"{prefix}{''.join(parts)}{suffix}"
    else:
        # Full format: include remainder
        if remainder > 0:
            parts.append(f"{remainder:,}")
        elif not parts:
            # Value is exactly 0
            return f"0{suffix}"

        return f"{prefix}{''.join(parts)}{suffix}"


def format_japanese_yen_short(value: Optional[float]) -> str:
    """
    Short format for display in charts/tables.

    Examples:
        >>> format_japanese_yen_short(870000)
        '87万'
        >>> format_japanese_yen_short(123456789)
        '1.2億'
        >>> format_japanese_yen_short(5000)
        '5千'
    """
    if value is None:
        return "0"

    is_negative = value < 0
    value = abs(value)
    prefix = "-" if is_negative else ""

    # 億 (100 million)
    if value >= 100_000_000:
        return f"{prefix}{value / 100_000_000:.1f}億"

    # 万 (10,000)
    if value >= 10_000:
        return f"{prefix}{value / 10_000:.0f}万"

    # 千 (1,000)
    if value >= 1_000:
        return f"{prefix}{value / 1_000:.0f}千"

    return f"{prefix}{int(value)}"


def format_japanese_hours(hours: Optional[float]) -> str:
    """
    Format hours in Japanese style.

    Examples:
        >>> format_japanese_hours(168.5)
        '168.5時間'
        >>> format_japanese_hours(40)
        '40時間'
    """
    if hours is None:
        return "0時間"

    if hours == int(hours):
        return f"{int(hours)}時間"
    return f"{hours:.1f}時間"


def format_japanese_percentage(value: Optional[float], decimals: int = 1) -> str:
    """
    Format percentage in Japanese style.

    Examples:
        >>> format_japanese_percentage(12.5)
        '12.5%'
        >>> format_japanese_percentage(15.0)
        '15%'
    """
    if value is None:
        return "0%"

    if value == int(value):
        return f"{int(value)}%"
    return f"{value:.{decimals}f}%"


def format_japanese_count(value: Optional[int], unit: str = "名") -> str:
    """
    Format count with Japanese counter.

    Args:
        value: The count
        unit: Counter word (名 for people, 社 for companies, 件 for items)

    Examples:
        >>> format_japanese_count(15, "名")
        '15名'
        >>> format_japanese_count(3, "社")
        '3社'
    """
    if value is None:
        return f"0{unit}"
    return f"{value:,}{unit}"


def format_japanese_date(year: int, month: int) -> str:
    """
    Format date in Japanese style (和暦 or 西暦).

    Examples:
        >>> format_japanese_date(2025, 1)
        '2025年1月'
    """
    return f"{year}年{month}月"


# Margin tier descriptions in Japanese
MARGIN_TIERS_JP = {
    "excellent": {"label": "優良", "color": "emerald", "threshold": 12},
    "good": {"label": "良好", "color": "green", "threshold": 10},
    "warning": {"label": "要改善", "color": "orange", "threshold": 7},
    "critical": {"label": "危険", "color": "red", "threshold": 0},
}


def get_margin_tier_jp(margin: float) -> dict:
    """
    Get margin tier info in Japanese.

    Examples:
        >>> get_margin_tier_jp(15.0)
        {'label': '優良', 'color': 'emerald', 'tier': 'excellent'}
        >>> get_margin_tier_jp(5.0)
        {'label': '危険', 'color': 'red', 'tier': 'critical'}
    """
    if margin >= 12:
        tier = "excellent"
    elif margin >= 10:
        tier = "good"
    elif margin >= 7:
        tier = "warning"
    else:
        tier = "critical"

    info = MARGIN_TIERS_JP[tier].copy()
    info["tier"] = tier
    return info


# Export aliases for convenience
万 = 10_000
億 = 100_000_000
兆 = 1_000_000_000_000


if __name__ == "__main__":
    # Test examples
    test_values = [
        0,
        500,
        5_000,
        50_000,
        500_000,
        870_000,
        1_234_567,
        10_000_000,
        100_000_000,
        123_456_789,
        1_234_567_890,
        12_345_678_901_234,
        -870_000,
    ]

    print("Japanese Number Formatting Examples:")
    print("=" * 60)

    for val in test_values:
        full = format_japanese_yen(val)
        short = format_japanese_yen(val, short=True)
        very_short = format_japanese_yen_short(val)
        print(f"{val:>20,} → {full:<20} | short: {short:<12} | chart: {very_short}")
