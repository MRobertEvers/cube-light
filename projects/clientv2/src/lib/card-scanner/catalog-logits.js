import { LogitsProcessor } from 'transformers-v4';
/** Vocabulary constraints are built from the complete catalog, not photo labels. */
export function buildTokenCatalog(tokenizer, names, eosIds) {
	const nodes = [{ children: new Map(), names: [] }],
		byName = new Map();
	for (const name of names) {
		if (name.startsWith('A-')) continue;
		for (const spelling of [name, ' ' + name, '\n' + name]) {
			const tokens = tokenizer
				.encode(spelling, { add_special_tokens: false })
				.map(Number);
			let at = 0;
			for (const token of tokens) {
				if (!nodes[at].children.has(token)) {
					nodes[at].children.set(token, nodes.length);
					nodes.push({ children: new Map(), names: [] });
				}
				at = nodes[at].children.get(token);
			}
			if (!nodes[at].names.includes(name)) nodes[at].names.push(name);
			if (spelling === name) byName.set(name, tokens);
		}
	}
	return { nodes, byName, eosIds: eosIds.map(Number) };
}
export class CatalogLogitsProcessor extends LogitsProcessor {
	constructor(catalog, promptLength, forced = []) {
		super();
		this.catalog = catalog;
		this.promptLength = promptLength;
		this.forced = forced;
		this.records = [];
	}
	_call(inputIds, logits) {
		const generated = inputIds[0].slice(this.promptLength).map(Number);
		let at = 0;
		for (const token of generated) {
			if (this.catalog.eosIds.includes(token)) break;
			const next = this.catalog.nodes[at].children.get(token);
			if (next === undefined)
				throw Error('Decoder escaped the card-name trie');
			at = next;
		}
		const node = this.catalog.nodes[at],
			allowed = [...node.children.keys()];
		if (node.names.length || !generated.length)
			allowed.push(...this.catalog.eosIds);
		let max = -Infinity;
		for (const v of logits.data) max = Math.max(max, v);
		let sum = 0;
		for (const v of logits.data) sum += Math.exp(v - max);
		const lse = max + Math.log(sum),
			values = allowed
				.map((token) => ({
					token,
					logit: logits.data[token],
					logProbability: logits.data[token] - lse
				}))
				.sort((a, b) => b.logit - a.logit);
		const forced = this.forced[generated.length];
		if (forced !== undefined && !allowed.includes(forced))
			throw Error('Invalid forced catalog prefix');
		const selected =
				forced === undefined
					? values[0]
					: values.find((v) => v.token === forced),
			mass = values.reduce((s, v) => s + Math.exp(v.logProbability), 0);
		this.records.push({
			prefix: generated,
			selected: {
				token: selected.token,
				logProbability: selected.logProbability
			},
			allowedMass: mass,
			alternatives: values
				.slice(0, 5)
				.map(({ token, logProbability }) => ({ token, logProbability }))
		});
		logits.data.fill(-Infinity);
		if (forced !== undefined) logits.data[forced] = selected.logit;
		else for (const v of values) logits.data[v.token] = v.logit;
		return logits;
	}
}
export async function constrainedNameSearch(
	model,
	inputs,
	catalog,
	{ seeds = [], maxAlternatives = 4 } = {}
) {
	const promptLength = inputs.input_ids.dims[1],
		queue = [[]],
		seen = new Set(),
		answers = [];
	for (const name of seeds) {
		const ids = catalog.byName.get(name);
		if (ids) queue.push([...ids]);
	}
	let freeRuns = 0;
	while (queue.length && answers.length < seeds.length + maxAlternatives) {
		const forced = queue.shift(),
			key = forced.join(',');
		if (seen.has(key)) continue;
		seen.add(key);
		const processor = new CatalogLogitsProcessor(
				catalog,
				promptLength,
				forced
			),
			output = await model.generate({
				...inputs,
				max_new_tokens: 48,
				do_sample: false,
				logits_processor: [processor]
			});
		const tokens = output.tolist()[0].slice(promptLength).map(Number);
		let at = 0;
		for (const token of tokens) {
			if (catalog.eosIds.includes(token)) break;
			at = catalog.nodes[at].children.get(token);
			if (at === undefined) break;
		}
		const name =
				at === undefined ? null : catalog.nodes[at].names[0] || null,
			logProbability = processor.records.reduce(
				(s, r) => s + r.selected.logProbability,
				0
			),
			meanLogProbability =
				logProbability / Math.max(1, processor.records.length);
		answers.push({
			name,
			logProbability,
			meanLogProbability,
			rawTokenSupport: Math.exp(meanLogProbability),
			rootAllowedMass: processor.records[0]?.allowedMass || 0,
			tokens: processor.records.length,
			forced: forced.length > 0
		});
		if (freeRuns++ < maxAlternatives) {
			const branches = [];
			let prefixScore = 0;
			for (const r of processor.records) {
				for (const alt of r.alternatives.slice(0, 4)) {
					if (
						alt.token === r.selected.token ||
						catalog.eosIds.includes(alt.token)
					)
						continue;
					const prefix = [...r.prefix, alt.token];
					if (!seen.has(prefix.join(',')))
						branches.push({
							prefix,
							score:
								(prefixScore + alt.logProbability) /
								Math.pow(prefix.length, 0.7)
						});
				}
				prefixScore += r.selected.logProbability;
			}
			branches.sort((a, b) => b.score - a.score);
			queue.push(...branches.slice(0, 2).map((b) => b.prefix));
		}
	}
	const unique = new Map();
	for (const answer of answers)
		if (
			answer.name &&
			answer.meanLogProbability >
				(unique.get(answer.name)?.meanLogProbability ?? -Infinity)
		)
			unique.set(answer.name, answer);
	const ranked = [...unique.values()].sort(
			(a, b) => b.meanLogProbability - a.meanLogProbability
		),
		best = ranked[0],
		gap = best
			? best.meanLogProbability -
				(ranked[1]?.meanLogProbability ?? -Infinity)
			: 0;
	return {
		ranked,
		searchGap: gap,
		status:
			best &&
			best.rawTokenSupport >= 0.05 &&
			best.rootAllowedMass >= 0.01 &&
			gap >= 0.3
				? 'accepted'
				: 'review',
		hypothesesEvaluated: answers.length
	};
}
