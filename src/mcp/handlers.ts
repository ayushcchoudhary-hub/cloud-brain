import type { ZodSchema } from "zod";

import { coverageAngles, formatList } from "../search/coverage.js";
import type { CloudBrainService, PullOutcome } from "../service.js";
import type { Quote } from "../types.js";
import { feedbackArgs, historyArgs, pullArgs, quoteArgs, searchArgs, settleArgs } from "./tools.js";

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

const usd = (amount: number) => `$${amount.toFixed(2)} USDC`;

function reply(text: string, data: Record<string, unknown>): ToolResult {
  return { content: text ? [{ type: "text", text }] : [], structuredContent: data };
}

function fail(text: string): ToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

/** Low-noise: no match means an empty result, so the agent just carries on. */
const noMatch = (): ToolResult => reply("", { status: "no_match" });

function parse<T>(schema: ZodSchema<T>, args: unknown): T | ToolResult {
  const parsed = schema.safeParse(args);
  return parsed.success ? parsed.data : fail(`Invalid arguments: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}

const isResult = (value: unknown): value is ToolResult =>
  typeof value === "object" && value !== null && "content" in value;

export function formatPull(outcome: PullOutcome | { status: "quote_invalid"; message: string }): ToolResult {
  switch (outcome.status) {
    case "no_match":
      return noMatch();
    case "quote_invalid":
      return fail(outcome.message);
    case "blocked_by_limit":
      return reply(
        `Not pulled. ${outcome.message} Nothing was charged.`,
        { ...outcome }
      );
    case "blocked_by_safety": {
      const reasons = [
        ...outcome.safety.injectionDropped.map((d) => `${d.pagePath} looks like prompt injection`),
        ...outcome.safety.hashMismatchDropped.map((p) => `${p} changed since it was published`)
      ];
      return reply(`Not pulled. ${reasons.join("; ")}. Nothing was charged.`, { ...outcome });
    }
    case "delivered": {
      const header =
        outcome.source === "own"
          ? `From your own wiki (free, ${outcome.citations.length} pages):`
          : `Compiled research from ${outcome.contributor} (${outcome.citations.length} pages):`;
      const lines = [header, outcome.synthesis, `Sources: ${outcome.citations.map((c) => c.pagePath.split("/").pop()).join(", ")}`];
      if (outcome.receipt) {
        lines.push(
          `SIMULATED payment: ${usd(outcome.receipt.amountUsdc)} to ${outcome.receipt.payee}. Receipt ${outcome.receipt.receiptId}. No real funds moved.`
        );
      }
      return reply(lines.join("\n"), { ...outcome });
    }
  }
}

function formatQuote(quote: Quote): string {
  return `Quote ${quote.id}: ${usd(quote.amountUsdc)} (simulated) for ${quote.contributorDisplayName}'s "${quote.topPageTitle}". Expires ${quote.expiresAt}.`;
}

type Handler = (service: CloudBrainService, args: unknown) => Promise<ToolResult>;

export const handlers: Record<string, Handler> = {
  async cloud_brain_search(service, raw) {
    const args = parse(searchArgs, raw);
    if (isResult(args)) return args;
    const match = await service.findMatch(args.query);
    if (!match) return noMatch();

    const { top, alternative, results } = match;
    const fromSame = results.filter(
      (r) => r.contributorId === top.contributorId && r.confidence !== "low"
    );
    const covers = coverageAngles(fromSame);
    const lines = top.isOwn
      ? [`Your own wiki covers this: ${formatList(covers)}. Free.`]
      : [
          `Found compiled research from ${top.contributorDisplayName}. It covers ${formatList(covers)}.`,
          `Price: ${usd(top.priceUsdc)} (simulated). Ask the user before pulling.`
        ];
    if (alternative) {
      lines.push(
        `Also available from ${alternative.contributorDisplayName}: "${alternative.pageTitle}", ${usd(alternative.priceUsdc)} (simulated).`
      );
    }
    lines.push(`To pull: cloud_brain_pull with contributor "${top.contributorHandle}".`);

    return reply(lines.join("\n"), {
      status: top.isOwn ? "own_research_available" : "network_research_available",
      contributor: top.contributorHandle,
      covers,
      price_usdc: top.priceUsdc,
      simulated: true,
      top_match: { page_title: top.pageTitle, page_path: top.pagePath, score: top.score, confidence: top.confidence },
      alternative: alternative
        ? { contributor: alternative.contributorHandle, page_title: alternative.pageTitle, price_usdc: alternative.priceUsdc }
        : null
    });
  },

  async cloud_brain_pull(service, raw) {
    const args = parse(pullArgs, raw);
    if (isResult(args)) return args;
    return formatPull(
      await service.pull(args.query, { contributorHandle: args.contributor, maxPriceUsdc: args.max_price_usdc })
    );
  },

  async cloud_brain_feedback(service, raw) {
    const args = parse(feedbackArgs, raw);
    if (isResult(args)) return args;
    const saved = await service.feedback({
      receiptId: args.receipt_id,
      useful: args.useful,
      rating: args.rating,
      comment: args.comment
    });
    const rating = saved.rating ? `, ${saved.rating}/5` : "";
    const reputation =
      saved.reputation === undefined
        ? ""
        : ` ${saved.contributorDisplayName}'s reputation: ${saved.previousReputation !== undefined ? `${saved.previousReputation.toFixed(2)} -> ` : ""}${saved.reputation.toFixed(2)} of 5.`;
    return reply(`Feedback saved for ${saved.receiptId} (${saved.useful ? "useful" : "not useful"}${rating}).${reputation}`, {
      status: "feedback_recorded",
      ...saved
    });
  },

  async cloud_brain_quote(service, raw) {
    const args = parse(quoteArgs, raw);
    if (isResult(args)) return args;
    const quote = await service.createQuote(args.query, { contributorHandle: args.contributor });
    return quote ? reply(formatQuote(quote), { ...quote, status: "quoted" }) : noMatch();
  },

  async cloud_brain_settle(service, raw) {
    const args = parse(settleArgs, raw);
    if (isResult(args)) return args;
    return formatPull(await service.settleQuote(args.quote_id));
  },

  async cloud_brain_history(service, raw) {
    const args = parse(historyArgs, raw);
    if (isResult(args)) return args;
    const rows = await service.history({ limit: args.limit });
    const text = rows.length
      ? rows
          .map(({ payment, feedback }) => {
            const fb = feedback ? (feedback.useful ? "useful" : "not useful") : "no feedback";
            return `${payment.createdAt} ${payment.receiptId} ${usd(payment.amountUsdc)} to ${payment.contributorDisplayName} for "${payment.matchedPageTitle}" (${fb})`;
          })
          .join("\n")
      : "No simulated payments yet.";
    return reply(text, { status: "ok", simulated: true, history: rows });
  },

  async cloud_brain_marketplace_summary(service) {
    const s = await service.summary();
    const top = s.topContributors
      .map((c) => `${c.displayName}: ${c.totalPulls} pulls, ${usd(c.totalEarningsUsdc)}, reputation ${c.reputation.toFixed(2)}`)
      .join("\n");
    return reply(
      `All figures simulated. ${s.totalPulls} pulls, ${usd(s.grossVolumeUsdc)} total, ${s.quotesCreated} quotes, ${s.feedbackCount} feedback.\n${top}`,
      { status: "ok", simulated: true, ...s }
    );
  }
};
