import { describe, expect, it } from 'vitest';
import {
  OnboardClientError,
  sendClientInvitation,
} from './clientOnboardingService';

describe('sending a client invitation', () => {
  it('reports a first invitation as not having replaced anything', async () => {
    // arrange & act
    const result = await sendClientInvitation('success');

    // assert
    expect(result.replacedPendingInvitation).toBe(false);
  });

  it('reports that a pending invitation was replaced', async () => {
    // arrange & act
    const result = await sendClientInvitation('replaced-invitation');

    // assert
    expect(result.replacedPendingInvitation).toBe(true);
  });

  it('rejects an email that already belongs to a client', async () => {
    // arrange & act & assert
    await expect(sendClientInvitation('already-client')).rejects.toThrow(
      OnboardClientError,
    );
    await expect(sendClientInvitation('already-client')).rejects.toMatchObject({
      code: 'ALREADY_CLIENT',
    });
  });

  it('reports a delivery failure separately, because the record survives it', async () => {
    // arrange & act & assert
    await expect(sendClientInvitation('delivery-failure')).rejects.toMatchObject(
      { code: 'DELIVERY_FAILURE' },
    );
  });
});
