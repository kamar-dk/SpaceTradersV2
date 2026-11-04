import { api } from "./api.ts";
import { addSurvey } from "./surveyStore.ts";
import type { Cooldown, Survey, TradeSymbol } from "./types.ts";

export async function survey(ship: string) {
    const data = await api<{ surveys: Survey[]; cooldown: Cooldown }>(`/my/ships/${ship}/survey`, { method: "POST" });
    addSurvey(data.surveys);
    return data;
}

export function scoreSurvey(s: Survey, keep: TradeSymbol[]): number {
    if (keep.length === 0) return 1;
    const useful = s.deposits.filter((d) => (keep as string[]).includes(d.symbol)).length;
    const sizeBonus = ({ SMALL: 1, MODERATE: 1.2, LARGE: 1.5} as Record<string, number>)[s.size] ?? 1;
    return (useful / s.deposits.length) * sizeBonus; 
}

export function bestSurvey(surveys: Survey[], keep: TradeSymbol[]): Survey | undefined {
    return [...surveys].sort((a, b) => scoreSurvey(b, keep) - scoreSurvey(a, keep))[0];
}