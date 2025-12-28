import { EventExecutionService } from './EventExecutionService';
import { GeoLocation } from './events';

/**
 * PRD Section 9: Location Correction Feature
 * Independent "Capture Location" flow.
 */
export class LocationCorrectionService {
  constructor(private readonly eventService: EventExecutionService) {}

  /**
   * Driver proposes corrected coordinates.
   * Stored as pending via the event stream.
   */
  async proposeCorrection(
    tripId: string,
    dispatchId: string,
    correctedGeo: GeoLocation,
    reason: string
  ): Promise<void> {
    await this.eventService.captureEvent(
      'location_captured',
      tripId,
      dispatchId,
      correctedGeo,
      {
        is_correction_proposal: true,
        correction_reason: reason,
        proposal_timestamp: new Date().toISOString()
      }
    );
  }
}