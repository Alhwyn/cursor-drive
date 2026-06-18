export class CursorConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CursorConfigurationError";
  }
}

export function getApiKey(): string | undefined {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  return apiKey ? apiKey : undefined;
}

export function requireCursorKey(): string {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new CursorConfigurationError("Set CURSOR_API_KEY in .env and restart the server.");
  }

  return apiKey;
}
