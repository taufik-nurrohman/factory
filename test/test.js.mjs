import prefix from './_part.mjs';
import suffix from './_part/test.mjs';

export default function foo() {
    return prefix() + ' bar ' + suffix();
}