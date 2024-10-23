import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

import parent from '../test.mjs';

// Test inline
+fetch("../test.js.txt");
+fetch('../test.js.txt');

// Test inline
+fetch("https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js");
+fetch('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js');

// +if iife
window.jQuery.fn.foo = 'bar';
// +end-if

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}