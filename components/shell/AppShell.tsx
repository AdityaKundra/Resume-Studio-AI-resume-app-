import type { ReactNode } from "react";

type Props = {
  sidebar: ReactNode;
  topNav: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function AppShell({ sidebar, topNav, children, footer }: Props) {
  return (
    <div className="relative z-[1] flex h-[100dvh] min-h-0 max-h-[100dvh] overflow-hidden bg-transparent">
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {topNav}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
