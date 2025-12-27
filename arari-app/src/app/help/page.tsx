'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  HelpCircle,
  Book,
  MessageCircle,
  Mail,
  ChevronDown,
  Calculator,
  Upload,
  BarChart3,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: '粗利の計算方法を教えてください',
    answer: `粗利は以下の計算式で算出されます：

粗利 = 売上 - 原価

売上 = 単価 × 稼働時間
原価 = 給与 + 社会保険（会社負担）+ 雇用保険 + 有給コスト + 通勤費

※社会保険の会社負担は、従業員が支払う金額と同額です。
例：従業員が30,000円支払う場合、会社も30,000円負担します。`,
  },
  {
    question: '社会保険の会社負担について',
    answer: `日本の社会保険制度では、従業員と会社が同額を負担します。

例えば：
- 従業員の社会保険料：30,000円
- 会社の社会保険料：30,000円（同額）
- 合計：60,000円

この会社負担分が原価に含まれ、粗利の計算に反映されます。`,
  },
  {
    question: '有給休暇のコストはどう計算されますか？',
    answer: `有給休暇を取得した場合、その時間分の給与は会社が負担しますが、
クライアントからの売上は発生しません。

有給コスト = 有給時間 × 時給

このコストは原価に含まれ、粗利を減少させます。`,
  },
  {
    question: 'ファイルのアップロード形式は？',
    answer: `以下の形式に対応しています：
- Excel (.xlsx, .xlsm, .xls)
- CSV (.csv)

必須項目：
- 社員番号
- 対象期間
- 基本給
- 社会保険料

オプション項目：
- 残業時間
- 有給日数
- 通勤費
- 請求金額`,
  },
  {
    question: 'マージン率の目安を教えてください',
    answer: `一般的なマージン率の目安：

- 30%以上：優良（緑色表示）
- 20-30%：標準（黄色表示）
- 20%未満：要改善（赤色表示）

マージン率 = (単価 - 時給) / 単価 × 100`,
  },
]

export default function HelpPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="md:pl-[280px] pt-16 transition-all duration-300">
        <div className="container py-6 px-4 md:px-6 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              ヘルプ
            </h1>
            <p className="text-muted-foreground mt-1">
              よくある質問とサポート情報
            </p>
          </motion.div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="p-3 rounded-full bg-blue-500/10 w-fit mx-auto mb-4">
                    <Calculator className="h-6 w-6 text-blue-500" />
                  </div>
                  <h3 className="font-semibold">計算方法</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    粗利の計算ロジック
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="p-3 rounded-full bg-emerald-500/10 w-fit mx-auto mb-4">
                    <Upload className="h-6 w-6 text-emerald-500" />
                  </div>
                  <h3 className="font-semibold">データ取込</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    ファイル形式と手順
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="pt-6 text-center">
                  <div className="p-3 rounded-full bg-purple-500/10 w-fit mx-auto mb-4">
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="font-semibold">レポート</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    出力形式と内容
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  <CardTitle>よくある質問</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div
                      key={index}
                      className="rounded-lg border overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === index ? null : index)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-medium">{faq.question}</span>
                        <ChevronDown
                          className={cn(
                            'h-5 w-5 text-muted-foreground transition-transform',
                            openFaq === index && 'rotate-180'
                          )}
                        />
                      </button>
                      <motion.div
                        initial={false}
                        animate={{
                          height: openFaq === index ? 'auto' : 0,
                          opacity: openFaq === index ? 1 : 0,
                        }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 pt-0 text-sm text-muted-foreground whitespace-pre-line border-t bg-muted/30">
                          {faq.answer}
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-6"
          >
            <Card className="bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5">
              <CardContent className="pt-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    お問い合わせ
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ご不明な点がございましたら、お気軽にお問い合わせください
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button variant="outline">
                      <Mail className="h-4 w-4 mr-2" />
                      メールで問い合わせ
                    </Button>
                    <Button variant="outline">
                      <Book className="h-4 w-4 mr-2" />
                      ドキュメントを見る
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  )
}
