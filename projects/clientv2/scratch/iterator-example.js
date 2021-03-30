// function* range(start, stop) {
// 	for (let i = start; i < stop; i++) {
// 		yield i;
// 	}
// }

// for (const i of range(0, 5)) {
// 	console.log(i);
// }

// function* fun() {
// 	yield 1;

// 	yield 6;

// 	yield 11;

// 	yield 'bum';
// }

// const iter = fun();
// for (const item of iter) {
// 	console.log(item);
// }

// const iter2 = fun();

// const result = iter2.next();
// console.log(result.done, result.value);

// const collcoll = {
// 	a: [1, 2, 3],
// 	b: ['a', 'b', 'c']
// };

// function* iterCollColl(collcoll) {
// 	for (const [key, value] of Object.entries(collcoll)) {
// 		for (const elem of value) {
// 			console.log(elem);
// 		}
// 	}
// }

// for (const elem of iterCollColl(collcoll)) {
// }

function* shittyStringInterpolation() {
	let mystring = 'first part {';

	const inject = yield;

	mystring += inject;

	mystring += '} second part {';

	const inject2 = yield;

	mystring += inject2;
	mystring += '}';

	return mystring;
}

const iter = shittyStringInterpolation();

let result = iter.next();

result = iter.next('FIRST');

result = iter.next('SECOND');

console.log(result.value);
