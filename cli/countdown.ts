import { formatDuration, sleep } from "../utils.ts";

export async function countdown(seconds: number, label = "Waiting"): Promise<void> {
    for (let s = Math.ceil(seconds); s > 0; s--) {
        process.stdout.write(`\r  ${label} ${formatDuration(s)}   `);
        await sleep(1);
    }
    process.stdout.write("\r\x1b[2K");
}