/**
 * control-center/ui — tab registration contract
 *
 * Every consuming dashboard provides a getTabRegistrations(ctx) → TabRegistration[]
 * function. The shell reads this contract and renders the rail accordingly.
 *
 * This file is framework-agnostic. It has no Astro or framework imports.
 */

export type ComponentKind = 'overview' | 'custom' | 'passthrough';
export type PermissionLevel = 'authenticated' | 'owner';

export interface TabBadge {
  count: number;
  tone: 'ok' | 'warn' | 'danger';
  label: string; // e.g. "expires in 4d"
}

export interface TabRegistration {
  path: string;                // Astro route, e.g. '/' or '/openclaw'
  label: string;               // e.g. "openclaw"
  icon: string;                // sprite name, e.g. 'terminal'
  component_kind: ComponentKind;
  title?: string;              // Page <title>; falls back to label
  passthrough_url?: string;    // required when component_kind === 'passthrough'
  permissions?: PermissionLevel; // default 'authenticated'
  badge?: TabBadge;            // computed at request time, optional
}

/**
 * Section groupings for the tab rail.
 * Rail items are grouped by section label in the TabRail component.
 */
export interface RailSection {
  label: string;
  tabs: TabRegistration[];
}
