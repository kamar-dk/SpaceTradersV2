#!/usr/bin/env node
import { miscCommands } from "./cli/misc.ts";
import type { CommandGroup } from "./cli/command.ts";
import { shipCommands } from "./cli/ships.ts";
import { expandShip } from "./utils.ts";
import { contractCommands } from "./cli/contracts.ts";
import { systemCommands } from "./cli/systems.ts";
import { navigationCommands } from "./cli/navigation.ts";
import { cargoCommands } from "./cli/cargo.ts";

const groups: Record<string, CommandGroup> = {
    Ship: shipCommands,
    System: systemCommands,
    Navigation: navigationCommands,
    Contracts: contractCommands,
    Cargo: cargoCommands,
    Misc: miscCommands,
}

const [cmd, ...rawArgs] = process.argv.slice(2);
const args = rawArgs.map(expandShip);
const commands: CommandGroup = Object.assign({}, ...Object.values(groups));

const command = cmd && Object.hasOwn(commands, cmd) ? commands[cmd] : undefined;

if (command) {
    await command(args);
} else {
    console.log("Commands: " + Object.keys(commands).join(", "));
}