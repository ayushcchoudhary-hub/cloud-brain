import "dotenv/config";

import { createServer } from "node:http";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { evaluatePull } from "../../eval/src/index.js";
import { createCloudBrainService } from "../../retrieval/src/index.js";
import type { SearchResult } from "../../shared/src/types.js";

const searchArgsSchema = z.object({
  query: z.string().min(3).max(800),
  max_results: z.number().int().min(1).max(15).optional(),
  min_similarity: z.number().min(0).max(1).optional(),
  include_own: z.boolean().optional(),
  max_price_usdc: z.number().min(0).max(100).optional()
});

const pullArgsSchema = z.object({
  query_context: z.string().min(3).max(2000).optional(),
  query: z.string().min(3).max(2000).optional(),
  quote_id: z.string().uuid().optional(),
  contributor_id: z.string().optional(),
  buyer_wallet: z.string().min(3).optional(),
  max_results: z.number().int().min(1).max(15).optional(),
  min_similarity: z.number().min(0).max(1).optional(),
  min_auto_approve_similarity: z.number().min(0).max(1).optional(),
  force_settlement: z.boolean().optional(),
  auto_approve_payment: z.boolean().optional(),
  max_auto_approve_usdc: z.number().min(0).max(100).optional(),
  monthly_budget_usdc: z.number().min(0).max(100000).optional(),
  max_pulls_per_hour: z.number().int().min(1).max(500).optional(),
  quote_ttl_minutes: z.number().int().min(1).max(120).optional(),
  include_own: z.boolean().optional(),
  max_price_usdc: z.number().min(0).max(100).optional()
}).refine((data) => Boolean(data.quote_id || data.query_context || data.query), {
  message: "Expected quote_id or query_context (or query) string"
});

const marketplaceArgsSchema = z.object({
  top_contributors: z.number().int().min(1).max(20).optional(),
  recent_payments: z.number().int().min(1).max(50).optional()
});

const feedbackArgsSchema = z.object({
  tx_hash: z.string().min(5),
  useful: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  feedback_text: z.string().max(1500).optional(),
  query: z.string().min(3).optional(),
  contributor_id: z.string().optional(),
  buyer_wallet: z.string().optional()
});

const pullHistoryArgsSchema = z.object({
  buyer_wallet: z.string().optional(),
  contributor_id: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional()
});

const DEFAULT_CONFIDENT_SIMILARITY = 0.6;

function shiftIso(startIso: string, deltaMs: number): string {
  return new Date(new Date(startIso).getTime() + deltaMs).toISOString();
}

function isConfidentMatch(
  result: SearchResult | undefined,
  minSimilarity = DEFAULT_CONFIDENT_SIMILARITY
): boolean {
  if (!result) {
    return false;
  }
  if ((result.confidenceBand ?? "low") === "low") {
    return false;
  }
  return result.similarity >= minSimilarity;
}

function summarizeMatches(results: SearchResult[], limit = 3): Array<Record<string, unknown>> {
  return results.slice(0, limit).map((row, index) => ({
    rank: index + 1,
    page_title: row.pageTitle,
    contributor: row.contributorDisplayName ?? row.contributorId,
    score: row.similarity,
    confidence_band: row.confidenceBand ?? "medium",
    price_usdc: row.priceUsdc ?? 3,
    own_contributor: row.isOwnContributor ?? false,
    matched_terms: row.matchedTerms ?? [],
    match_reason: row.matchReason ?? ""
  }));
}

function dedupeAngles(items: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const cleaned = item.trim().replace(/\s+/g, " ");
    const normalized = cleaned.toLowerCase();
    if (!cleaned || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(cleaned);
    if (out.length >= limit) {
      break;
    }
  }

  return out;
}

function extractCoverageAngles(results: SearchResult[], limit = 3): string[] {
  const fromTopics = dedupeAngles(
    results
      .slice(0, 8)
      .flatMap((row) => row.topics)
      .filter((topic) => topic.trim().length >= 3),
    limit
  );

  if (fromTopics.length >= limit) {
    return fromTopics.slice(0, limit);
  }

  const fromTitles = dedupeAngles(
    results
      .slice(0, 8)
      .map((row) => row.pageTitle)
      .filter((title) => title.trim().length >= 3),
    limit
  );

  return dedupeAngles([...fromTopics, ...fromTitles], limit);
}

function formatAngleList(angles: string[]): string {
  if (angles.length === 0) {
    return "key strategic and operational angles";
  }
  if (angles.length === 1) {
    return angles[0] ?? "key strategic and operational angles";
  }
  if (angles.length === 2) {
    return `${angles[0]} and ${angles[1]}`;
  }
  return `${angles[0]}, ${angles[1]}, and ${angles[2]}`;
}

function emptyToolResponse() {
  return {
    content: [{ type: "text" as const, text: "" }]
  };
}

function buildWebResearchPlan(query: string): Record<string, unknown> {
  return {
    status: "recommended",
    reason:
      "No confident match found in the knowledge network. Continue with web research.",
    suggested_queries: [
      query,
      `${query} case studies`,
      `${query} benchmark data`,
      `${query} regulatory and operational risks`
    ]
  };
}

type TransportMode = "stdio" | "sse";

type CliOptions = {
  transport: TransportMode;
  port: number;
  host: string;
};

type CloudBrainService = Awaited<ReturnType<typeof createCloudBrainService>>;

function parseCliOptions(argv: string[]): CliOptions {
  const envTransport = String(process.env.MCP_TRANSPORT ?? "").trim().toLowerCase();
  let transport: TransportMode = envTransport === "sse" ? "sse" : "stdio";

  const envPort = Number.parseInt(process.env.MCP_PORT ?? process.env.PORT ?? "3100", 10);
  let port = Number.isFinite(envPort) && envPort > 0 && envPort <= 65535 ? envPort : 3100;
  let host = process.env.MCP_HOST ?? process.env.HOST ?? "127.0.0.1";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) {
      continue;
    }

    if (arg === "--transport") {
      const value = argv[i + 1]?.toLowerCase();
      if (value === "stdio" || value === "sse") {
        transport = value;
        i += 1;
        continue;
      }
      throw new Error(`Invalid --transport value "${argv[i + 1] ?? ""}". Use "stdio" or "sse".`);
    }

    if (arg.startsWith("--transport=")) {
      const value = arg.split("=", 2)[1]?.toLowerCase();
      if (value === "stdio" || value === "sse") {
        transport = value;
        continue;
      }
      throw new Error(`Invalid --transport value "${value ?? ""}". Use "stdio" or "sse".`);
    }

    if (arg === "--port") {
      const value = Number.parseInt(argv[i + 1] ?? "", 10);
      if (!Number.isFinite(value) || value <= 0 || value > 65535) {
        throw new Error(`Invalid --port value "${argv[i + 1] ?? ""}". Use an integer from 1-65535.`);
      }
      port = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--port=")) {
      const value = Number.parseInt(arg.split("=", 2)[1] ?? "", 10);
      if (!Number.isFinite(value) || value <= 0 || value > 65535) {
        throw new Error(`Invalid --port value "${arg.split("=", 2)[1] ?? ""}". Use an integer from 1-65535.`);
      }
      port = value;
      continue;
    }

    if (arg === "--host") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for "--host".');
      }
      host = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--host=")) {
      const value = arg.split("=", 2)[1];
      if (!value) {
        throw new Error('Missing value for "--host".');
      }
      host = value;
    }
  }

  return { transport, port, host };
}

function createMcpServer(service: CloudBrainService): Server {

  const server = new Server(
    {
      name: "cloud-brain-mcp",
      version: "0.1.0"
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const exposeMarketplaceTools =
      String(process.env.CLOUD_BRAIN_EXPOSE_MARKETPLACE_TOOLS ?? "").toLowerCase() === "true";

    const tools: Array<Record<string, unknown>> = [
      {
        name: "search_cloud_brain",
        description:
          "Autonomously check the cloud-brain knowledge network during deep research tasks (market analysis, competitive landscape, technical deep dives, or multi-session topics). Searches the user's own published wiki first, then the broader network of contributors. Do not call for quick factual lookups, simple coding tasks, or one-shot Q&A. If there is no confident match, return nothing. If a match is found from the user's own wiki, surface it naturally: 'I found relevant research from your own compiled wiki on [topic].' If from the network: 'I found compiled research from someone who spent significant time on [topic]. Their work covers [specific angles]. Want me to pull it in?'",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            max_results: { type: "number", default: 6 },
            min_similarity: { type: "number", default: 0.6 },
            include_own: { type: "boolean", default: true }
          },
          required: ["query"]
        }
      },
      {
        name: "pull_knowledge",
        description:
          "Pull compiled research into the current deep-research response after a confident cloud-brain match. Pulls from the user's own wiki or the network. Default flow is free and should return clean synthesis for natural integration. For own-wiki pulls, use attribution like 'drawing on your prior compiled research'. For network pulls, use 'based on compiled research from the network'. If no confident match is available, return nothing.",
        inputSchema: {
          type: "object",
          properties: {
            query_context: { type: "string" },
            query: { type: "string" },
            contributor_id: { type: "string" },
            max_results: { type: "number", default: 6 },
            min_similarity: { type: "number", default: 0.6 },
            include_own: { type: "boolean", default: true }
          },
          required: []
        }
      },
      {
        name: "submit_pull_feedback",
        description:
          "Record whether pulled research was helpful ('was this helpful?') so future retrieval quality improves.",
        inputSchema: {
          type: "object",
          properties: {
            tx_hash: { type: "string" },
            useful: { type: "boolean" },
            rating: { type: "number", default: 4 },
            feedback_text: { type: "string" },
            query: { type: "string" },
            contributor_id: { type: "string" },
            buyer_wallet: { type: "string" }
          },
          required: ["tx_hash", "useful"]
        }
      }
    ];

    if (exposeMarketplaceTools) {
      tools.push(
        {
          name: "get_cloud_brain_marketplace_summary",
          description:
            "Return marketplace-level pull volume, gross mocked payments, and top contributor earnings.",
          inputSchema: {
            type: "object",
            properties: {
              top_contributors: { type: "number", default: 5 },
              recent_payments: { type: "number", default: 10 }
            }
          }
        },
        {
          name: "get_pull_history",
          description:
            "Return recent quote/settlement history so users can inspect matching, tx records, and feedback status.",
          inputSchema: {
            type: "object",
            properties: {
              buyer_wallet: { type: "string" },
              contributor_id: { type: "string" },
              limit: { type: "number", default: 20 }
            }
          }
        }
      );
    }

    return {
      tools
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const name = request.params.name;
      const args = request.params.arguments ?? {};

      if (name === "search_cloud_brain") {
        const parsed = searchArgsSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
            isError: true
          };
        }

        const requestedIncludeOwn = parsed.data.include_own ?? true;
        const minSimilarity = parsed.data.min_similarity ?? DEFAULT_CONFIDENT_SIMILARITY;
        const result = await service.search(
          parsed.data.query,
          parsed.data.max_results ?? 6,
          minSimilarity,
          {
            includeOwn: requestedIncludeOwn,
            maxPriceUsdc: parsed.data.max_price_usdc
          }
        );
        const topMatch = result[0];
        // Lower threshold for own-wiki matches (0.45 vs 0.6) since user's own research is always relevant
        const effectiveThreshold = topMatch?.isOwnContributor
          ? Math.min(minSimilarity, 0.45)
          : minSimilarity;
        if (!topMatch || !isConfidentMatch(topMatch, effectiveThreshold)) {
          return emptyToolResponse();
        }

        const coverageAngles = extractCoverageAngles(result, 3);
        const isOwnContent = topMatch.isOwnContributor;
        const message = isOwnContent
          ? `I found relevant research from your own compiled wiki on "${parsed.data.query}". It covers ${formatAngleList(coverageAngles)}.`
          : `I found compiled research from someone who spent significant time on "${parsed.data.query}". Their work covers ${formatAngleList(coverageAngles)}. Want me to pull it in?`;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "network_research_available",
                  message,
                  research_covers: coverageAngles,
                  top_match: {
                    contributor_id: topMatch.contributorId,
                    page_title: topMatch.pageTitle,
                    page_path: topMatch.pagePath,
                    similarity: topMatch.similarity,
                    confidence_band: topMatch.confidenceBand ?? "medium",
                    matched_terms: topMatch.matchedTerms ?? []
                  },
                  pull_hint: {
                    query_context: parsed.data.query,
                    contributor_id: topMatch.contributorId,
                    min_similarity: minSimilarity
                  }
                },
                null,
                2
              )
            }
          ]
        };
      }

      if (name === "pull_knowledge") {
        const parsed = pullArgsSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
            isError: true
          };
        }

        let queryContext = parsed.data.query_context ?? parsed.data.query ?? "";
        const buyerWallet =
          parsed.data.buyer_wallet ?? process.env.CONTRIBUTOR_WALLET ?? "local-dev-wallet";
        const minSimilarity = parsed.data.min_similarity ?? DEFAULT_CONFIDENT_SIMILARITY;

        const explicitMarketplaceMode = Boolean(
          parsed.data.quote_id ||
            parsed.data.auto_approve_payment === false ||
            parsed.data.max_auto_approve_usdc !== undefined ||
            parsed.data.monthly_budget_usdc !== undefined ||
            parsed.data.max_pulls_per_hour !== undefined ||
            parsed.data.quote_ttl_minutes !== undefined ||
            parsed.data.force_settlement
        );

        if (!explicitMarketplaceMode) {
          if (!queryContext) {
            return {
              content: [
                {
                  type: "text",
                  text: "Missing query context. Provide query_context (or query)."
                }
              ],
              isError: true
            };
          }

          const searchMatches = await service.search(
            queryContext,
            parsed.data.max_results ?? 6,
            minSimilarity,
            {
              contributorId: parsed.data.contributor_id,
              includeOwn: parsed.data.include_own ?? true,
              maxPriceUsdc: parsed.data.max_price_usdc
            }
          );

          const selected = searchMatches[0];
          const pullThreshold = selected?.isOwnContributor
            ? Math.min(minSimilarity, 0.45)
            : minSimilarity;
          if (!selected || !isConfidentMatch(selected, pullThreshold)) {
            return emptyToolResponse();
          }

          const pull = await service.pull(queryContext, parsed.data.max_results ?? 6, {
            contributorId: selected.contributorId,
            includeOwn: true,
            maxPriceUsdc: parsed.data.max_price_usdc
          });

          const hashCheck = await service.verifySearchResultHash(selected);
          const injectionCheck = service.scanPullContent(pull.synthesis);
          pull.safety = {
            promptInjectionFlagged: injectionCheck.flagged,
            promptInjectionMatches: injectionCheck.matches,
            contentHashVerified: hashCheck.verified,
            hashExpected: hashCheck.expectedHash,
            hashActual: hashCheck.actualHash
          };

          if (!pull.synthesis.trim() || injectionCheck.flagged) {
            return emptyToolResponse();
          }

          const coverageAngles = extractCoverageAngles(pull.retrieved, 3);
          const evalResult = evaluatePull(queryContext, pull);
          const isOwnPull = selected.isOwnContributor;
          const attribution = isOwnPull
            ? "drawing on your prior compiled research"
            : "based on compiled research from the network";

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "research_augmented",
                    source: isOwnPull ? "own_wiki" : "network",
                    augmentation_signal: `${isOwnPull ? "Drawing on your prior compiled research" : "Based on compiled research from the network"}, this covers: ${formatAngleList(
                      coverageAngles
                    )}.`,
                    research_covers: coverageAngles,
                    synthesis: pull.synthesis,
                    citations: pull.citations.slice(0, 6).map((citation) => ({
                      page_title: citation.pageTitle,
                      page_path: citation.pagePath,
                      similarity: citation.similarity,
                      matched_terms: citation.matchedTerms ?? []
                    })),
                    attribution_hint:
                      `Integrate this directly into your main research answer with subtle attribution: ${attribution}.`,
                    eval: {
                      relevance_score: evalResult.relevanceScore,
                      citation_coverage: evalResult.citationCoverage
                    }
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        let quoteSource: "new" | "existing" = "new";
        let quoteRecord = parsed.data.quote_id
          ? await service.getMockQuoteById(parsed.data.quote_id)
          : null;
        let selectedMatch: SearchResult | undefined;
        let alternatives: SearchResult[] = [];

        if (quoteRecord) {
          quoteSource = "existing";
          if (!queryContext) {
            queryContext = quoteRecord.query;
          }
          if (new Date(quoteRecord.expiresAt).getTime() < Date.now()) {
            if (quoteRecord.id) {
              await service.updateMockQuoteStatus(quoteRecord.id, "expired");
            }
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "quote_expired",
                      quote_id: quoteRecord.id,
                      message: "Quote expired. Call pull_knowledge again to generate a fresh quote."
                    },
                    null,
                    2
                  )
                }
              ],
              isError: true
            };
          }

          const refreshed = await service.search(queryContext, 6, 0.2, {
            contributorId: quoteRecord.contributorId,
            includeOwn: true,
            maxPriceUsdc: parsed.data.max_price_usdc
          });
          selectedMatch = refreshed[0];
          alternatives = refreshed.slice(1, 4);
        }

        if (!quoteRecord || !selectedMatch) {
          if (!queryContext) {
            return {
              content: [
                {
                  type: "text",
                  text: "Missing query context. Provide query_context (or query), or a valid quote_id."
                }
              ],
              isError: true
            };
          }
          try {
            const quoted = await service.createMockQuote(queryContext, buyerWallet, {
              contributorId: parsed.data.contributor_id,
              includeOwn: parsed.data.include_own ?? false,
              maxPriceUsdc: parsed.data.max_price_usdc,
              maxResults: 12,
              minSimilarity: parsed.data.min_similarity ?? 0.35,
              quoteTtlMinutes: parsed.data.quote_ttl_minutes,
              autoApproveMaxUsdc: parsed.data.max_auto_approve_usdc
            });
            quoteRecord = quoted.quote;
            selectedMatch = quoted.selected;
            alternatives = quoted.alternatives;
            quoteSource = "new";
          } catch (error) {
            const message = error instanceof Error ? error.message : "No purchasable matches found";
            const ownCandidates = (
              await service.search(queryContext, parsed.data.max_results ?? 6, 0, {
                includeOwn: true,
                maxPriceUsdc: parsed.data.max_price_usdc
              })
            ).filter((row) => row.isOwnContributor);

            if (ownCandidates.length > 0) {
              const topOwn = ownCandidates[0];
              if (!topOwn) {
                return {
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(
                        {
                          status: "no_match",
                          query_context: queryContext,
                          message:
                            "No confident match found. Continue with normal research.",
                          web_research_plan: buildWebResearchPlan(queryContext)
                        },
                        null,
                        2
                      )
                    }
                  ]
                };
              }
              const ownPull = await service.pull(queryContext, parsed.data.max_results ?? 6, {
                contributorId: topOwn.contributorId,
                includeOwn: true,
                maxPriceUsdc: parsed.data.max_price_usdc
              });
              const ownEval = evaluatePull(queryContext, ownPull);

              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        status: "own_knowledge_used",
                        message:
                          "No confident external match. Using own knowledge.",
                        query_context: queryContext,
                        external_attempt: {
                          include_own: parsed.data.include_own ?? false,
                          min_similarity: parsed.data.min_similarity ?? 0.35,
                          detail: message
                        },
                        own_research: {
                          top_match: {
                            page_title: topOwn.pageTitle,
                            contributor: topOwn.contributorDisplayName ?? topOwn.contributorId,
                            score: topOwn.similarity,
                            confidence_band: topOwn.confidenceBand ?? "low"
                          },
                          summary: summarizeMatches(ownCandidates),
                          pull: {
                            query: ownPull.query,
                            synthesis: ownPull.synthesis,
                            citations: ownPull.citations,
                            retrieved: ownPull.retrieved
                          },
                          eval: ownEval
                        },
                        web_research_plan: buildWebResearchPlan(queryContext)
                      },
                      null,
                      2
                    )
                  }
                ]
              };
            }

            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      status: "no_match",
                      query_context: queryContext,
                      message:
                        "No confident matches found. Continue with normal research.",
                      web_research_plan: buildWebResearchPlan(queryContext)
                    },
                    null,
                    2
                  )
                }
              ]
            };
          }
        }

        if (!quoteRecord || !selectedMatch) {
          return {
            content: [{ type: "text", text: "Unable to create a quote for this query." }],
            isError: true
          };
        }

        const quote = {
          quote_id: quoteRecord.id,
          status: quoteRecord.status,
          expires_at: quoteRecord.expiresAt,
          contributor_id: quoteRecord.contributorId,
          contributor: quoteRecord.contributorDisplayName,
          amount_usdc: quoteRecord.amountUsdc,
          rationale: quoteRecord.matchReason ?? "",
          matched_terms: quoteRecord.matchedTerms ?? [],
          top_page: quoteRecord.topPageTitle,
          top_page_path: quoteRecord.topPagePath,
          auto_approvable: quoteRecord.autoApprovable,
          quote_source: quoteSource
        };

        const autoApprove = parsed.data.auto_approve_payment ?? false;
        const shouldProceed = autoApprove || quoteRecord.autoApprovable;
        const minAutoApproveSimilarity = parsed.data.min_auto_approve_similarity ?? 0.5;
        const forceSettlement = parsed.data.force_settlement ?? false;
        const selectedSimilarity = selectedMatch.similarity ?? quoteRecord.matchScore ?? 0;
        const selectedConfidence = selectedMatch.confidenceBand ?? "low";
        const qualityGateBlocked =
          !forceSettlement &&
          shouldProceed &&
          (selectedSimilarity < minAutoApproveSimilarity || selectedConfidence === "low");

        if (!shouldProceed) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "payment_required",
                    quote,
                    quality_signal: {
                      similarity: selectedSimilarity,
                      confidence_band: selectedConfidence,
                      min_auto_approve_similarity: minAutoApproveSimilarity
                    },
                    alternate_matches: alternatives.map((row) => ({
                      contributor_id: row.contributorId,
                      contributor: row.contributorDisplayName ?? row.contributorId,
                      page_title: row.pageTitle,
                      price_usdc: row.priceUsdc ?? 3,
                      confidence_band: row.confidenceBand ?? "medium"
                    })),
                    next_step:
                      "Call pull_knowledge again with auto_approve_payment=true and quote_id from this quote."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        if (qualityGateBlocked) {
          const ownCandidates = (
            await service.search(queryContext, parsed.data.max_results ?? 6, 0, {
              includeOwn: true,
              maxPriceUsdc: parsed.data.max_price_usdc
            })
          ).filter((row) => row.isOwnContributor);

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "low_confidence",
                    message:
                      "Match quality is too low for automatic use.",
                    quality_signal: {
                      similarity: selectedSimilarity,
                      confidence_band: selectedConfidence
                    },
                    own_knowledge_summary: summarizeMatches(ownCandidates),
                    web_research_plan: buildWebResearchPlan(queryContext),
                    next_step:
                      "Refine query for better results, or use force_settlement=true to proceed anyway."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }

        const buyerUsageBefore = await service.getBuyerUsage(buyerWallet);
        const monthlyBudget = parsed.data.monthly_budget_usdc ?? 100;
        if (buyerUsageBefore.monthlySpendUsdc + quoteRecord.amountUsdc > monthlyBudget) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "budget_exceeded",
                    buyer_wallet: buyerWallet,
                    monthly_spend_usdc: buyerUsageBefore.monthlySpendUsdc,
                    monthly_budget_usdc: monthlyBudget,
                    requested_pull_usdc: quoteRecord.amountUsdc
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          };
        }

        const maxPullsPerHour = parsed.data.max_pulls_per_hour ?? 20;
        if (buyerUsageBefore.pullsLastHour >= maxPullsPerHour) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "rate_limited",
                    buyer_wallet: buyerWallet,
                    pulls_last_hour: buyerUsageBefore.pullsLastHour,
                    max_pulls_per_hour: maxPullsPerHour
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          };
        }

        if (quoteRecord.id) {
          await service.updateMockQuoteStatus(quoteRecord.id, "approved");
        }

        const pull = await service.pull(queryContext, parsed.data.max_results ?? 6, {
          contributorId: quoteRecord.contributorId,
          includeOwn: true
        });
        const hashCheck = await service.verifySearchResultHash(selectedMatch);
        const injectionCheck = service.scanPullContent(pull.synthesis);

        const settlementMs =
          120 +
          ((queryContext.length * 17 +
            Math.round((quoteRecord.amountUsdc ?? 0) * 100) * 13 +
            (quoteRecord.id?.length ?? 11) * 7) %
            780);

        pull.safety = {
          promptInjectionFlagged: injectionCheck.flagged,
          promptInjectionMatches: injectionCheck.matches,
          contentHashVerified: hashCheck.verified,
          hashExpected: hashCheck.expectedHash,
          hashActual: hashCheck.actualHash
        };

        const evalResult = evaluatePull(queryContext, pull);
        const payment = await service.recordMockPayment({
          query: queryContext,
          buyerWallet,
          sellerContributorId: quoteRecord.contributorId,
          sellerDisplayName: quoteRecord.contributorDisplayName,
          amountUsdc: quoteRecord.amountUsdc,
          txHash: pull.paymentReceipt.txHash,
          matchedPagePath: quoteRecord.topPagePath,
          matchedPageTitle: quoteRecord.topPageTitle,
          quoteId: quoteRecord.id,
          settlementMs,
          promptInjectionFlagged: injectionCheck.flagged,
          contentHashVerified: hashCheck.verified,
          evalRelevanceScore: evalResult.relevanceScore,
          evalCitationCoverage: evalResult.citationCoverage,
          evalOverallScore: evalResult.overallScore,
          piiFlagged: evalResult.piiLeakage.flagged
        });

        if (quoteRecord.id) {
          await service.updateMockQuoteStatus(quoteRecord.id, "settled");
        }

        pull.paymentReceipt.txHash = payment.txHash;
        pull.paymentReceipt.amountUsdc = payment.amountUsdc;
        pull.paymentReceipt.createdAt = payment.createdAt ?? pull.paymentReceipt.createdAt;
        pull.paymentReceipt.settlementMs = settlementMs;
        pull.paymentReceipt.quoteId = quoteRecord.id;

        const approvedAt = new Date().toISOString();
        const settledAt = shiftIso(approvedAt, settlementMs);
        pull.timeline = [
          { stage: "quote_created", at: quoteRecord.createdAt ?? approvedAt },
          { stage: "payment_approved", at: approvedAt, detail: `amount=${quoteRecord.amountUsdc} USDC` },
          { stage: "payment_settled", at: settledAt, detail: `${settlementMs}ms settlement` },
          { stage: "content_delivered", at: shiftIso(settledAt, 25) }
        ];

        const buyerUsageAfter = {
          monthlySpendUsdc: Number((buyerUsageBefore.monthlySpendUsdc + quoteRecord.amountUsdc).toFixed(2)),
          pullsLastHour: buyerUsageBefore.pullsLastHour + 1,
          pullsLast24h: buyerUsageBefore.pullsLast24h + 1
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "settled",
                  auto_approve_payment: autoApprove,
                  auto_approved_by_threshold: !autoApprove && quoteRecord.autoApprovable,
                  payment_quote: quote,
                  payment_record: payment,
                  buyer_usage_before: buyerUsageBefore,
                  buyer_usage_after: buyerUsageAfter,
                  pull,
                  eval: evalResult
                },
                null,
                2
              )
            }
          ]
        };
      }

      if (name === "get_cloud_brain_marketplace_summary") {
        const parsed = marketplaceArgsSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
            isError: true
          };
        }

        const summary = await service.getMarketplaceSummary({
          topContributors: parsed.data.top_contributors ?? 5,
          recentPayments: parsed.data.recent_payments ?? 10
        });

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
        };
      }

      if (name === "submit_pull_feedback") {
        const parsed = feedbackArgsSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
            isError: true
          };
        }

        const feedback = await service.recordPullFeedback({
          txHash: parsed.data.tx_hash,
          useful: parsed.data.useful,
          rating: parsed.data.rating,
          feedbackText: parsed.data.feedback_text,
          query: parsed.data.query,
          contributorId: parsed.data.contributor_id,
          buyerWallet:
            parsed.data.buyer_wallet ??
            process.env.CONTRIBUTOR_WALLET ??
            "local-dev-wallet"
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  status: "feedback_recorded",
                  message: "Thanks. Recorded whether this pull was helpful.",
                  feedback
                },
                null,
                2
              )
            }
          ]
        };
      }

      if (name === "get_pull_history") {
        const parsed = pullHistoryArgsSchema.safeParse(args);
        if (!parsed.success) {
          return {
            content: [{ type: "text", text: `Invalid arguments: ${parsed.error.message}` }],
            isError: true
          };
        }

        const history = await service.getPullHistory({
          buyerWallet: parsed.data.buyer_wallet,
          contributorId: parsed.data.contributor_id,
          limit: parsed.data.limit ?? 20
        });

        const totalAmountUsdc = Number(
          history
            .reduce((sum, item) => sum + item.payment.amountUsdc, 0)
            .toFixed(2)
        );
        const feedbackCount = history.filter((item) => item.feedback).length;
        const usefulFeedbackCount = history.filter((item) => item.feedback?.useful === true).length;
        const usefulRate =
          feedbackCount > 0 ? Number((usefulFeedbackCount / feedbackCount).toFixed(3)) : 0;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  filters: {
                    buyer_wallet: parsed.data.buyer_wallet ?? null,
                    contributor_id: parsed.data.contributor_id ?? null,
                    limit: parsed.data.limit ?? 20
                  },
                  aggregate: {
                    pulls: history.length,
                    total_amount_usdc: totalAmountUsdc,
                    feedback_count: feedbackCount,
                    useful_feedback_rate: usefulRate
                  },
                  history
                },
                null,
                2
              )
            }
          ]
        };
      }

      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown MCP handler error";
      return {
        content: [{ type: "text", text: `Tool execution failed: ${message}` }],
        isError: true
      };
    }
  });

  return server;
}

type SseSession = {
  transport: SSEServerTransport;
  server: Server;
};

async function startSseServer(service: CloudBrainService, options: CliOptions): Promise<void> {
  const sessions = new Map<string, SseSession>();

  const server = createServer(async (req, res) => {
    const method = req.method?.toUpperCase();
    const hostHeader = req.headers.host ?? `${options.host}:${options.port}`;
    const url = new URL(req.url ?? "/", `http://${hostHeader}`);

    if (method === "GET" && url.pathname === "/sse") {
      try {
        const transport = new SSEServerTransport("/messages", res);
        const sessionId = transport.sessionId;
        const mcpServer = createMcpServer(service);

        sessions.set(sessionId, { transport, server: mcpServer });

        transport.onclose = () => {
          const active = sessions.get(sessionId);
          if (!active) {
            return;
          }
          sessions.delete(sessionId);
          void active.server.close().catch(() => undefined);
        };

        await mcpServer.connect(transport);
      } catch (error) {
        console.error("Failed to open SSE stream:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Failed to open SSE stream");
        }
      }
      return;
    }

    if (method === "POST" && url.pathname === "/messages") {
      const sessionId = url.searchParams.get("sessionId");
      if (!sessionId) {
        res.writeHead(400).end("Missing sessionId query parameter");
        return;
      }

      const active = sessions.get(sessionId);
      if (!active) {
        res.writeHead(404).end("Session not found");
        return;
      }

      try {
        await active.transport.handlePostMessage(req, res);
      } catch (error) {
        console.error("Failed to handle SSE POST message:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Failed to handle request");
        }
      }
      return;
    }

    if (method === "GET" && url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "ok",
          transport: "sse",
          sessions: sessions.size
        })
      );
      return;
    }

    res.writeHead(404).end("Not found");
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    console.error(`Shutting down MCP SSE server (${signal})...`);

    for (const [sessionId, active] of sessions.entries()) {
      sessions.delete(sessionId);
      await active.transport.close().catch(() => undefined);
      await active.server.close().catch(() => undefined);
    }

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT").finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => process.exit(0));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => resolve());
  });

  console.error(
    `MCP SSE server listening on http://${options.host}:${options.port} (GET /sse, POST /messages, GET /health)`
  );
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const service = await createCloudBrainService();

  if (options.transport === "sse") {
    await startSseServer(service, options);
    return;
  }

  const server = createMcpServer(service);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("SUPABASE_URL") || message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    console.error(
      "Cloud Brain MCP requires Supabase configuration.\n\n" +
        "Set these environment variables:\n" +
        "  SUPABASE_URL=https://your-project.supabase.co\n" +
        "  SUPABASE_SERVICE_ROLE_KEY=your-key\n" +
        "  OPENAI_API_KEY=your-key (or set LOCAL_ONLY=true)\n\n" +
        "Run 'npx cloud-brain init' for guided setup."
    );
  } else {
    console.error("MCP server failed to start:", message);
  }
  process.exit(1);
});
