import { readFileSync, writeFileSync, existsSync } from "node:fs";
import type { Survey } from "./types.ts";

// Kept next to the project root, so every `st` command sees the same surveys
const FILE = new URL("../surveys.json", import.meta.url);

function load(): Survey[] {
    if (!existsSync(FILE)) return [];
    try {
        return JSON.parse(readFileSync(FILE, "utf8")) as Survey[];
    } catch {
        return [];
    }
}

function save(surveys: Survey[]): void {
    writeFileSync(FILE, JSON.stringify(surveys, null, 2));
}

const isValid = (s: Survey) => new Date(s.expiration).getTime() > Date.now();

export function listSurveys(waypoint?: string): Survey[] {
    const valid = load().filter(isValid);
    return waypoint ? valid.filter((s) => s.symbol === waypoint) : valid;
}

export function addSurvey(surveys: Survey[]): void {
    const known = new Set(surveys.map((s) => s.signature));
    save([...load().filter((s) => isValid(s) && !known.has(s.signature)), ...surveys]);
}

export function findSurvey(signature: string): Survey | undefined {
    return listSurveys().find((s) => s.signature === signature);
}

export function removeSurvey(signature: string): void {
    save(load().filter((s) => s.signature !== signature));
}