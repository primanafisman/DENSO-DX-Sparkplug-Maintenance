import { read, write } from '../../../shared/lib/api';
import { resetCsrf } from '../../../shared/lib/csrf';
import type { User } from '../../../shared/lib/contracts';
import type { LoginInput } from './schemas';
export const sessionApi = {
  me: () => read<User>('/auth/me'),
  login: async (input: LoginInput) => {
    resetCsrf();
    return write<User>('/auth/login', input);
  },
  logout: async () => {
    await write('/auth/logout', {});
    resetCsrf();
  },
};
