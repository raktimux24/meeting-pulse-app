import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { NotFoundState } from '../ui';

describe('not-found state', () => {
  it('explains the missing reflection', async () => {
    const { getByText } = await render(
      <NotFoundState title="Meeting not found" body="This reflection is no longer on this device." />,
    );
    expect(getByText('Meeting not found')).toBeTruthy();
    expect(getByText('This reflection is no longer on this device.')).toBeTruthy();
  });
});
