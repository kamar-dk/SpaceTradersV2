#!/usr/bin/env node
import { miscCommands } from "./cli/misc.ts";
import type { CommandGroup } from "./cli/command.ts";
import { shipCommands } from "./cli/ships.ts";
import { expandShip } from "./utils.ts";
import { contractCommands } from "./cli/contracts.ts";
import { systemCommands } from "./cli/systems.ts";
import { navigationCommands } from "./cli/navigation.ts";
import { cargoCommands } from "./cli/cargo.ts";
import { marketCommands } from "./cli/market.ts";
import { miningCommands } from "./cli/mining.ts";
import { surveyCommands } from "./cli/surveying.ts";
import { automationCommands } from "./cli/automation.ts";
import { fleetCommands } from "./cli/fleet.ts";
import { shipyardCommands } from "./cli/shipyard.ts";

const groups: Record<string, CommandGroup> = {
    Ship: shipCommands,
    System: systemCommands,
    Navigation: navigationCommands,
    Market: marketCommands,
    Contracts: contractCommands,
    Cargo: cargoCommands,
    Misc: miscCommands,
    Mining: miningCommands,
    Survey: surveyCommands,
    Automation: automationCommands,
    Fleet: fleetCommands,
    Shipyard: shipyardCommands,
}

const [cmd, ...rawArgs] = process.argv.slice(2);
const args = rawArgs.map(expandShip);
const commands: CommandGroup = Object.assign({}, ...Object.values(groups));

const command = cmd && Object.hasOwn(commands, cmd) ? commands[cmd] : undefined;


try {
    if (command) {
        await command(args);
    } else {
        console.log("Commands: " + Object.keys(commands).join(", "));
    }
} catch (e) {
    console.error(e instanceof Error ? e.message : e);
    if (e instanceof Error && e.cause) console.error("Cause:", e.cause);
    process.exitCode = 1;
}
