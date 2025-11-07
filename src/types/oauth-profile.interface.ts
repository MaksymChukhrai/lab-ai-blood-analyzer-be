export interface OAuthProfile {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  provider: 'google' | 'linkedin' | 'magic_link';
  providerId: string;
  picture?: string;
}
