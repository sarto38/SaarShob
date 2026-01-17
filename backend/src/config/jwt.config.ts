/**
 * Shared JWT configuration to ensure consistency across services
 */
export const getJwtConfig = () => {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  if (!secret) {
    console.warn('⚠️  WARNING: JWT_SECRET is not set in environment variables! Using fallback secret.');
    return {
      secret: 'default-secret-change-in-production',
      expiresIn
    };
  }

  return {
    secret,
    expiresIn
  };
};
