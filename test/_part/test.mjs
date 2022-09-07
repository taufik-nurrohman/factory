import parent from '../../test.mjs';
import yikes from '../_parent.mjs';

export default function () {
    return 'baz' + '\n\n' + yikes() + '\n\n' + parent();
}