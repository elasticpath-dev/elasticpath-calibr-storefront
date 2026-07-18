import type { NavItem } from "./types";

/**
 * Tiny external store bridging the Plasmic-resolved navigation items to the
 * mobile drawer. StorefrontNavigation (a code component nested inside the
 * Studio "navigation" design) publishes here as it resolves; MobileNavBar —
 * which lives outside the Plasmic tree — subscribes via useSyncExternalStore.
 *
 * States:
 * - idle:    no StorefrontNavigation has mounted (e.g. the Studio nav is
 *            purely static markup) — the drawer falls back to catalog nav.
 * - pending: items are being resolved (subtree fetches in flight).
 * - ready:   resolved NavItem[] available.
 */
export type PlasmicNavState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "ready"; items: NavItem[] };

const IDLE: PlasmicNavState = { status: "idle" };
const PENDING: PlasmicNavState = { status: "pending" };

let state: PlasmicNavState = IDLE;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function publishPlasmicNavPending(): void {
  if (state.status !== "idle") return;
  state = PENDING;
  emit();
}

export function publishPlasmicNavItems(items: NavItem[]): void {
  if (state.status === "ready" && state.items === items) return;
  state = { status: "ready", items };
  emit();
}

export function subscribeToPlasmicNav(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPlasmicNavState(): PlasmicNavState {
  return state;
}

// Server snapshot for useSyncExternalStore — always idle on the server.
export function getServerPlasmicNavState(): PlasmicNavState {
  return IDLE;
}
