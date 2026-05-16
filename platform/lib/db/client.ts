const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SUPABASE_TIMEOUT_MS = 20_000;

type QueryValue = string | number | boolean;

type SelectOptions = {
  select?: string;
  eq?: Record<string, QueryValue>;
  order?: string;
  limit?: number;
};

type WriteOptions = {
  returning?: boolean;
};

function restBase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  return `${SUPABASE_URL}/rest/v1`;
}

function headers(extra?: HeadersInit): HeadersInit {
  return {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function queryString(options: SelectOptions = {}): string {
  const params = new URLSearchParams();
  params.set("select", options.select ?? "*");

  for (const [key, value] of Object.entries(options.eq ?? {})) {
    params.set(key, `eq.${value}`);
  }

  if (options.order) params.set("order", options.order);
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  return params.toString();
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`Supabase REST ${res.status}: ${body}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS);

  try {
    return await operation(controller.signal);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Supabase request timed out. Check SUPABASE_URL, service role key, and project connectivity.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const supabaseDb = {
  async select<T>(table: string, options?: SelectOptions): Promise<T[]> {
    const res = await withTimeout((signal) => fetch(`${restBase()}/${table}?${queryString(options)}`, {
      method: "GET",
      headers: headers(),
      cache: "no-store",
      signal,
    }));
    return parseResponse<T[]>(res);
  },

  async insert<T>(
    table: string,
    payload: Record<string, unknown> | Record<string, unknown>[],
    options: WriteOptions = { returning: true }
  ): Promise<T[]> {
    const res = await withTimeout((signal) => fetch(`${restBase()}/${table}`, {
      method: "POST",
      headers: headers({
        Prefer: options.returning === false ? "return=minimal" : "return=representation",
      }),
      body: JSON.stringify(payload),
      signal,
    }));
    return parseResponse<T[]>(res);
  },

  async update<T>(
    table: string,
    eq: Record<string, QueryValue>,
    payload: Record<string, unknown>,
    options: WriteOptions = { returning: true }
  ): Promise<T[]> {
    const res = await withTimeout((signal) => fetch(`${restBase()}/${table}?${queryString({ eq })}`, {
      method: "PATCH",
      headers: headers({
        Prefer: options.returning === false ? "return=minimal" : "return=representation",
      }),
      body: JSON.stringify(payload),
      signal,
    }));
    return parseResponse<T[]>(res);
  },
};

export default supabaseDb;
