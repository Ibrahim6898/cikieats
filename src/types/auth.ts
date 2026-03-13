export type AuthMode = 'signin' | 'signup';

export interface AuthFormData {
  name: string;
  email: string;
  password: string;
  role: 'customer' | 'vendor' | 'rider';
}
