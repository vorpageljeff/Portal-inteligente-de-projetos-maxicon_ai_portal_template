export type ClosingMode = "ai" | "manual" | null;

export function closingProgress({
  hasCycle,
  mode,
  dataReady,
  blockingIssueCount,
  reviewed,
  published,
}: {
  hasCycle: boolean;
  mode: ClosingMode;
  dataReady: boolean;
  blockingIssueCount: number;
  reviewed: boolean;
  published: boolean;
}) {
  const validated = dataReady && blockingIssueCount === 0;
  const completed = [hasCycle, mode !== null, dataReady, validated, reviewed, published];
  const maxAccessibleStep = !hasCycle
    ? 1
    : !mode
      ? 2
      : !dataReady
        ? 3
        : blockingIssueCount
          ? 4
          : !reviewed
            ? 5
            : 6;

  return { completed, maxAccessibleStep };
}
