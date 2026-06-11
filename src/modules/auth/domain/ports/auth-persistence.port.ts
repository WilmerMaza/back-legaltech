export type AuthRole = "admin" | "cliente";

export type AuthUserPayload = {
  id: string;
  role: AuthRole;
  cliente_id: string | null;
  email: string;
};

export type PersistedAuthUser = {
  id: string;
  role: AuthRole;
  cliente_id: string | null;
  email: string;
  password_hash: string;
};

export type PersistedCliente = {
  id: string;
  email: string;
};

export type ActiveRefreshToken = {
  id: string;
  usuario_id: string;
  token_hash: string;
  revoked_at: Date | null;
  session_expires_at: Date;
  last_used_at: Date;
};

export type AuthPersistenceRotateRefreshTokenInput = {
  existingRefreshTokenId: string;
  usuario_id: string;
  newTokenHash: string;
  newExpiresAt: Date;
  session_expires_at: Date;
  last_used_at: Date;
};

export type AuthPersistenceRevokeRefreshTokensInput = {
  usuario_id: string;
  token_hash: string;
};

export interface AuthPersistencePort {
  findUserByEmail(email: string): Promise<PersistedAuthUser | null>;
  findClienteByEmail(email: string): Promise<PersistedCliente | null>;

  createUserForCliente(input: {
    email: string;
    password_hash: string;
    role: "cliente";
    cliente_id: string;
  }): Promise<AuthUserPayload>;

  createRefreshToken(input: {
    usuario_id: string;
    token_hash: string;
    expires_at: Date;
    session_expires_at: Date;
    last_used_at: Date;
  }): Promise<{ id: string }>;

  findActiveRefreshToken(input: {
    usuario_id: string;
    token_hash: string;
  }): Promise<ActiveRefreshToken | null>;

  rotateRefreshToken(
    input: AuthPersistenceRotateRefreshTokenInput,
  ): Promise<{ newRefreshTokenId: string }>;

  touchRefreshTokenLastUsed(input: { id: string; last_used_at: Date }): Promise<void>;

  revokeRefreshTokens(input: AuthPersistenceRevokeRefreshTokensInput): Promise<void>;
}

