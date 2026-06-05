type Props = {
  message: string;
};

export function ReportEmptyState({ message }: Props) {
  return (
    <p className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
      {message}
    </p>
  );
}
