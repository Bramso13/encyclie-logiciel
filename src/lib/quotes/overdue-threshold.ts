export function overdueThresholdActions(
  overdueByQuote: Record<string, number>,
  alreadySentQuoteIds: Iterable<string>,
  threshold = 2,
): { toSend: string[]; toClear: string[] } {
  const sent = new Set(alreadySentQuoteIds);
  const toSend: string[] = [];
  const toClear: string[] = [];

  for (const [quoteId, count] of Object.entries(overdueByQuote)) {
    if (count >= threshold && !sent.has(quoteId)) {
      toSend.push(quoteId);
    }
  }

  for (const quoteId of sent) {
    if ((overdueByQuote[quoteId] ?? 0) < threshold) {
      toClear.push(quoteId);
    }
  }

  return { toSend, toClear };
}
