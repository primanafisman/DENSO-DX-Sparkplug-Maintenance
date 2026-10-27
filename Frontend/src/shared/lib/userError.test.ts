import { expect, it } from 'vitest';
import { ApiError } from './api';
import { userError } from './userError';

it('explains duplicate and invalid inspection numbers in Indonesian', () => {
  expect(userError(new ApiError('Conflict', 409, 'CHECK_NUMBER_CONFLICT'))).toEqual({
    message: 'Nomor pemeriksaan sudah digunakan.',
    action: 'Pilih nomor lain; setiap pemeriksaan harus memiliki nomor yang berbeda.',
  });
  expect(userError(new ApiError('Invalid', 422, 'CHECK_NUMBER_INVALID')).message).toBe(
    'Nomor pemeriksaan tidak valid.',
  );
});
