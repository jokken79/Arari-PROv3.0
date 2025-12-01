# 粗利 PRO - 派遣社員利益管理システム

**Profit Margin Management System for Dispatch Employees**

派遣社員の利益率・マージンを可視化するダッシュボードアプリケーション。

## 機能

- **ダッシュボード** - 全体の粗利統計を一目で確認
- **従業員一覧** - 各従業員の単価・時給・粗利を表示
- **派遣先分析** - 派遣先ごとの利益率を比較
- **グラフ表示** - 粗利分布・派遣先別粗利をビジュアル化

## 計算式

```
粗利 = 単価 - 時給
マージン率 = (単価 - 時給) / 単価 × 100
```

- **単価** (billing_rate): 派遣先が支払う金額
- **時給** (hourly_rate): 従業員への支払い金額
- **粗利** (arari): 差額 = 利益

## インストール

```bash
# 依存関係インストール
pip install -r requirements.txt

# 起動
python run.py
```

ブラウザで http://localhost:8990 を開く

## 必要条件

- Python 3.9+
- ChinginGenerator-v4-PRO の `chingin_data.db` データベース

データベースは以下のいずれかに配置:
- `../ChinginGenerator-v4-PRO/chingin_data.db`
- `../chingin_data.db`
- `./chingin_data.db`

## API エンドポイント

| エンドポイント | 説明 |
|---------------|------|
| `GET /` | メインダッシュボード |
| `GET /api/statistics` | 全体統計 |
| `GET /api/employees` | 従業員一覧 |
| `GET /api/companies` | 派遣先別分析 |
| `GET /api/health` | ヘルスチェック |

## スクリーンショット

ダッシュボードには以下が表示されます:
- 総従業員数
- 平均粗利 (円/時)
- 平均マージン率
- 派遣先別グラフ
- 粗利分布チャート

## ライセンス

Internal Use Only

---

開発: 2025
