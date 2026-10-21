import { expect, it } from 'vitest';
import { fixtureInstrument } from '../../../test/fixtures';
import { matchRegisteredLabel } from './registeredLabel';
const b = fixtureInstrument({
  id: 'b',
  name: 'B3601',
  code: 'P-17',
  aliases: ['Pressure Test'],
  area: '17',
});
it('matches complete names, codes and aliases while keeping numeric identity exact', () => {
  for (const raw_text of ['B3601', 'b-3601', 'p17', 'Pressure   Test', '0.425 MPa\nB3601'])
    expect(matchRegisteredLabel({ raw_text }, [b], '17')?.id).toBe('b');
  for (const raw_text of ['B360', 'B36010', 'B3601.jpg', 'Pressure', 'IMG B3601'])
    expect(matchRegisteredLabel({ raw_text }, [b], '17')).toBeNull();
});
it('duplicate names or aliases, other lines, disabled assets and conflicting labels remain manual', () => {
  const duplicate = fixtureInstrument({
    id: 'dup',
    name: 'Another',
    aliases: ['B3601'],
    area: '17',
  });
  expect(matchRegisteredLabel({ raw_text: 'B3601' }, [b, duplicate], '17')).toBeNull();
  expect(matchRegisteredLabel({ raw_text: 'B3601' }, [b], '1')).toBeNull();
  expect(matchRegisteredLabel({ raw_text: 'B3601' }, [{ ...b, active: false }], '17')).toBeNull();
  expect(
    matchRegisteredLabel({ raw_text: 'B3601' }, [{ ...b, condition: 'not_working' }], '17'),
  ).toBeNull();
  expect(matchRegisteredLabel({ raw_text: 'B3601', conflict: true }, [b], '17')).toBeNull();
  expect(matchRegisteredLabel({ raw_text: 'B3601' }, [{ ...b, area: '' }], '1')?.id).toBe('b');
});
it('display readings cannot select numeric-only equipment names, codes or aliases', () => {
  for (const raw_text of ['0.405', '0405', '14']) {
    const assets = [
      fixtureInstrument({ name: 'Gauge A', code: '0405', aliases: [] }),
      fixtureInstrument({ id: 'alias', name: 'Gauge B', code: '', aliases: ['14'] }),
      fixtureInstrument({ id: 'number-name', name: '14', code: '', aliases: [] }),
    ];
    for (const asset of assets)
      expect(matchRegisteredLabel({ raw_text }, [asset], '17')).toBeNull();
  }
});
