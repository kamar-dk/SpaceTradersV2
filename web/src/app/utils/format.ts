

export function prettyName(symbol: string): string {
    return symbol
        .replace(/^SHIP_/, "")
        .toLowerCase()
        .split("_")
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(" ");
}