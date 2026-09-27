/**
 * SkillsControl — choosing skills and assigning them (DESIGN §6.1.1 rows 1–4, §6.2.2), plus all
 * feedback for a player command's events: refusal status/toast/skill-button flash/announcement
 * (§6.5, §7.3 #7), accepted-assignment announcement (#6, "Starts when you resume" while paused),
 * pending ids (§6.4.1) and Settings → Pause while choosing (§7.11).
 * Refusal SOUNDS come from EventSounds (audio, via the `skill-rejected` event); this module only
 * plays UI sounds for choices/attempts that send no command (ui-select, ui-empty, ui-deny).
 * Writes PlayState: selectedSkill; adds to pendingIds.
 * Owner: E5a.
 */
import type { GameCommand, GameEvent, Rejection, SkillId } from '../../core/types.ts';
import { ANNOUNCE, GAME_NO_SKILL_CHOSEN, REFUSAL, STATUS, refusalText } from '../../ui/strings.ts';
import { STATUS_REFUSAL_MS } from '../config.ts';
import type { CommandSource, PlayContext } from './context.ts';
import { refusalShowsFullFeedback } from './refusal-feedback.ts';
import { nextSkillWithCount } from './skills-step.ts';

export class SkillsControl {
  private readonly ctx: PlayContext;

  constructor(ctx: PlayContext) {
    this.ctx = ctx;
  }

  /**
   * §6.1.1 choose skill 1–8 / skill button: a skill with 0 left cannot be newly chosen (selection
   * unchanged, `ui-empty`, #3 "No diggers left"); otherwise select it, `ui-select`, #2 "{Skill},
   * {n} left". §7.11 `pauseWhileChoosing`: a successful choice pauses the game, unless it is
   * already paused (a player pause, or an earlier choice, is left untouched).
   */
  choose(skill: SkillId, _source: CommandSource): void {
    const { state, session } = this.ctx;
    const left = session.skills[skill];
    if (left === 0 && state.selectedSkill !== skill) {
      const text = ANNOUNCE.skillEmpty(skill);
      this.ctx.uiSound('ui-empty');
      this.ctx.view.flashRefusal(skill);
      this.ctx.setStatus(text, 'refusal', STATUS_REFUSAL_MS);
      this.ctx.say(text, { key: 'skill', userInitiated: true });
      return;
    }
    state.selectedSkill = skill;
    this.ctx.uiSound(left > 0 ? 'ui-select' : 'ui-empty');
    this.ctx.say(ANNOUNCE.skillChosen(skill, left), { key: 'skill', userInitiated: true });
    if (this.ctx.settings().pauseWhileChoosing && !state.paused) {
      this.ctx.modules.flow.setPaused(true, { user: false });
    }
  }

  /** §6.1.1 Q/E: previous/next skill with a count > 0, wrapping; none → `ui-empty` + "No skills left". */
  step(step: 1 | -1): void {
    const { state, session } = this.ctx;
    const next = nextSkillWithCount(state.selectedSkill, step, session.skills);
    if (next) {
      this.choose(next, 'key');
      return;
    }
    this.ctx.uiSound('ui-empty');
    this.ctx.setStatus(STATUS.noSkillsLeft, 'refusal', STATUS_REFUSAL_MS);
    this.ctx.say(STATUS.noSkillsLeft, { key: 'skill', userInitiated: true });
  }

  /**
   * §6.1.1 Space/Enter: give the chosen skill to the target (§6.2.2). In keyboard-cursor mode
   * this locks the selection onto the target first, exactly like a mouse press (§6.2.4) — mouse
   * hover never does this on its own. No skill chosen, or no target → `ui-deny` + status/announce
   * (§6.5 `no-lemming` text for "no target").
   */
  assignToTarget(source: CommandSource): void {
    const { state, modules } = this.ctx;
    if (!state.selectedSkill) {
      this.ctx.uiSound('ui-deny');
      this.ctx.setStatus(GAME_NO_SKILL_CHOSEN, 'refusal', STATUS_REFUSAL_MS);
      this.ctx.say(GAME_NO_SKILL_CHOSEN, { key: 'refusal', userInitiated: true });
      return;
    }
    const target = modules.selection.target();
    if (!target) {
      this.ctx.uiSound('ui-deny');
      this.ctx.setStatus(REFUSAL.noTarget, 'refusal', STATUS_REFUSAL_MS);
      this.ctx.say(REFUSAL.noTarget, { key: 'refusal', userInitiated: true });
      return;
    }
    if (state.cursorMode === 'keyboard') modules.selection.select(target.id, 'pointer');
    this.assignTo(target.id, source);
  }

  /**
   * Give the chosen skill to `lemmingId` (pointer press/release, Space). Returns the command's
   * events (feedback already handled via handleCommandEvents), or null when no skill is chosen.
   */
  assignTo(lemmingId: number, source: CommandSource): readonly GameEvent[] | null {
    const skill = this.ctx.state.selectedSkill;
    if (!skill) return null;
    return this.ctx.command({ type: 'assign-skill', lemmingId, skill }, source);
  }

  /**
   * Feedback for the events one player command produced (called by the dispatch for EVERY
   * `ctx.command()`): §6.5 refusal (status 2.5 s, toast, flashRefusal, #7 polite key 'refusal';
   * `level-ended` → status only), §7.3 #6 accepted ("{Skill} assigned" / "…Starts when you
   * resume." while paused; essential for keys, 'all' for mouse), §6.4.1 pending ids, and §7.11
   * `pauseWhileChoosing`'s auto-resume on the next accepted assignment (unless the player paused
   * explicitly — `state.userPaused`).
   */
  handleCommandEvents(_command: GameCommand, events: readonly GameEvent[], source: CommandSource): void {
    const { state } = this.ctx;
    for (const event of events) {
      if (event.type === 'skill-assigned') {
        if (state.paused) state.pendingIds.push(event.lemmingId);
        this.ctx.say(ANNOUNCE.assigned(event.skill, state.paused), {
          key: 'assign',
          level: source === 'pointer' ? 'all' : 'essential',
          userInitiated: true,
        });
        if (this.ctx.settings().pauseWhileChoosing && state.paused && !state.userPaused) {
          this.ctx.modules.flow.setPaused(false);
        }
      } else if (event.type === 'skill-rejected') {
        const rejection: Rejection = { reason: event.reason, ...(event.detail !== undefined ? { detail: event.detail } : {}) };
        const text = refusalText(rejection, event.skill);
        this.ctx.setStatus(text, 'refusal', STATUS_REFUSAL_MS);
        if (!refusalShowsFullFeedback(event.reason)) continue;
        this.ctx.view.showToast(text, 'refusal');
        this.ctx.view.flashRefusal(event.skill);
        this.ctx.say(text, { key: 'refusal', userInitiated: source !== 'hook' });
      }
    }
  }
}
