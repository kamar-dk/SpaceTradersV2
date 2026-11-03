import * as contracts from "../core/contracts.ts";
import type { Contract } from "../core/types.ts";

function printContract(c: Contract): void {
    const status = c.fulfilled ? "FULFILLED" : c.accepted ? "ACCEPTED" : "OFFERED";
    console.log(`${c.id}  ${c.type}  ${c.factionSymbol}  [${status}]`);
    console.log(`  Pays ${c.terms.payment.onAccepted} on accept, ${c.terms.payment.onFulfilled} on fulfill`);
    for (const d of c.terms.deliver ?? []) {
        console.log(`  ${d.tradeSymbol}: ${d.unitsFulfilled}/${d.unitsRequired} → ${d.destinationSymbol}`);
    }
    if (!c.accepted && c.deadlineToAccept) console.log(`  Accept by: ${c.deadlineToAccept}`);
    else console.log(`  Deadline: ${c.terms.deadline}`);
}

export const contractCommands = {
    async contracts() {
        const list = await contracts.listContracts();
        if (list.length === 0) return console.log("No Contracts");
        for (const c of list) printContract(c);
    },
    async accept([id]: string[]) {
        const { contract, agent } = await contracts.accept(id);
        console.log(`Contract accepted: Credits: ${agent.credits}`);
        printContract(contract);
    },
    async negotiate([ship]: string[]) {
        const contract = await contracts.negotiate(ship);
        console.log("New contract:");
        printContract(contract);
    },
}