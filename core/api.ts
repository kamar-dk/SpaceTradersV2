

process.loadEnvFile(new URL("../.env", import.meta.url));
export const TOKEN = process.env.ST_TOKEN ?? "";

const BASE = "https://api.spacetraders.io/v2";

if (!TOKEN) throw new Error("ST_TOKEN missing: copy .env.example to .env and fill it in");

export class ApiError extends Error {
    status: number;
    code?: number;
    data?: unknown;

    constructor(status: number, message: string, code?: number, data?: unknown) {
        super(`${status}: ${message}`);
        this.status = status;
        this.code = code;
        this.data = data;
    }
}

type Options = { method?: "GET" | "POST" | "PATCH"; body?: unknown };

export async function api<T>(path: string, { method = "GET", body }: Options = {}): Promise<T> {
    while(true) {
        const res = await fetch(BASE + path, {
            method,
            headers: {
                ...(body !== undefined && {"Content-Type": "application/json"}),
                ...(TOKEN && { Authorization: `Bearer ${TOKEN}`}),
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        
        if (res.status === 429) {
            const wait = Number(res.headers.get("retry-after") ?? 1);
            await new Promise((r) => setTimeout(r, wait * 1000));
            continue;
        }

        const json = res.status === 204 ? {} : await res.json();
        if (!res.ok) {
            const err = json.error ?? {};
            throw new ApiError(res.status, err.message ?? "Unknown Error", err.code, err.data);
        }
        return json.data as T;
    } 
}

export async function apiAll<T>(path: string): Promise<T[]> {
    const sep = path.includes("?") ? "&" : "?";
    const all: T[] = [];
    for (let page = 1; ; page++) {
        const items = await api<T[]>(`${path}${sep}limit=20&page=${page}`);
        all.push(...items);
        if (items.length < 20) return all;
    }
}