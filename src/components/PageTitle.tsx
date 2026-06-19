import type { ReactNode } from "react";

export const pageTitleClassName =
  "text-3xl font-semibold tracking-[-0.03em] text-[#1e1e1e]";

interface PageTitleProps {
  children: ReactNode;
}

export function PageTitle({ children }: PageTitleProps) {
  return <h1 className={pageTitleClassName}>{children}</h1>;
}
