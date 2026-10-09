import OpenAI from 'openai'
import { z } from 'zod'
import customers from '@/data/customers.json'

export type MonthlyReportFile = {
  name: string
  type: string
  arrayBuffer(): Promise<ArrayBuffer>
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const reportSchema = z.object({
  customerId: z.string().nullable(),
  customerName: z.string(),
  reportMonth: z.string(),
  apiUsageRate: z.number().nullable(),
  slaRate: z.number().nullable(),
  incidentCount: z.number().nullable(),
  criticalIncidentCount: z.number().nullable(),
  ssoCertificateExpirationDate: z.string().nullable(),
  risks: z.array(
    z.object({
      name: z.string(),
      level: z.string().nullable(),
      status: z.string().nullable(),
    }),
  ),
  nextActions: z.array(z.string()),
})

export type ReportResult = z.infer<typeof reportSchema>

function normalizeCustomerName(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, '').trim()
}

function resolveCustomer(result: ReportResult) {
  if (result.customerId) {
    const customer = customers.find(
      (customer) => customer.id === result.customerId,
    )

    if (!customer) {
      throw new Error('CUSTOMER_ID_NOT_FOUND')
    }

    const acceptedCustomerNames = [
      customer.name,
      customer.shortName,
      ...(customer.aliases ?? []),
    ].map(normalizeCustomerName)

    const customerNameMatched = acceptedCustomerNames.includes(
      normalizeCustomerName(result.customerName),
    )

    if (!customerNameMatched) {
      throw new Error('CUSTOMER_NAME_MISMATCH')
    }

    return customer
  }

  const normalizedResultName = normalizeCustomerName(result.customerName)

  const matchedCustomers = customers.filter((customer) => {
    const acceptedCustomerNames = [
      customer.name,
      customer.shortName,
      ...(customer.aliases ?? []),
    ].map(normalizeCustomerName)

    return acceptedCustomerNames.includes(normalizedResultName)
  })

  if (matchedCustomers.length === 0) {
    throw new Error('CUSTOMER_NAME_NOT_FOUND')
  }

  if (matchedCustomers.length > 1) {
    throw new Error('CUSTOMER_NAME_AMBIGUOUS')
  }

  return matchedCustomers[0]
}

export async function extractMonthlyReport(file: MonthlyReportFile) {
  const isPdf = file.type === 'application/pdf'
  const isImage = file.type.startsWith('image/')

  if (!isPdf && !isImage) {
    throw new Error('UNSUPPORTED_FILE_TYPE')
  }

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString('base64')

  const fileContent = isPdf
    ? {
        type: 'input_file' as const,
        filename: file.name,
        file_data: `data:${file.type};base64,${base64}`,
      }
    : {
        type: 'input_image' as const,
        image_url: `data:${file.type};base64,${base64}`,
        detail: 'auto' as const,
      }

  const response = await client.responses.create({
    model: 'gpt-5.6',
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `
このファイルは顧客の月次報告書です。

PDFまたは画像として与えられます。

記載されている内容だけを使って、
指定されたJSON形式に構造化してください。

PDFと画像のどちらでも、
同じ意味の情報は同じJSON項目・同じ粒度で抽出してください。

「リスク・対応状況」の表は、以下のように分離してください。

- リスク名 → risks[].name
- レベル → risks[].level
- 対応状況 → risks[].status

対応状況をリスク名に連結しないでください。

nextActions には「次月アクション」セクションに
明記された項目だけを入れてください。

reportMonth は YYYY-MM 形式、
日付は YYYY-MM-DD 形式に正規化してください。

推測で値を補わないでください。
記載がない場合は null または空配列にしてください。
            `,
          },
          fileContent,
        ],
      },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'monthly_report',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            customerId: {
              type: ['string', 'null'],
            },
            customerName: {
              type: 'string',
            },
            reportMonth: {
              type: 'string',
            },
            apiUsageRate: {
              type: ['number', 'null'],
            },
            slaRate: {
              type: ['number', 'null'],
            },
            incidentCount: {
              type: ['number', 'null'],
            },
            criticalIncidentCount: {
              type: ['number', 'null'],
            },
            ssoCertificateExpirationDate: {
              type: ['string', 'null'],
            },
            risks: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  name: {
                    type: 'string',
                  },
                  level: {
                    type: ['string', 'null'],
                  },
                  status: {
                    type: ['string', 'null'],
                  },
                },
                required: ['name', 'level', 'status'],
              },
            },
            nextActions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: [
            'customerId',
            'customerName',
            'reportMonth',
            'apiUsageRate',
            'slaRate',
            'incidentCount',
            'criticalIncidentCount',
            'ssoCertificateExpirationDate',
            'risks',
            'nextActions',
          ],
        },
      },
    },
  })

  const parsed = JSON.parse(response.output_text)
  const result = reportSchema.parse(parsed)

  const customer = resolveCustomer(result)

  return {
    ...result,
    customerId: customer.id,
    customerName: customer.shortName,
    customerVerified: true,
  }
}
