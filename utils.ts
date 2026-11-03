import { TOKEN } from "./core/api.ts";

let cachedAgent: string | undefined;

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

export function agentSymbol(): string {
    if (!cachedAgent) {
        const payload = JSON.parse(Buffer.from(TOKEN.split(".")[1], "base64url").toString()) as { identifier: string };
        cachedAgent = payload.identifier;
    }
    
    return cachedAgent;
}

export function expandShip(arg: string): string {
    const match = /^s(\d+)$/i.exec(arg);
    return match ? `${agentSymbol()}-${match[1]}` : arg;
}
