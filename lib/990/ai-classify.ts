import OpenAI from 'openai';
import { CATEGORIES, isValidCategoryId } from './taxonomy';

// ---------------------------------------------------------------------------
//  Types
// ---------------------------------------------------------------------------

export interface TransactionInput {
  qboId: string;
  sourceType: string;
  description: string | null;
  amount: number;
  vendorName: string | null;
  customerName: string | null;
  accountName: string | null;
}

export interface ClassifyResult {
  qboId: string;
  irs990Category: string | null;
  confidence: number;
}

export type ClassifyBatchFn = (
  transactions: TransactionInput[]
) => Promise<ClassifyResult[]>;

// ---------------------------------------------------------------------------
//  Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 20;
const MAX_RETRIES = 3;
const CONFIDENCE_THRESHOLD = 0.7;

const TAXONOMY_PROMPT = CATEGORIES.map(
  (c) => `${c.id}: ${c.label} (Part ${c.part} Line ${c.line}) — ${c.description}`
).join('\n');

const SYSTEM_PROMPT = `You are a nonprofit accounting expert. Classify each transaction into the correct IRS Form 990 line item category.

Available categories:
${TAXONOMY_PROMPT}

For each transaction, return a JSON object with this structure:
{
  "classifications": [
    { "qboId": "<id>", "irs990Category": "<category_id>", "confidence": <0.0-1.0> }
  ]
}

Rules:
- Use ONLY category IDs from the list above
- Set confidence 0.0-1.0 based on how certain you are
- Consider the sourceType, description, amount, vendor/customer, and linked account name
- For ambiguous transactions, prefer the most common/likely category
- Return exactly one classification per transaction`;

// ---------------------------------------------------------------------------
//  Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function formatTransactionForPrompt(t: TransactionInput): string {
  const parts = [
    `ID: ${t.qboId}`,
    `Type: ${t.sourceType}`,
    `Amount: $${Math.abs(t.amount).toFixed(2)}`,
  ];
  if (t.description) parts.push(`Description: ${t.description}`);
  if (t.vendorName) parts.push(`Vendor: ${t.vendorName}`);
  if (t.customerName) parts.push(`Customer: ${t.customerName}`);
  if (t.accountName) parts.push(`Account: ${t.accountName}`);
  return parts.join(' | ');
}

// ---------------------------------------------------------------------------
//  Single batch call with retry
// ---------------------------------------------------------------------------

async function classifySingleBatch(
  client: OpenAI,
  batch: TransactionInput[]
): Promise<ClassifyResult[]> {
  const userPrompt = batch
    .map((t, i) => `${i + 1}. ${formatTransactionForPrompt(t)}`)
    .join('\n');

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Classify these ${batch.length} transactions:\n\n${userPrompt}` },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response from OpenAI');

      const parsed = JSON.parse(content) as {
        classifications?: Array<{
          qboId: string;
          irs990Category: string;
          confidence: number;
        }>;
      };

      if (!parsed.classifications || !Array.isArray(parsed.classifications)) {
        throw new Error('Response missing classifications array');
      }

      return parsed.classifications.map((c) => ({
        qboId: c.qboId,
        irs990Category: isValidCategoryId(c.irs990Category) ? c.irs990Category : null,
        confidence: typeof c.confidence === 'number' ? c.confidence : 0,
      }));
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (
        error instanceof OpenAI.APIError &&
        error.status === 429
      ) {
        const retryAfter = Number(error.headers?.['retry-after']) || 0;
        const waitMs = retryAfter > 0
          ? retryAfter * 1000
          : Math.pow(2, attempt) * 1000;
        console.warn(
          `[ai-classify] Rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
        );
        await sleep(waitMs);
        continue;
      }

      if (attempt < MAX_RETRIES - 1) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.warn(
          `[ai-classify] Attempt ${attempt + 1} failed: ${lastError.message}, retrying in ${backoff}ms`
        );
        await sleep(backoff);
      }
    }
  }

  console.error(`[ai-classify] Batch failed after ${MAX_RETRIES} attempts:`, lastError?.message);
  return batch.map((t) => ({
    qboId: t.qboId,
    irs990Category: null,
    confidence: 0,
  }));
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

export interface AIClassifyResult {
  results: ClassifyResult[];
  failedBatches: number;
  lowConfidenceCount: number;
}

/**
 * Classify transactions using GPT-4o-mini in batches.
 * Returns results for all transactions; those below the confidence threshold
 * have irs990Category set to null.
 */
export async function classifyTransactionsWithAI(
  transactions: TransactionInput[]
): Promise<AIClassifyResult> {
  if (transactions.length === 0) {
    return { results: [], failedBatches: 0, lowConfidenceCount: 0 };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[ai-classify] OPENAI_API_KEY not set — skipping AI classification');
    return {
      results: transactions.map((t) => ({
        qboId: t.qboId,
        irs990Category: null,
        confidence: 0,
      })),
      failedBatches: 0,
      lowConfidenceCount: transactions.length,
    };
  }

  const client = new OpenAI({ apiKey });
  const batches = chunk(transactions, BATCH_SIZE);

  const batchResults = await Promise.allSettled(
    batches.map((batch) => classifySingleBatch(client, batch))
  );

  const allResults: ClassifyResult[] = [];
  let failedBatches = 0;
  let lowConfidenceCount = 0;

  for (let i = 0; i < batchResults.length; i++) {
    const result = batchResults[i];
    if (result.status === 'fulfilled') {
      for (const r of result.value) {
        if (r.confidence < CONFIDENCE_THRESHOLD) {
          lowConfidenceCount++;
          allResults.push({ ...r, irs990Category: null });
        } else {
          allResults.push(r);
        }
      }
    } else {
      failedBatches++;
      console.error(`[ai-classify] Batch ${i} rejected:`, result.reason);
      for (const t of batches[i]) {
        allResults.push({ qboId: t.qboId, irs990Category: null, confidence: 0 });
        lowConfidenceCount++;
      }
    }
  }

  return { results: allResults, failedBatches, lowConfidenceCount };
}
