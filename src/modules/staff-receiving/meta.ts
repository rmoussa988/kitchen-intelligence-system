import type { CoreState } from '../../store';

/** Module-private persisted state for the staff receiving tablet: receiver note / scan / issue flag per delivery id. */
export const STAFF_RCV_MODULE = 'staff-receiving';

export interface DeliveryMeta { note: string; issue: boolean; scan: boolean }
export interface StaffRcvState { meta: Record<string, DeliveryMeta> }
export const STAFF_RCV_SEED: StaffRcvState = { meta: {} };

/** Read the receiver metadata from the store (used by Purchasing → Received suppliers). */
export function readRcvMeta(state: CoreState): Record<string, DeliveryMeta> {
  const m = state.modules[STAFF_RCV_MODULE] as StaffRcvState | undefined;
  return m?.meta ?? {};
}
