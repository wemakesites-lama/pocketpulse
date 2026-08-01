export { EXTRACTION_SYSTEM_PROMPT, buildExtractionUserMessage } from "./extraction";
export {
  INSIGHT_SYSTEM_PROMPT,
  buildInsightUserMessage,
  type InsightSummary,
} from "./insight";

// 4.7 Repair retry — appended on a Zod failure, retried ONCE. Two failures makes the
// record `unparseable_record`. Never a third retry.
export function buildRepairMessage(zodError: string): string {
  return `Your previous response failed validation with this error:
${zodError}
Return corrected JSON only. No prose, no markdown fences.`;
}
