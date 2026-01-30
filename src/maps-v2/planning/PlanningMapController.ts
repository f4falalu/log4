/**
 * PlanningMapController.ts — Tool→Interaction state mediator.
 *
 * Sits between the UI tool buttons and the InteractionController FSM.
 * Enforces tool-specific constraints on what interaction states are reachable.
 * Does NOT modify the InteractionController's internal transition graph.
 */

import type { InteractionState } from '../core/types';
import type { InteractionController } from '../core/InteractionController';
import type { PlanningTool } from '../contracts/PlanningTypes';
import type maplibregl from 'maplibre-gl';

/** Which InteractionStates are permitted per tool */
const TOOL_CONSTRAINTS: Record<NonNullable<PlanningTool> | 'none', InteractionState[]> = {
  none: ['IDLE', 'SELECT', 'HEX_SELECT', 'INSPECT'],
  draw: ['IDLE', 'DRAW_ZONE', 'CONFIRM'],
  coverage: ['IDLE', 'INSPECT'],
  tag: ['IDLE', 'SELECT', 'HEX_SELECT', 'TAG_ZONE', 'CONFIRM', 'INSPECT'],
  compare: ['IDLE', 'SELECT', 'INSPECT'],
};

/** Cursor style per tool */
const TOOL_CURSORS: Record<NonNullable<PlanningTool> | 'none', string> = {
  none: '',
  draw: 'crosshair',
  coverage: 'default',
  tag: 'pointer',
  compare: 'pointer',
};

export class PlanningMapController {
  private interactionController: InteractionController;
  private map: maplibregl.Map | null = null;
  private activeTool: PlanningTool = null;

  constructor(interactionController: InteractionController) {
    this.interactionController = interactionController;
  }

  setMap(map: maplibregl.Map): void {
    this.map = map;
  }

  getActiveTool(): PlanningTool {
    return this.activeTool;
  }

  /**
   * Activate a planning tool. Forces IDLE first, then updates cursor.
   */
  activateTool(tool: PlanningTool): void {
    // Force back to IDLE before switching tools
    const currentState = this.interactionController.getState();
    if (currentState !== 'IDLE') {
      this.interactionController.transition('IDLE', `Tool switch to ${tool ?? 'none'}`);
    }

    this.activeTool = tool;
    this.updateCursor(tool);
  }

  /**
   * Guard: check if a target InteractionState is allowed by the current tool.
   */
  canTransitionForTool(target: InteractionState): boolean {
    const key = this.activeTool ?? 'none';
    const allowed = TOOL_CONSTRAINTS[key];
    return allowed.includes(target);
  }

  /**
   * Attempt a guarded transition. Returns false if tool rejects it.
   */
  guardedTransition(target: InteractionState, reason?: string): boolean {
    if (!this.canTransitionForTool(target)) {
      console.warn(
        `[PlanningMapController] Tool '${this.activeTool}' rejects transition to '${target}'`
      );
      return false;
    }
    return this.interactionController.transition(target, reason);
  }

  /**
   * Update the map canvas cursor based on the active tool.
   */
  private updateCursor(tool: PlanningTool): void {
    const canvas = this.map?.getCanvas();
    if (!canvas) return;

    const key = tool ?? 'none';
    canvas.style.cursor = TOOL_CURSORS[key];
  }

  destroy(): void {
    this.activeTool = null;
    this.map = null;
  }
}
