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

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}