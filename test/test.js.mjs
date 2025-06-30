import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

import parent from '../test.mjs';

// Test inline
/// FETCH("../test.js.txt");
/// FETCH('../test.js.txt');
/// FETCH(`../test.js.txt`);

// Test inline
/// FETCH("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js");
/// FETCH('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js');
/// FETCH(`https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js`);

/// IIFE(
window.jQuery.fn.foo = 'bar';
/// )

/*! %(file.to) */

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}

let x = 'string' === typeof y;

function asdf(a, b = 2, {c = false}) {
    console.log({a, b, c: c ?? 3});
}

const ghjk = new Map;

for (let a of ghjk) {
    let [k, v] = a;
    console.log({k, v});
}