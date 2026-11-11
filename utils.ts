import { TOKEN } from "./core/api.ts";

export const sleep = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000));

export function formatDuration(totalSeconds: number): string {
    const s = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h ? `${h}h ${m}m ${sec}s` : m ? `${m}m ${sec}s` : `${sec}s`;
}

export const systemOf = (symbol: string): string => symbol.split("-").slice(0, 2).join("-");

export function secondsUntil(time: string): number {
    return (new Date(time).getTime() - Date.now()) / 1000;
}

// --- Agent and ship names ---

let cachedAgent: string | undefined;

// The agent's symbol, read from the token the first time it's needed: "KAMAR"
export function agentSymbol(): string {
    if (!cachedAgent) {
        const payload = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64url").toString()) as { identifier: string };
        cachedAgent = payload.identifier;
    }
    return cachedAgent;
}

// "K1" → "KAMAR-1", "k1a" → "KAMAR-1A". Anything else is returned unchanged.
export function expandShip(arg: string): string {
    const agent = agentSymbol();
    const match = arg.toUpperCase().match(/^(.)([0-9A-F]+)$/);
    if (match && match[1] === agent[0].toUpperCase()) return `${agent}-${match[2]}`;
    return arg;
}

// "KAMAR-1" → "K1". Other ships' symbols are left as they are.
export function shortShip(symbol: string): string {
    const agent = agentSymbol();
    return symbol.startsWith(`${agent}-`) ? agent[0] + symbol.slice(agent.length + 1) : symbol;
}