import * as surveying from "../core/surveying.ts";
import type { TradeSymbol, Survey } from "../core/types.ts";
import { listSurveys } from "../core/surveyStore.ts";

function printSurvey(s: Survey, keep: TradeSymbol[]): void {
    const counts = new Map<string, number>();
    for (const d of s.deposits) counts.set(d.symbol, (counts.get(d.symbol) ?? 0) + 1);
    const goods = [...counts].map(([g, n]) => (n > 1 ? `${n}x ${g}` : g)).join(", ");
    const score = keep.length ? `  score ${surveying.scoreSurvey(s, keep).toFixed(2)}` : "";
    const minutes = Math.round((new Date(s.expiration).getTime() - Date.now()) / 60_000);
    console.log(`${s.signature}  ${s.size.padEnd(8)}  ${minutes}m left${score}`);
    console.log(`    ${goods}`);
}

export const surveyCommands = {
    async survey([ship, ...keep]: string[]) {
        if (!ship) return console.log("Usage: st survey <ship> [goods to score by...]");
        const { surveys, cooldown } = await surveying.survey(ship);
        const wanted = keep as TradeSymbol[];

        // Best first when goods are given
        const sorted = wanted.length
            ? [...surveys].sort((a, b) => surveying.scoreSurvey(b, wanted) - surveying.scoreSurvey(a, wanted))
            : surveys;
        
        for (const s of sorted) printSurvey(s, wanted);

        console.log(`\nSaved ${surveys.length} surveys. Cooldown: ${cooldown.remainingSeconds}s`);
        const best = wanted.length ? sorted[0] : undefined;
        if (best && surveying.scoreSurvey(best, wanted) > 0) console.log(`Best: st extract <ship> ${best.signature}`);
    },
    async surveys([waypoint, ...keep]: string[]) {
        const list = listSurveys(waypoint);
        if (list.length === 0) return console.log("No saved surveys. Run `st survey <ship>` at an asteroid.");
        const wanted = keep as TradeSymbol[];
        const sorted = [...list].sort((a, b) => surveying.scoreSurvey(b, wanted) - surveying.scoreSurvey(a, wanted));
        for (const s of sorted) printSurvey(s, wanted);
    },
    async deposits([waypoint]: string[]) {
        if (!waypoint) return console.log("Usage: st deposits <waypoint>");
        const list = listSurveys(waypoint);
        if (list.length === 0) return console.log(`No saved surveys for ${waypoint}. Run \`st survey <ship>\` there.`);

        const counts = new Map<string, number>();
        let total = 0;
        for (const s of list) {
            for (const d of s.deposits) {
                counts.set(d.symbol, (counts.get(d.symbol) ?? 0) + 1);
                total++;
            }
        }

        console.log(`${waypoint}: ${list.length} surveys, ${total} deposits`);
        for (const [good, n] of [...counts].sort((a, b) => b[1] - a[1])) {
            console.log(`  ${good.padEnd(20)} ${String(Math.round((n / total) * 100)).padStart(3)}%`);
        }
    }
}