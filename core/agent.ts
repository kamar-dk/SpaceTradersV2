import { api } from "./api.ts";
import type { Agent } from "./types.ts";

export function getAgent(): Promise<Agent> {
    return api<Agent>("/my/agent");
}

// Raw GET for exploring any endpoint. The result type is unknown on purpose.
export function rawGet(path: string): Promise<unknown> {
    return api<unknown>(path.startsWith("/") ? path : `/${path}`);
}