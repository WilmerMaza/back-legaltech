import { Prisma } from "@prisma/client";

/** En Vercel el bundle puede romper `instanceof PrismaClientKnownRequestError`. */
export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return true;
  }

  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name: string }).name === "PrismaClientKnownRequestError" &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

export function getPrismaErrorCode(error: unknown): string | undefined {
  if (isPrismaKnownRequestError(error)) {
    return error.code;
  }
  return undefined;
}
