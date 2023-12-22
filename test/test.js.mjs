import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

import parent from '../test.mjs';

// Test inline import
import '../test.js.txt';

// Test inline import
import 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/js/bootstrap.min.js';

// @if iife
window.jQuery.fn.foo = 'bar';
// @end-if

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}