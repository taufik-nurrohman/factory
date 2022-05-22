import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

import parent from '../test.mjs';

export default function foo() {
    return prefix() + ' bar ' + suffix() + ' ' + parent();
}