export type JudgeBallotResultRow = {
  rank: number;
  vehicleEntryCode: string;
  vehicleNickname: string | null;
  year: number;
  make: string;
  model: string;
  vehicleClass: string;
  totalVotes: number;
  judgeCount: number;
  isTied: boolean;
};

export function JudgeBallotResultsTable({ rows }: { rows: JudgeBallotResultRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No votes recorded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Rank</th>
            <th className="py-2 pr-3 font-medium">Entry Code</th>
            <th className="py-2 pr-3 font-medium">Vehicle</th>
            <th className="py-2 pr-3 font-medium">Vehicle Class</th>
            <th className="py-2 pr-3 font-medium">Total Votes</th>
            <th className="py-2 font-medium">Judges</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.vehicleEntryCode} className="border-b last:border-0">
              <td className="py-2 pr-3">
                {row.rank}
                {row.isTied ? (
                  <span className="ml-1 text-xs text-amber-600">(tie)</span>
                ) : null}
              </td>
              <td className="py-2 pr-3 font-mono">{row.vehicleEntryCode}</td>
              <td className="py-2 pr-3">
                {row.vehicleNickname ? (
                  <span className="font-medium">{row.vehicleNickname}</span>
                ) : null}
                <span
                  className={
                    row.vehicleNickname
                      ? " block text-xs text-muted-foreground"
                      : ""
                  }
                >
                  {row.year} {row.make} {row.model}
                </span>
              </td>
              <td className="py-2 pr-3">{row.vehicleClass}</td>
              <td className="py-2 pr-3 font-medium">{row.totalVotes}</td>
              <td className="py-2">{row.judgeCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
