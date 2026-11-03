export type Command = (args: string[]) => Promise<void>;
export type CommandGroup = Record<string, Command>;