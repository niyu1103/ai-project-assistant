import { NextRequest, NextResponse } from 'next/server'
import { extractMonthlyReport } from '@/lib/extract-monthly-report'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'PDFまたは画像ファイルが必要です' },
      { status: 400 },
    )
  }

  try {
    const result = await extractMonthlyReport(file)

    return NextResponse.json(result)
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }

    if (error.message === 'CUSTOMER_ID_NOT_FOUND') {
      return NextResponse.json(
        {
          error: '顧客マスタに該当するcustomerIdがありません',
        },
        { status: 422 },
      )
    }

    if (error.message === 'CUSTOMER_NAME_MISMATCH') {
      return NextResponse.json(
        {
          error: 'PDFの顧客IDと顧客名が顧客マスタと一致しません',
        },
        { status: 422 },
      )
    }

    if (error.message === 'CUSTOMER_NAME_NOT_FOUND') {
      return NextResponse.json(
        {
          error: '顧客名から顧客を特定できませんでした',
        },
        { status: 422 },
      )
    }

    if (error.message === 'CUSTOMER_NAME_AMBIGUOUS') {
      return NextResponse.json(
        {
          error: '顧客名が複数の顧客に一致したため特定できませんでした',
        },
        { status: 422 },
      )
    }

    throw error
  }
}
