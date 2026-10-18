// Theme logic shared by the desktop button and the mobile menu switch.

/** Dark when the reader chose dark, or chose nothing and the system is dark. */
export function resolveDark(stored, systemDark) {
  return stored === "dark" || (!stored && Boolean(systemDark));
}

/**
 * Props for the menu's 「深色模式」 row: a native button, so the whole row is
 * clickable and Space and Enter toggle it; role="switch" with aria-checked
 * taken from the same state on every render.
 */
export function themeSwitchProps(dark, onToggle) {
  return { type: "button", role: "switch", "aria-checked": Boolean(dark), onClick: onToggle };
}
