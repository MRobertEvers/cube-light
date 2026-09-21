// Boykov–Kolmogorov max-flow/min-cut ("An Experimental Comparison of Min-Cut/Max-Flow
// Algorithms for Energy Minimization in Vision", PAMI 2004), the solver used by GrabCut.
// Search trees, FIFO active/orphan queues, and arc order are all fixed, so the same graph
// always yields the same cut.

const NONE = -1, TERMINAL = -2, ORPHAN = -3;
const INFINITE_DISTANCE = 0x3fffffff;

export class MaxFlowGraph {
	readonly nodes: number;
	private readonly first: Int32Array;
	private head: Int32Array;
	private next: Int32Array;
	private cap: Float64Array;
	private arcs = 0;
	private readonly terminal: Float64Array;
	private readonly parent: Int32Array;
	private readonly sink: Uint8Array;
	private readonly stamp: Int32Array;
	private readonly distance: Int32Array;
	private readonly queued: Uint8Array;
	private flow = 0;

	constructor(nodes: number, expectedEdges: number) {
		this.nodes = nodes;
		this.first = new Int32Array(nodes).fill(NONE);
		this.head = new Int32Array(expectedEdges * 2);
		this.next = new Int32Array(expectedEdges * 2);
		this.cap = new Float64Array(expectedEdges * 2);
		this.terminal = new Float64Array(nodes);
		this.parent = new Int32Array(nodes);
		this.sink = new Uint8Array(nodes);
		this.stamp = new Int32Array(nodes);
		this.distance = new Int32Array(nodes);
		this.queued = new Uint8Array(nodes);
	}

	addTerminalWeights(node: number, fromSource: number, toSink: number): void {
		const delta = this.terminal[node];
		if (delta > 0) fromSource += delta; else toSink -= delta;
		this.flow += Math.min(fromSource, toSink);
		this.terminal[node] = fromSource - toSink;
	}

	/** Adds i→j with capacity `forward` and j→i with capacity `backward` (arcs 2k and 2k+1). */
	addEdge(i: number, j: number, forward: number, backward: number): void {
		if (this.arcs + 2 > this.head.length) this.grow();
		const a = this.arcs;
		this.head[a] = j; this.cap[a] = forward; this.next[a] = this.first[i]; this.first[i] = a;
		this.head[a + 1] = i; this.cap[a + 1] = backward; this.next[a + 1] = this.first[j]; this.first[j] = a + 1;
		this.arcs += 2;
	}

	private grow(): void {
		const size = Math.max(16, this.head.length * 2);
		const head = new Int32Array(size), next = new Int32Array(size), cap = new Float64Array(size);
		head.set(this.head); next.set(this.next); cap.set(this.cap);
		this.head = head; this.next = next; this.cap = cap;
	}

	/** True when the node is on the source side of the minimum cut. Free nodes count as source, as in OpenCV. */
	inSourceSegment(node: number): boolean {
		return this.parent[node] === NONE || !this.sink[node];
	}

	maxflow(): number {
		const { first, head, next, cap, terminal, parent, sink, stamp, distance, queued, nodes } = this;
		const active = new Int32Array(nodes + 1);
		let activeHead = 0, activeTail = 0, activeCount = 0;
		const orphans: number[] = [];
		let orphanHead = 0;
		let time = 0;
		const setActive = (i: number) => {
			if (queued[i]) return;
			queued[i] = 1; active[activeTail] = i; activeTail = (activeTail + 1) % active.length; activeCount++;
		};
		const nextActive = (): number => {
			while (activeCount > 0) {
				const i = active[activeHead]; activeHead = (activeHead + 1) % active.length; activeCount--;
				queued[i] = 0;
				if (parent[i] !== NONE) return i;
			}
			return NONE;
		};
		const orphan = (i: number) => { parent[i] = ORPHAN; orphans.push(i); };

		for (let i = 0; i < nodes; i++) {
			queued[i] = 0; stamp[i] = 0;
			if (terminal[i] > 0) { sink[i] = 0; parent[i] = TERMINAL; distance[i] = 1; setActive(i); }
			else if (terminal[i] < 0) { sink[i] = 1; parent[i] = TERMINAL; distance[i] = 1; setActive(i); }
			else parent[i] = NONE;
		}

		let current = NONE;
		for (;;) {
			let i = current;
			if (i !== NONE) { queued[i] = 0; if (parent[i] === NONE) i = NONE; }
			if (i === NONE && (i = nextActive()) === NONE) break;

			// Grow the tree containing i until it touches the other tree.
			let bridge = NONE;
			if (!sink[i]) {
				for (let a = first[i]; a !== NONE; a = next[a]) {
					if (cap[a] <= 0) continue;
					const j = head[a];
					if (parent[j] === NONE) { sink[j] = 0; parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; setActive(j); }
					else if (sink[j]) { bridge = a; break; }
					else if (stamp[j] <= stamp[i] && distance[j] > distance[i]) { parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; }
				}
			} else {
				for (let a = first[i]; a !== NONE; a = next[a]) {
					if (cap[a ^ 1] <= 0) continue;
					const j = head[a];
					if (parent[j] === NONE) { sink[j] = 1; parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; setActive(j); }
					else if (!sink[j]) { bridge = a ^ 1; break; }
					else if (stamp[j] <= stamp[i] && distance[j] > distance[i]) { parent[j] = a ^ 1; stamp[j] = stamp[i]; distance[j] = distance[i] + 1; }
				}
			}
			time++;
			if (bridge === NONE) { current = NONE; continue; }
			// Keep processing i next iteration; it may still have free neighbours.
			queued[i] = 1; current = i;

			// Augment along source → bridge → sink.
			let bottleneck = cap[bridge];
			for (let k = head[bridge ^ 1]; ;) {
				const a = parent[k];
				if (a === TERMINAL) { bottleneck = Math.min(bottleneck, terminal[k]); break; }
				bottleneck = Math.min(bottleneck, cap[a ^ 1]); k = head[a];
			}
			for (let k = head[bridge]; ;) {
				const a = parent[k];
				if (a === TERMINAL) { bottleneck = Math.min(bottleneck, -terminal[k]); break; }
				bottleneck = Math.min(bottleneck, cap[a]); k = head[a];
			}
			cap[bridge ^ 1] += bottleneck; cap[bridge] -= bottleneck;
			for (let k = head[bridge ^ 1]; ;) {
				const a = parent[k];
				if (a === TERMINAL) { terminal[k] -= bottleneck; if (terminal[k] === 0) orphan(k); break; }
				cap[a] += bottleneck; cap[a ^ 1] -= bottleneck;
				if (cap[a ^ 1] === 0) orphan(k);
				k = head[a];
			}
			for (let k = head[bridge]; ;) {
				const a = parent[k];
				if (a === TERMINAL) { terminal[k] += bottleneck; if (terminal[k] === 0) orphan(k); break; }
				cap[a ^ 1] += bottleneck; cap[a] -= bottleneck;
				if (cap[a] === 0) orphan(k);
				k = head[a];
			}
			this.flow += bottleneck;

			// Adoption: find each orphan a valid parent in its own tree, or free it.
			time++;
			while (orphanHead < orphans.length) {
				const o = orphans[orphanHead++];
				const inSink = sink[o];
				let bestArc = NONE, bestDistance = INFINITE_DISTANCE;
				for (let a = first[o]; a !== NONE; a = next[a]) {
					if ((inSink ? cap[a] : cap[a ^ 1]) <= 0) continue;
					const j = head[a];
					if (sink[j] !== inSink || parent[j] === NONE) continue;
					let d = 0, k = j;
					for (;;) {
						if (stamp[k] === time) { d += distance[k]; break; }
						const up = parent[k]; d++;
						if (up === TERMINAL) { stamp[k] = time; distance[k] = 1; break; }
						if (up === ORPHAN) { d = INFINITE_DISTANCE; break; }
						k = head[up];
					}
					if (d >= INFINITE_DISTANCE) continue;
					if (d < bestDistance) { bestArc = a; bestDistance = d; }
					for (k = j; stamp[k] !== time; k = head[parent[k]]) { stamp[k] = time; distance[k] = d--; }
				}
				if (bestArc !== NONE) { parent[o] = bestArc; stamp[o] = time; distance[o] = bestDistance + 1; continue; }
				parent[o] = NONE;
				for (let a = first[o]; a !== NONE; a = next[a]) {
					const j = head[a];
					if (sink[j] !== inSink || parent[j] === NONE) continue;
					if ((inSink ? cap[a] : cap[a ^ 1]) > 0) setActive(j);
					const up = parent[j];
					if (up !== TERMINAL && up !== ORPHAN && head[up] === o) orphan(j);
				}
			}
			orphans.length = 0; orphanHead = 0;
		}
		return this.flow;
	}
}
