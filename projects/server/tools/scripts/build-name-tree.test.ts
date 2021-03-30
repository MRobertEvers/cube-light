import { getStartTreeFromRoot } from './create-completion-list-from-lookup-tree';

const lookupTree = {
	a: {
		b: {
			d: {
				$: {}
			}
		}
	},
	A: {
		b: {
			c: {
				$: {}
			}
		}
	}
};

const startTree = getStartTreeFromRoot('ab', lookupTree);

console.log(startTree);
