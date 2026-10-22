import { describe, expect, test } from 'bun:test';
import { shouldApplyChannelValues } from '../helpers';

describe('shouldApplyChannelValues', () => {
  // the channel arrives with the first render, its saved values fill the form
  test('should apply the saved values of a channel that was not initialized yet', () => {
    expect(shouldApplyChannelValues(null, 7)).toBe(true);
  });

  // a refetch of the same channel must not drop the edits of the user
  test('should not apply the saved values again for the same channel', () => {
    expect(shouldApplyChannelValues(7, 7)).toBe(false);
  });

  test('should apply the saved values of another channel', () => {
    expect(shouldApplyChannelValues(7, 8)).toBe(true);
  });
});
