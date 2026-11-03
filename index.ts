#!/usr/bin/env node
type Command = (args: string[]) => Promise<void>;

const [cmd, ...rawArgs] = process.argv.slice(2);

const commands: Record<string, Command> = {
    async hello(args) {
        console.log("Hello", args);
    }
}

const command = cmd && Object.hasOwn(commands, cmd) ? commands[cmd] : undefined;


if (command) {
    await command(rawArgs);
} else {
    console.log("Commands: " + Object.keys(commands).join(", "));
}