#!/usr/bin/env node
import { api } from "./core/api.ts";
import type { Ship } from "./core/types.ts"

type Command = (args: string[]) => Promise<void>;

const [cmd, ...rawArgs] = process.argv.slice(2);

const commands: Record<string, Command> = {
    async hello(args) {
        console.log("Hello", args);
    },
    async agent() {
        console.log(await api("/my/agent"));
    },
    async ships() {
        console.log(await api<Ship>("/my/ships"));
    },
}

const command = cmd && Object.hasOwn(commands, cmd) ? commands[cmd] : undefined;


if (command) {
    await command(rawArgs);
} else {
    console.log("Commands: " + Object.keys(commands).join(", "));
}