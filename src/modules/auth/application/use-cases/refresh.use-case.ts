import { ApiError } from "../../../../shared/http/error-handler.js";
import { Prisma } from "@prisma/client";
import {
  cacheRefreshRotation,
  getCachedRefreshRotation,
  withRefreshRotationLock,
} from "../../../../shared/security/refresh-rotation-cache.js";
import { getIdleTimeoutSeconds, minDate } from "../../../../shared/security/session-policy.js";
import type {
  AuthPersistencePort,
  AuthUserPayload,
} from "../../domain/ports/auth-persistence.port.js";
import type { TokenServicePort } from "../../domain/ports/token-service.port.js";

export type RefreshInput = {
  refresh_token: string;
};

export type RefreshOutput = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  session_expires_at: string;
  idle_timeout_seconds: number;
};

export class RefreshUseCase {
  constructor(
    private readonly deps: {
      authPersistence: AuthPersistencePort;
      tokenService: TokenServicePort;
    },
  ) {}

  async execute(input: RefreshInput): Promise<RefreshOutput> {
    let payload: AuthUserPayload;
    let token_hash: string;

    try {
      payload = this.deps.tokenService.verifyRefreshToken(input.refresh_token);
      token_hash = this.deps.tokenService.hashToken(input.refresh_token);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token invalido");
    }

    const cached = await this.resolveCachedRotation(token_hash);
    if (cached) {
      return cached;
    }

    const savedToken = await this.deps.authPersistence.findActiveRefreshToken({
      usuario_id: payload.id,
      token_hash,
    });

    if (!savedToken) {
      const retried = await this.resolveCachedRotation(token_hash);
      if (retried) {
        return retried;
      }
      throw new ApiError(401, "UNAUTHORIZED", "Refresh token revocado o invalido");
    }

    return withRefreshRotationLock(savedToken.id, async () => {
      const cachedInsideLock = await this.resolveCachedRotation(token_hash);
      if (cachedInsideLock) {
        return cachedInsideLock;
      }

      const currentToken = await this.deps.authPersistence.findActiveRefreshToken({
        usuario_id: payload.id,
        token_hash,
      });

      if (!currentToken) {
        const retriedInsideLock = await this.resolveCachedRotation(token_hash);
        if (retriedInsideLock) {
          return retriedInsideLock;
        }
        throw new ApiError(401, "UNAUTHORIZED", "Refresh token revocado o invalido");
      }

      const now = new Date();
      let access_token: string;
      let refresh_token: string;
      let newExpiresAt: Date;
      try {
        access_token = this.deps.tokenService.signAccessToken(payload);
        refresh_token = this.deps.tokenService.signRefreshToken(payload);
        const jwtRefreshExpiresAt = this.deps.tokenService.getRefreshTokenExpirationDate(refresh_token);
        newExpiresAt = minDate(jwtRefreshExpiresAt, currentToken.session_expires_at);
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(500, "AUTH_TOKEN_ERROR", "No se pudo renovar la sesion");
      }

      let newRefreshTokenId: string;
      try {
        const rotation = await this.deps.authPersistence.rotateRefreshToken({
          existingRefreshTokenId: currentToken.id,
          usuario_id: payload.id,
          newTokenHash: this.deps.tokenService.hashToken(refresh_token),
          newExpiresAt,
          session_expires_at: currentToken.session_expires_at,
          last_used_at: now,
        });
        newRefreshTokenId = rotation.newRefreshTokenId;
      } catch (error) {
        if (error instanceof ApiError) {
          throw error;
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error("auth_storage_error", { code: error.code, meta: error.meta });
          throw new ApiError(503, "AUTH_STORAGE_ERROR", "No se pudo renovar la sesion", {
            prisma_code: error.code,
          });
        }
        throw error;
      }

      const result: RefreshOutput = {
        access_token,
        refresh_token,
        expires_in: this.deps.tokenService.getAccessTokenExpiresInSeconds(access_token),
        session_expires_at: currentToken.session_expires_at.toISOString(),
        idle_timeout_seconds: getIdleTimeoutSeconds(),
      };

      cacheRefreshRotation(token_hash, {
        ...result,
        activeRefreshTokenId: newRefreshTokenId,
      });

      return result;
    });
  }

  private async resolveCachedRotation(token_hash: string): Promise<RefreshOutput | null> {
    const cached = getCachedRefreshRotation(token_hash);
    if (!cached) return null;

    await this.deps.authPersistence.touchRefreshTokenLastUsed({
      id: cached.activeRefreshTokenId,
      last_used_at: new Date(),
    });

    return {
      access_token: cached.access_token,
      refresh_token: cached.refresh_token,
      expires_in: cached.expires_in,
      session_expires_at: cached.session_expires_at,
      idle_timeout_seconds: cached.idle_timeout_seconds,
    };
  }
}
