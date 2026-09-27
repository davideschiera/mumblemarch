// Copy added by e4b-selection-cursor (owner of this file); re-exported from ../strings.ts.
// Export names must be unique across all strings files (prefix them, e.g. SELECTION_...).
import type { SelectionFilter } from '../../core/picking.ts';

/**
 * Plural noun for the DESIGN §6.3.1 "No {plural} here" focus label, shown when the filter chip
 * excludes every selectable mumble under the pointer (`all` never triggers it: the filter never
 * excludes anyone then).
 */
export const SELECTION_FILTER_PLURAL: Readonly<Record<SelectionFilter, string>> = {
  all: 'mumbles',
  walkers: 'walkers',
  'facing-left': 'mumbles facing left',
  'facing-right': 'mumbles facing right',
};
