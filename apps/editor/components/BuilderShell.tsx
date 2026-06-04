"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, PanelsTopLeft, RefreshCw, Smartphone, Tablet } from "lucide-react";

type Device = "desktop" | "tablet" | "mobile";
type Tab = "edit" | "preview";

const WIDTHS: Record<Device, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "390px"
};

export function BuilderShell({
  previewUrl,
  version,
  children
}: {
  previewUrl: string;
  /** Changes whenever the entry is saved → forces the iframe to reload. */
  version: string;
  children: React.ReactNode;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<Tab>("edit");
  const [nonce, setNonce] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const src = `${previewUrl}?v=${encodeURIComponent(version)}-${nonce}`;

  useEffect(() => {
    setNonce((n) => n + 1);
  }, [version]);

  return (
    <div>
      {/* Mobile-only Edit / Preview toggle (panes appear side-by-side at lg) */}
      <div className="sticky top-[65px] z-10 flex border-b border-border bg-bg lg:hidden">
        <TabButton active={tab === "edit"} onClick={() => setTab("edit")} icon={<PanelsTopLeft className="h-4 w-4" />}>
          Edit
        </TabButton>
        <TabButton active={tab === "preview"} onClick={() => setTab("preview")} icon={<Monitor className="h-4 w-4" />}>
          Preview
        </TabButton>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_minmax(440px,520px)]">
        {/* Live preview canvas */}
        <div
          className={`${tab === "preview" ? "block" : "hidden"} border-b border-border bg-surface lg:block lg:border-b-0 lg:border-r`}
        >
          <div className="sticky top-[110px] h-[calc(100vh-110px)] lg:top-[65px] lg:h-[calc(100vh-65px)]">
            <div className="flex items-center justify-between border-b border-border bg-bg px-4 py-2.5">
              <div className="flex items-center gap-1">
                <DeviceButton active={device === "desktop"} onClick={() => setDevice("desktop")} label="Desktop">
                  <Monitor className="h-4 w-4" />
                </DeviceButton>
                <DeviceButton active={device === "tablet"} onClick={() => setDevice("tablet")} label="Tablet">
                  <Tablet className="h-4 w-4" />
                </DeviceButton>
                <DeviceButton active={device === "mobile"} onClick={() => setDevice("mobile")} label="Mobile">
                  <Smartphone className="h-4 w-4" />
                </DeviceButton>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-muted">Live preview</span>
                <button
                  type="button"
                  onClick={() => setNonce((n) => n + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-brand hover:text-brand"
                  aria-label="Refresh preview"
                  title="Refresh preview"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="flex h-[calc(100%-45px)] justify-center overflow-auto bg-[#f1f5f9] p-4">
              <div
                className="h-full overflow-hidden border border-border bg-white transition-all"
                style={{ width: WIDTHS[device], maxWidth: "100%" }}
              >
                <iframe ref={iframeRef} key={src} src={src} title="Page preview" className="h-full w-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Inspector */}
        <div className={`${tab === "edit" ? "block" : "hidden"} min-w-0 lg:block`}>{children}</div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 py-3 text-sm font-medium transition-colors ${
        active ? "border-brand text-text" : "border-transparent text-text-muted hover:text-text"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function DeviceButton({
  active,
  onClick,
  label,
  children
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
        active ? "bg-brand text-white" : "text-text-muted hover:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
