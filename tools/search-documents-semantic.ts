import { RunContext, tool } from '@openai/agents'
import { z } from 'zod'

import { searchDatabricksDocuments } from '@/lib/databricks'
import { addEvalContext } from '@/lib/eval-context'
import type { AgentContext } from '@/lib/agent-context'
import { assertCustomerAccess } from '@/lib/assert-customer-access'
import { validateSearchScope } from '@/lib/validate-search-scope'

export const searchDocumentsSemanticTool = tool({
  name: 'search_documents_semantic',

  description:
    'Databricks AI Searchを使って社内文書を意味検索します。契約書、議事録、社内ルール、プロジェクトメモなどを検索するときに使用してください。',

  parameters: z.object({
    query: z.string().describe('検索したい内容'),

    scope: z
      .enum(['customer', 'global'])
      .describe(
        '特定顧客の文書を検索する場合はcustomer、全顧客共通文書を検索する場合はglobal',
      ),
    documentType: z
      .string()
      .optional()
      .describe(
        'contract, meeting, project, policy, faq, operation_guide などの文書種別',
      ),
  }),

  async execute(
    { query, documentType, scope },
    runContext?: RunContext<AgentContext>,
  ) {
    const callId = crypto.randomUUID()

    const verifiedCustomerId = runContext?.context.verifiedCustomerId

    if (scope === 'customer') {
      if (!verifiedCustomerId) {
        throw new Error('Customer is not verified')
      }

      const scopeInput = {
        scope: 'customer' as const,
        customerId: verifiedCustomerId,
      }

      validateSearchScope(scopeInput)

      assertCustomerAccess(scopeInput.customerId, runContext)

      console.log('[search_documents_semantic:start]', {
        callId,
        query,
        customerId: scopeInput.customerId,
        documentType,
        scope: scopeInput.scope,
      })

      try {
        const results = await searchDatabricksDocuments(query, {
          scope: 'customer',
          customerId: scopeInput.customerId,
          documentType,
        })

        console.log('[search_documents_semantic:success]', {
          callId,
          query,
          customerId: scopeInput.customerId,
          documentType,
          scope: scopeInput.scope,
          resultCount: results.length,
        })

        console.table(
          results.map((result) => ({
            file: result.file,
            documentType: result.documentType,
            customerId: result.customerId,
            score: result.score,
          })),
        )

        const output = {
          results,
        }

        addEvalContext('search_documents_semantic', output, {
          query,
          customerId: scopeInput.customerId,
          documentType,
          scope: scopeInput.scope,
        })

        return output
      } catch (error) {
        console.error('[search_documents_semantic:error]', {
          callId,
          query,
          customerId: scopeInput.customerId,
          documentType,
          scope: scopeInput.scope,
          error,
        })

        throw error
      }
    }

    const scopeInput = {
      scope: 'global' as const,
    }

    validateSearchScope(scopeInput)

    console.log('[search_documents_semantic:start]', {
      callId,
      query,
      customerId: undefined,
      documentType,
      scope: scopeInput.scope,
    })

    try {
      const results = await searchDatabricksDocuments(query, {
        scope: 'global',
        documentType,
      })

      console.log('[search_documents_semantic:success]', {
        callId,
        query,
        customerId: undefined,
        documentType,
        scope: scopeInput.scope,
        resultCount: results.length,
      })

      console.table(
        results.map((result) => ({
          file: result.file,
          documentType: result.documentType,
          customerId: result.customerId,
          score: result.score,
        })),
      )

      const output = {
        results,
      }

      addEvalContext('search_documents_semantic', output, {
        query,
        customerId: undefined,
        documentType,
        scope: scopeInput.scope,
      })

      return output
    } catch (error) {
      console.error('[search_documents_semantic:error]', {
        callId,
        query,
        customerId: undefined,
        documentType,
        scope: scopeInput.scope,
        error,
      })

      throw error
    }
  },
})
