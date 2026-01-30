/**
 * TagApplicationController.ts — Apply semantic tags to zones.
 *
 * Flow:
 * 1. User selects a zone
 * 2. Activates TAG_ZONE mode
 * 3. Chooses tag type, severity, confidence, validity window
 * 4. Transitions to CONFIRM
 * 5. On confirm → creates ZoneTag + AuditLog
 */

import type { ZoneTag, ZoneTagType } from '../contracts/ZoneTag';
import { createZoneTag } from '../contracts/ZoneTag';
import type { InteractionController } from '../core/InteractionController';
import { ConfirmGate } from './ConfirmGate';

export interface TagFormData {
  zoneId: string;
  zoneName: string;
  type: ZoneTagType;
  severity: 1 | 2 | 3 | 4 | 5;
  confidence: number;
  validFrom: string;
  validTo: string | null;
}

export type TagAppliedCallback = (tag: ZoneTag) => void;

export class TagApplicationController {
  private interactionController: InteractionController;
  private confirmGate: ConfirmGate;
  private onTagApplied: TagAppliedCallback;
  private actorId: string;

  constructor(
    interactionController: InteractionController,
    confirmGate: ConfirmGate,
    onTagApplied: TagAppliedCallback,
    actorId: string
  ) {
    this.interactionController = interactionController;
    this.confirmGate = confirmGate;
    this.onTagApplied = onTagApplied;
    this.actorId = actorId;
  }

  /**
   * Start tagging flow for a zone.
   */
  startTagging(zoneId: string): boolean {
    return this.interactionController.transition('TAG_ZONE', `Tagging zone ${zoneId}`);
  }

  /**
   * Submit tag form data for confirmation.
   */
  submitTag(formData: TagFormData): void {
    const tag = createZoneTag({
      zoneId: formData.zoneId,
      type: formData.type,
      severity: formData.severity,
      confidence: formData.confidence,
      validFrom: formData.validFrom,
      validTo: formData.validTo,
      actorId: this.actorId,
    });

    this.confirmGate.stage(
      {
        type: 'ADD_TAG',
        description: `Add ${formData.type} tag (severity ${formData.severity}) to zone "${formData.zoneName}"`,
        payload: { entityId: tag.id, zoneId: formData.zoneId, tag },
        before: null,
        after: tag as unknown as Record<string, unknown>,
      },
      () => {
        // On confirm
        this.onTagApplied(tag);
        this.interactionController.transition('IDLE', 'Tag applied');
      },
      () => {
        // On cancel
        this.interactionController.transition('IDLE', 'Tag cancelled');
      }
    );

    this.interactionController.transition('CONFIRM', 'Tag ready for confirmation');
  }

  /**
   * Cancel tagging and return to IDLE.
   */
  cancel(): void {
    this.interactionController.transition('IDLE', 'Tagging cancelled');
  }
}
