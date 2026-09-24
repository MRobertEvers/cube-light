import { createInterface } from 'node:readline/promises';

/** A DnsProvider that asks a person to edit the records at their DNS host. */
export class ManualDns {
    /**
     * @param {string} zone
     * @param {(line: string) => void} log
     */
    constructor(zone, log) {
        this.automatic = false;
        this.zone = zone;
        this.log = log;
    }

    /**
     * @param {string} type
     * @param {string} name
     * @param {string} data
     * @returns {Promise<string>}
     */
    async setRecord(type, name, data) {
        this.log('\nAdd this DNS record, then press Enter:\n');
        this.log(`    Type:  ${type}`);
        this.log(`    Name:  ${name}`);
        this.log(`    Value: ${data}\n`);
        if (name.endsWith(`.${this.zone}`)) {
            this.log('  (Many DNS hosts want the name without the domain:');
            this.log(`   ${name.slice(0, -(this.zone.length + 1))})\n`);
        }
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        await rl.question('  Press Enter once saved... ');
        rl.close();
        return `${type} ${name}`;
    }

    /** @param {string} handle */
    async removeRecord(handle) {
        this.log(`You can delete the ${handle} record now.`);
    }
}
