import { RunContext, tool } from "@openai/agents";
import { z } from "zod";

import { searchDatabricksDocuments } from "@/lib/databricks";
import { addEvalContext } from "@/lib/eval-context";
import type { AgentContext } from "@/lib/agent-context";
import { assertCustomerAccess } from "@/lib/assert-customer-access";
import { validateSearchScope } from "@/lib/validate-search-scope";

export const searchDocumentsSemanticTool = tool({
  name: "search_documents_semantic",

  description:
    "Databricks AI Searchを使って社内文書を意味検索します。契約書、議事録、社内ルール、プロジェクトメモなどを検索するときに使用してください。",

  parameters: z.object({
    query: z.string().describe("検索したい内容"),

    scope: z
      .enum(["customer", "global"])
      .describe(
        "特定顧客の文書を検索する場合はcustomer、全顧客共通文書を検索する場合はglobal",
      ),

    customerId: z
      .string()
      .optional()
      .describe("特定顧客に絞り込む場合の、get_customerで特定済みの顧客ID"),

    documentType: z
      .string()
      .optional()
      .describe(
        "contract, meeting, project, policy, faq, operation_guide などの文書種別",
      ),
  }),

  async execute(
    { query, customerId, documentType, scope },
    runContext?: RunContext<AgentContext>,
  ) {
    const callId = crypto.randomUUID();

    console.log("[search_documents_semantic:start]", {
      callId,
      query,
      customerId,
      documentType,
      scope,
    });

    const scopeInput = {
      scope,
      customerId,
    };

    validateSearchScope(scopeInput);

    if (scopeInput.scope === "customer") {
      assertCustomerAccess(scopeInput.customerId, runContext);
    }

    try {
      const results =
        scopeInput.scope === "customer"
          ? await searchDatabricksDocuments(query, {
              scope: "customer",
              customerId: scopeInput.customerId,
              documentType,
            })
          : await searchDatabricksDocuments(query, {
              scope: "global",
              documentType,
            });

      console.log("[search_documents_semantic:success]", {
        callId,
        query,
        customerId,
        documentType,
        scope,
        resultCount: results.length,
      });

      console.table(
        results.map((result) => ({
          file: result.file,
          documentType: result.documentType,
          customerId: result.customerId,
          score: result.score,
        })),
      );

      const output = {
        results,
      };

      addEvalContext("search_documents_semantic", output, {
        query,
        customerId,
        documentType,
        scope,
      });

      return output;
    } catch (error) {
      console.error("[search_documents_semantic:error]", {
        callId,
        query,
        customerId,
        documentType,
        scope,
        error,
      });

      throw error;
    }
  },
});
