// Positive width = left-align, negative = right-align (for numbers), 0 = no padding
export function row(cells: string[], widths: number[]): string {
    return cells
        .map((c, i) => {
            const w = widths[i] ?? 0;
            return w > 0 ? c.padEnd(w) : w < 0 ? c.padStart(-w) : c;
        })
        .join(" ");
}

export function header(cells: string[], widths: number[]): void {
    const line = row(cells, widths);
    console.log(line);
    console.log("-".repeat(line.length));
}