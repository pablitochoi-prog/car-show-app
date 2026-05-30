import type { ReactNode } from "react";

export function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-10 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-28 left-1/2 h-[min(420px,70vw)] w-[min(720px,100%)] -translate-x-1/2 rounded-[100%] bg-primary/[0.09] blur-3xl dark:bg-primary/[0.14]" />
      </div>
      <div className="relative flex w-full justify-center">{children}</div>
    </div>
  );
}
