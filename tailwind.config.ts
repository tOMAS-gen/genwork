import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        field: "var(--field)",
        floating: "var(--floating)",
        text: "var(--text)",
        muted: "var(--muted)",
        border: "var(--border)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        ok: "var(--ok)",
        primary: "var(--primary)",
        "hover-soft": "var(--hover-soft)",
        "tag-work": "var(--tag-work)",
        "tag-work-bg": "var(--tag-work-bg)",
        "tag-exec": "var(--tag-exec)",
        "tag-exec-bg": "var(--tag-exec-bg)",
        "tag-ref": "var(--tag-ref)",
        "tag-ref-bg": "var(--tag-ref-bg)",
        "tag-user": "var(--tag-user)",
        "tag-user-bg": "var(--tag-user-bg)",
        "tag-label": "var(--tag-label)",
        "tag-label-bg": "var(--tag-label-bg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        control: "var(--radius-control)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-xs)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-sm)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-base)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-lg)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-xl)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-2xl)" }],
      },
    },
  },
};

export default config;
