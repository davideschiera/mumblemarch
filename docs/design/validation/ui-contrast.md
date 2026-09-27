# UI Design Validation Report

**RESULT: FAIL (1 issue)**

Generated: 2026-09-26

## Task A: WCAG 2.2 Contrast Ratio Verification

### Stated Contrast Ratios (±0.1 tolerance)

| Foreground | Background | Stated | Actual | Diff | Status |
|---|---|---|---|---|---|
| --color-text | --color-bg | 16.8 | 16.81 | 0.01 | PASS |
| --color-text | --color-surface | 15.0 | 14.99 | 0.01 | PASS |
| --color-text | --color-surface-raised | 12.6 | 12.60 | 0.00 | PASS |
| --color-text | --color-surface-sunken | 17.9 | 17.90 | 0.00 | PASS |
| --color-text-muted | --color-bg | 10.8 | 10.82 | 0.02 | PASS |
| --color-text-muted | --color-surface | 9.6 | 9.64 | 0.04 | PASS |
| --color-text-muted | --color-surface-raised | 8.1 | 8.11 | 0.01 | PASS |
| --color-text-faint | --color-surface | 6.4 | 6.35 | 0.05 | PASS |
| --color-text-faint | --color-surface-raised | 5.3 | 5.33 | 0.03 | PASS |
| --color-text-faint | --color-surface-sunken | 7.6 | 7.58 | 0.02 | PASS |
| --color-accent | --color-bg | 12.0 | 11.96 | 0.04 | PASS |
| --color-accent | --color-surface-raised | 9.0 | 8.96 | 0.04 | PASS |
| --color-accent-contrast | --color-accent | 11.0 | 10.97 | 0.03 | PASS |
| --color-secondary | --color-surface | 7.1 | 7.08 | 0.02 | PASS |
| --color-accent-contrast | --color-secondary | 7.3 | 7.28 | 0.02 | PASS |
| --color-success | --color-surface | 10.0 | 9.96 | 0.04 | PASS |
| --color-success | --color-surface-sunken | 11.9 | 11.89 | 0.01 | PASS |
| --color-warning | --color-surface | 9.3 | 9.27 | 0.03 | PASS |
| --color-warning | --color-surface-sunken | 11.1 | 11.07 | 0.03 | PASS |
| --color-danger | --color-surface | 6.2 | 6.23 | 0.03 | PASS |
| --color-danger | --color-surface-raised | 5.2 | 5.23 | 0.03 | PASS |
| --color-accent-contrast | --color-danger | 6.4 | 6.41 | 0.01 | PASS |
| --color-info | --color-surface | 8.0 | 8.03 | 0.03 | PASS |
| --color-focus | --color-bg | 12.3 | 12.34 | 0.04 | PASS |
| --color-focus | --color-surface | 11.0 | 11.00 | 0.00 | PASS |
| --color-focus | --color-surface-raised | 9.3 | 9.25 | 0.05 | PASS |
| --color-border | --color-bg | 4.3 | 4.31 | 0.01 | PASS |
| --color-border | --color-surface | 3.8 | 3.84 | 0.04 | PASS |
| --color-border | --color-surface-raised | 3.2 | 3.23 | 0.03 | PASS |
| --color-border-strong | --color-surface-raised | 5.6 | 5.57 | 0.03 | PASS |
| --color-surface-hover | --color-text (inverted) | 10.1 | 10.09 | 0.01 | PASS |

**Summary: 31/31 stated ratios verified within tolerance**

### WCAG Requirement Checks

| Requirement | Min Ratio | Actual | Status |
|---|---|---|---|
| --color-text on bg | 4.5:1 | 16.81 | PASS |
| --color-text on surface | 4.5:1 | 14.99 | PASS |
| --color-text on surface-raised | 4.5:1 | 12.60 | PASS |
| --color-text on surface-hover | 4.5:1 | 10.09 | PASS |
| --color-text on surface-sunken | 4.5:1 | 17.90 | PASS |
| --color-text-muted on bg | 4.5:1 | 10.82 | PASS |
| --color-text-muted on surface | 4.5:1 | 9.64 | PASS |
| --color-text-muted on surface-raised | 4.5:1 | 8.11 | PASS |
| --color-text-muted on surface-hover | 4.5:1 | 6.49 | PASS |
| --color-text-muted on surface-sunken | 4.5:1 | 11.51 | PASS |
| --color-text-faint on surface | 4.5:1 | 6.35 | PASS |
| --color-text-faint on surface-raised | 4.5:1 | 5.33 | PASS |
| **--color-text-faint on surface-hover** | **4.5:1** | **4.27** | **FAIL** |
| --color-text-faint on surface-sunken | 4.5:1 | 7.58 | PASS |
| --color-accent-contrast on --color-accent | 4.5:1 | 10.97 | PASS |
| --color-plum on --color-danger | 4.5:1 | 6.41 | PASS |
| --color-plum on --color-secondary | 4.5:1 | 7.28 | PASS |
| --color-success on surface | 4.5:1 | 9.96 | PASS |
| --color-success on surface-sunken | 4.5:1 | 11.89 | PASS |
| --color-warning on surface | 4.5:1 | 9.27 | PASS |
| --color-warning on surface-sunken | 4.5:1 | 11.07 | PASS |
| --color-danger on surface | 4.5:1 | 6.23 | PASS |
| --color-danger on surface-sunken | 4.5:1 | 7.43 | PASS |
| --color-info on surface | 4.5:1 | 8.03 | PASS |
| --color-info on surface-sunken | 4.5:1 | 9.59 | PASS |
| --color-focus on bg | 3.0:1 | 12.34 | PASS |
| --color-focus on surface | 3.0:1 | 11.00 | PASS |
| --color-focus on surface-raised | 3.0:1 | 9.25 | PASS |
| --color-border on bg | 3.0:1 | 4.31 | PASS |
| --color-border on surface | 3.0:1 | 3.84 | PASS |

**Summary: 29/30 requirements PASS, 1 FAIL**

## Task B: Mockup Geometry and Console

### Element Dimensions (at 1280×720 viewport)

| Element | Width | Height | Status |
|---|---|---|---|
| #play (canvas rendered) | 1200 | 480 | PASS |
| .status | 780 | 44 | PASS |
| .minimap-well | 412 | 44 | PASS |
| #toolbar | 1200 | 88 | PASS |

### Button Size Validation

| Type | Count | Min Size | Status |
|---|---|---|---|
| Regular buttons (RR, skills, controls) | 14 | 44×44 | PASS |
| Chip button (Pick filter) | 1 | 24 min height | PASS (32px) |

All buttons meet minimum touch target sizes per WCAG 2.5.5.

### Layout Checks

| Check | Result | Status |
|---|---|---|
| #play exactly 1200×480 | Yes | PASS |
| All buttons ≥44×44 (or ≥24 for chips) | Yes | PASS |
| No toolbar button overlaps | Yes | PASS |
| Status and minimap-well same row (y=504) | Yes | PASS |
| Toolbar bottom ≤720 (actual 644) | Yes | PASS |
| Status scrollWidth ≤ clientWidth (776 ≤ 776) | Yes | PASS |

### Console Messages

| Type | Count | Status |
|---|---|---|
| File load error (sprites.js) | 1 | Expected (file not in mockups dir) |
| CORS/security notice | 1 | Expected (file:// origin) |

No unexpected errors detected. The 404 for `sprites.js` is expected per task specification.

## Issues Found

### Critical Issues

1. **Text faint color insufficient contrast on hover surface**
   - **Location:** Used for hint text, key labels ("1", "2", etc.)
   - **Problem:** `--color-text-faint` (#a39cc7) on `--color-surface-hover` (#3a3470) = 4.27:1, below 4.5:1 minimum
   - **Guidance:** Use `--color-text-muted` (9.64:1) for text-faint elements on hover states, or adjust hover background to darker tone

## Summary

- **Task A:** All 31 stated contrast ratios verified; 1 of 30 requirements failed (text-faint on hover surface)
- **Task B:** All geometry and layout checks passed; console clean per spec
- **Token hex values:** All match between ui.md table and mockup.css `:root`

## Resolution (design lead, 2026-09-26)
- Fixed: `--color-text-faint` changed `#a39cc7` → `#b0a9d4` in `mockups/mockup.css` and the ui.md token table (now carried into DESIGN.md §5.2). Recomputed: 4.97:1 on surface-hover, 6.21 on raised, 7.39 on surface, 8.82 on sunken, 8.28 on bg → all ≥ 4.5:1. Re-verified by the V6 final review.
