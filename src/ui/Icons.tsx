import type { ReactNode } from "react";

interface IconDef {
  viewBox?: string;
  content: ReactNode;
}

const ICONS: Record<string, IconDef> = {
  check: { content: <path d="M2 8.5l3.5 3.5L14 4" /> },
  heart: {
    content: <path d="M8 13.5S2 10 2 6a3 3 0 015.5-1.7A3 3 0 0114 6c0 4-6 7.5-6 7.5z" />,
  },
  clock: {
    content: (
      <>
        <circle cx="8" cy="8" r="6" />
        <path d="M8 4.5V8l2.5 1.5" />
      </>
    ),
  },
  user: {
    content: (
      <>
        <circle cx="8" cy="5.5" r="2.5" />
        <path d="M3 13.5c.6-2.4 2.5-3.5 5-3.5s4.4 1.1 5 3.5" />
      </>
    ),
  },
  lock: {
    content: (
      <>
        <rect x="3" y="7" width="10" height="7" rx="1.5" />
        <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
      </>
    ),
  },
  chat: { content: <path d="M2.5 3.5h11v7h-6l-3 3v-3h-2z" /> },
  logout: {
    content: <path d="M6 2.5H3.5v11H6M10 5l3 3-3 3M13 8H6.5" />,
  },
  plus: { content: <path d="M8 3v10M3 8h10" /> },
  menu: { content: <path d="M2.5 4h11M2.5 8h11M2.5 12h11" /> },
  star: {
    content: (
      <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />
    ),
  },
  attach: {
    content: (
      <path d="M13.5 7.5l-5 5a3 3 0 01-4.2-4.2l5.5-5.5a2 2 0 012.8 2.8L7.2 11.2a1 1 0 01-1.4-1.4l4.7-4.7" />
    ),
  },
  send: { content: <path d="M14 2L7 9M14 2l-4.5 12L7 9 2 6.5 14 2z" /> },
  eye: {
    content: (
      <>
        <path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
        <circle cx="8" cy="8" r="2" />
      </>
    ),
  },
  sparkle: {
    viewBox: "0 0 24 24",
    content: (
      <path d="M12 2.5c.6 4.8 2.7 7 7.5 7.5-4.8.6-6.9 2.7-7.5 7.5-.6-4.8-2.7-6.9-7.5-7.5 4.8-.5 6.9-2.7 7.5-7.5zM19 15.5c.3 2 1.1 2.9 3 3.2-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.2 3-3.2z" />
    ),
  },
  file: {
    content: (
      <>
        <path d="M4 1.5h5l3 3v10H4z" />
        <path d="M9 1.5v3h3M6 8h4M6 10.5h4" />
      </>
    ),
  },
  camera: {
    content: (
      <>
        <rect x="2" y="4" width="12" height="9" rx="1.5" />
        <circle cx="8" cy="8.5" r="2.2" />
        <path d="M5.5 4l1-1.5h3L10.5 4" />
      </>
    ),
  },
  shield: {
    content: <path d="M8 1.8l5 2v4.4c0 3.2-2.1 5.4-5 6-2.9-.6-5-2.8-5-6V3.8z" />,
  },
  arrowLeft: { content: <path d="M13 8H3M7 4L3 8l4 4" /> },
  close: { content: <path d="M4 4l8 8M12 4l-8 8" /> },
  pencil: {
    content: (
      <>
        <path d="M10.5 2.5l3 3-7.5 7.5-3.5.5.5-3.5z" />
        <path d="M9 4l3 3" />
      </>
    ),
  },
  trash: {
    content: (
      <>
        <path d="M2.5 4h11M6 4V2.5h4V4M4 4l.6 9.5h6.8L12 4" />
        <path d="M6.5 6.5v4.5M9.5 6.5v4.5" />
      </>
    ),
  },
};

export function Icon({ name, className }: { name: keyof typeof ICONS | string; className?: string }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg viewBox={icon.viewBox ?? "0 0 16 16"} className={className} aria-hidden="true">
      {icon.content}
    </svg>
  );
}

export function Logo() {
  return (
    <span className="logo" aria-hidden="true">
      <span>JKN</span>
    </span>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <Logo />
      Pandu JKN
    </div>
  );
}
