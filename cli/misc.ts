import * as agent from "../core/agent.ts";

export const miscCommands = {
    async agent() {
        const a = await agent.getAgent();
        console.log(`Agent:     ${a.symbol}`);
        console.log(`Faction:   ${a.startingFaction}`);
        console.log(`HQ:        ${a.headquarters}`);
        console.log(`Credits:   ${a.credits.toLocaleString()}`);
        console.log(`Ships:     ${a.shipCount}`);
    },
    
    async customCommand([path]: string[]) {
        if (!path) return console.log("Usage: st customCommand <path>, e.g. my/ships/S1/cargo");
        console.dir(await agent.rawGet(path), { depth: null });
    },
}