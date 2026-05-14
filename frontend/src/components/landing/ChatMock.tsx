export function ChatMock() {
  return (
    <div className="flex flex-col gap-5 p-5">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-sm text-primary-foreground shadow-sm">
          What are my chances for IT at Hanoi University of Science and Technology
          with a score of 27.5?
        </div>
      </div>

      {/* AI response */}
      <div className="flex justify-start">
        <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-secondary px-4 py-3 text-sm text-secondary-foreground shadow-sm space-y-3">
          <p className="leading-relaxed">
            Based on the{" "}
            <strong>2024 MoET Admissions Regulation</strong>
            <CitationBadge num={1} />, your score of{" "}
            <strong>27.5</strong> places you in the{" "}
            <strong>85th percentile</strong> for IT at{" "}
            <strong>HUST</strong>
            <CitationBadge num={2} />. This falls within the{" "}
            <span className="font-semibold text-amber-600">Target 🟡</span>{" "}
            tier — competitive but achievable.
          </p>
          <p className="leading-relaxed">
            The 2024 cutoff for{" "}
            <strong>Computer Science (IT)</strong> was{" "}
            <strong>27.0</strong>, and the historical trend shows a slight
            upward movement of +0.3 points per year.
          </p>

          {/* Citation reference chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs text-muted-foreground border border-border/50">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                1
              </span>
              MoET 2024 Admissions Regulation
            </span>
            <span className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-xs text-muted-foreground border border-border/50">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
                2
              </span>
              HUST IT Cutoff Scores 2023–2024
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitationBadge({ num }: { num: number }) {
  return (
    <sup className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ml-0.5 -translate-y-0.5">
      {num}
    </sup>
  );
}