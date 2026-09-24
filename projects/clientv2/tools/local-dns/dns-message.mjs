/**
 * Just enough of the DNS wire format (RFC 1035) for local-dns: read a query's question,
 * write A answers and negative responses, and pull A records out of an mDNS reply.
 */

export const TYPE_A = 1;
export const CLASS_IN = 1;
export const RCODE_NOERROR = 0;
export const RCODE_SERVFAIL = 2;
export const RCODE_NXDOMAIN = 3;

/**
 * @typedef {Object} Question
 * @property {number} id
 * @property {boolean} recursionDesired
 * @property {string} name Lower-cased, without the trailing dot.
 * @property {number} type
 * @property {number} klass
 * @property {Buffer} raw The question section exactly as sent, to echo back.
 */

/**
 * Reads a name at `offset`, following compression pointers.
 * @param {Buffer} message
 * @param {number} offset
 * @returns {{ name: string, end: number }} `end` is where the name stops at `offset` itself.
 */
export function readName(message, offset) {
    const labels = [];
    let position = offset;
    let end = -1;
    for (let jumps = 0; jumps < 64; jumps++) {
        const length = message[position];
        if (length === undefined) throw new Error('Name runs past the message.');
        if ((length & 0xc0) === 0xc0) {
            if (end < 0) end = position + 2;
            position = ((length & 0x3f) << 8) | message[position + 1];
            continue;
        }
        if (length === 0) return { name: labels.join('.').toLowerCase(), end: end < 0 ? position + 1 : end };
        labels.push(message.toString('latin1', position + 1, position + 1 + length));
        position += 1 + length;
    }
    throw new Error('Too many compression pointers.');
}

/**
 * @param {string} name
 * @returns {Buffer}
 */
export function encodeName(name) {
    const parts = name.split('.').filter((label) => label.length).map((label) => {
        const bytes = Buffer.from(label, 'latin1');
        if (bytes.length > 63) throw new Error(`Label too long: ${label}`);
        return Buffer.concat([Buffer.from([bytes.length]), bytes]);
    });
    return Buffer.concat(parts.concat([Buffer.from([0])]));
}

/**
 * The first question of a query, or null when the message is not a standard query.
 * @param {Buffer} message
 * @returns {Question | null}
 */
export function parseQuery(message) {
    if (message.length < 12) return null;
    const flags = message.readUInt16BE(2);
    const isResponse = (flags & 0x8000) !== 0;
    const opcode = (flags >> 11) & 0xf;
    if (isResponse || opcode !== 0 || message.readUInt16BE(4) < 1) return null;
    const { name, end } = readName(message, 12);
    if (end + 4 > message.length) return null;
    return {
        id: message.readUInt16BE(0),
        recursionDesired: (flags & 0x0100) !== 0,
        name,
        type: message.readUInt16BE(end),
        klass: message.readUInt16BE(end + 2),
        raw: message.subarray(12, end + 4)
    };
}

/**
 * @typedef {Object} AnswerOptions
 * @property {number} rcode
 * @property {string[]} [addresses] IPv4 addresses to answer with, as A records.
 * @property {number} [ttl] Seconds; 30 by default.
 */

/**
 * An authoritative response to `question`.
 * @param {Question} question
 * @param {AnswerOptions} options
 * @returns {Buffer}
 */
export function buildResponse(question, options) {
    const { rcode, addresses = [], ttl = 30 } = options;
    const header = Buffer.alloc(12);
    header.writeUInt16BE(question.id, 0);
    // QR, AA and RA set; RD echoed.
    header.writeUInt16BE(0x8000 | 0x0400 | 0x0080 | (question.recursionDesired ? 0x0100 : 0) | rcode, 2);
    header.writeUInt16BE(1, 4);
    header.writeUInt16BE(addresses.length, 6);
    const answers = addresses.map((address) => {
        const record = Buffer.alloc(16);
        record.writeUInt16BE(0xc00c, 0); // Pointer to the question's name.
        record.writeUInt16BE(TYPE_A, 2);
        record.writeUInt16BE(CLASS_IN, 4);
        record.writeUInt32BE(ttl, 6);
        record.writeUInt16BE(4, 10);
        address.split('.').forEach((octet, index) => record.writeUInt8(Number(octet), 12 + index));
        return record;
    });
    return Buffer.concat([header, question.raw].concat(answers));
}

/**
 * A query for `name`'s A record.
 * @param {number} id
 * @param {string} name
 * @returns {Buffer}
 */
export function buildQuery(id, name) {
    const header = Buffer.alloc(12);
    header.writeUInt16BE(id, 0);
    header.writeUInt16BE(1, 4);
    const tail = Buffer.alloc(4);
    tail.writeUInt16BE(TYPE_A, 0);
    tail.writeUInt16BE(CLASS_IN, 2);
    return Buffer.concat([header, encodeName(name), tail]);
}

/**
 * The IPv4 addresses a response gives for `name`, from its answer and additional sections.
 * @param {Buffer} message
 * @param {string} name
 * @returns {string[]}
 */
export function readAddresses(message, name) {
    if (message.length < 12 || (message.readUInt16BE(2) & 0x8000) === 0) return [];
    const questions = message.readUInt16BE(4);
    const records = message.readUInt16BE(6) + message.readUInt16BE(8) + message.readUInt16BE(10);
    let offset = 12;
    for (let index = 0; index < questions; index++) offset = readName(message, offset).end + 4;
    const found = [];
    for (let index = 0; index < records && offset < message.length; index++) {
        const record = readName(message, offset);
        const type = message.readUInt16BE(record.end);
        // mDNS sets the top bit of the class for "cache flush".
        const klass = message.readUInt16BE(record.end + 2) & 0x7fff;
        const length = message.readUInt16BE(record.end + 8);
        const data = record.end + 10;
        if (record.name === name && type === TYPE_A && klass === CLASS_IN && length === 4)
            found.push(Array.from(message.subarray(data, data + 4)).join('.'));
        offset = data + length;
    }
    return found;
}
