/**
 * JWT payload structure
 * Used by all JWT strategies (access token, refresh token)
 */
export interface JwtPayload {
  /**
   * Subject - user ID
   */
  sub: string;

  /**
   * User email (optional, for convenience)
   */
  email?: string;

  /**
   * Issued at timestamp (optional, added by JWT library)
   */
  iat?: number;

  /**
   * Expiration timestamp (optional, added by JWT library)
   */
  exp?: number;
}
