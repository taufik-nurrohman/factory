import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

import parent from '../test.mjs';

// Test inline import
import '../test.js.txt';

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}