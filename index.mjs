#!/usr/bin/env node

import * as file from '@taufik-nurrohman/file';
import * as folder from '@taufik-nurrohman/folder';
import beautify from 'js-beautify';
import cleancss from 'clean-css';
import resolve from '@rollup/plugin-node-resolve';
import sass from 'node-sass';
import virtual from '@rollup/plugin-virtual';
import yargs from 'yargs';
import {babel, getBabelOutputPlugin} from '@rollup/plugin-babel';
import {compile} from 'pug';
import {minify} from 'terser';
import {normalize} from 'path';
import {rollup} from 'rollup';

const minifier = new cleancss({
    level: 2
});

const args = yargs(process.argv.slice(2))
    .options({
        clean: {
            default: true,
            describe: 'Clean-up dist folder before re-compile',
            type: 'boolean'
        },
        from: {
            default: 'src',
            describe: 'Folder to store the source files',
            type: 'string'
        },
        'js-format': {
            default: 'iife',
            describe: 'JavaScript module format',
            type: 'string'
        },
        'js-globals': {
            default: "",
            describe: 'JavaScript global variables',
            type: 'string'
        },
        'js-name': {
            default: "",
            describe: 'JavaScript module name',
            type: 'string'
        },
        mjs: {
            default: false,
            describe: 'Include MJS files to the output as well',
            type: 'boolean'
        },
        scss: {
            default: false,
            describe: 'Include SCSS files to the output as well',
            type: 'boolean'
        },
        silent: {
            default: false,
            describe: 'Disable logging',
            type: 'boolean'
        },
        pug: {
            default: false,
            describe: 'Include Pug files to the output as well',
            type: 'boolean'
        },
        to: {
            default: 'dist',
            describe: 'Folder to store the distributable files',
            type: 'string'
        }
    })
    .command('--from=src --to=dist')
    .help()
    .argv;

const CLEAN = args.clean;
const DIR = process.cwd();
const DIR_FROM = normalize(DIR + '/' + args.from);
const DIR_TO = normalize(DIR + '/' + args.to);
const SILENT = args.silent;

const INCLUDE_MJS = args.mjs;
const INCLUDE_PUG = args.pug;
const INCLUDE_SCSS = args.scss;

const relative = path => path.replace(DIR, '.');

if (!folder.get(DIR_FROM)) {
    !SILENT && console.error('Folder `' + relative(DIR_FROM) + '` does not exist.');
    process.exit();
}

if (!folder.get(DIR_TO)) {
    folder.set(DIR_TO, true);
    !SILENT && console.info('Create folder `' + relative(DIR_TO) + '`');
}

const JS_FORMAT = args['js-format'];
const JS_GLOBALS = {};
const JS_NAME = "" === args['js-name'] ? false : args['js-name'];

(args['js-globals'] || "").split(/\s*,\s*/).forEach(v => {
    v = v.split(/\s*:\s*/);
    JS_GLOBALS[v[0]] = v[1];
});

let license = (file.getContent(DIR_FROM + '/LICENSE') || "").trim();
let state = JSON.parse(file.getContent('package.json')) || {};

state.year = (new Date).getFullYear();

license = file.parseContent(license, state);

state.css = {
    license: '/*!\n *\n * ' + license.replace(/\n/g, '\n * ').replace(/\n [*] \n/g, '\n *\n') + '\n *\n */'
};

state.html = {
    license: '<!--\n\n' + license + '\n\n-->'
};

state.js = {
    format: JS_FORMAT,
    license: '/*!\n *\n * ' + license.replace(/\n/g, '\n * ').replace(/\n [*] \n/g, '\n *\n') + '\n *\n */',
    name: JS_NAME
};

delete state.scripts;

let content, paths, to, v, x;

paths = folder.getContent(DIR_TO, null, true);

if (CLEAN) {
    !SILENT && console.info('Clean-up folder `' + relative(DIR_TO) + '`');
    for (let path in paths) {
        v = path + '/';
        if (
            v.startsWith(DIR + '/.git/') ||
            v.startsWith(DIR + '/node_modules/') ||
            v.startsWith(DIR_FROM + '/')
        ) {
            continue;
        }
        if (
            path === DIR + '/.gitattributes' ||
            path === DIR + '/.gitignore' ||
            path === DIR + '/LICENSE' ||
            path === DIR + '/README' ||
            path === DIR + '/composer.json' ||
            path === DIR + '/composer.lock' ||
            path === DIR + '/package-lock.json' ||
            path === DIR + '/package.json'
        ) {
            continue;
        }
        if (1 === paths[path]) {
            file.get(path) && file.move(path);
        } else {
            folder.get(path) && folder.move(path);
        }
    }
}

function factory(x, then, state) {
    let paths = folder.getContent(DIR_FROM, x, true);
    for (let path in paths) {
        to = path;
        if (/^[_.]/.test(file.name(path))) {
            continue; // Skip hidden file/folder
        }
        to = to.replace(DIR_FROM + '/', DIR_TO + '/');
        if (!folder.get(v = file.parent(to))) {
            folder.set(v || '.', true);
        }
        if (folder.isFolder(path)) {
            if (!folder.get(path)) {
                folder.set(path, true);
                !SILENT && console.info('Create folder `' + relative(path) + '`');
            }
            continue;
        }
        content = file.getContent(path);
        content = file.parseContent(content, state);
        to = to.replace(new RegExp('\\.' + x + '$'), "");
        then(path, to, content);
    }
}

factory('mjs', function(from, to, content) {
    if (!/\.js$/.test(to)) {
        to += '.js';
    }
    // Generate Node.js module…
    if (INCLUDE_MJS) {
        file.setContent(v = to.replace(/\.js$/, '.mjs'), content);
        !SILENT && console.info('Create file `' + relative(v) + '`');
    }
    const c = {
        input: 'entry',
        output: {
            file: to,
            format: JS_FORMAT,
            globals: JS_GLOBALS,
            name: JS_NAME,
            sourcemap: false
        },
        plugins: [
            babel({
                babelHelpers: 'bundled',
                plugins: [
                    ['@babel/plugin-proposal-class-properties', {
                        loose: true
                    }],
                    ['@babel/plugin-proposal-private-methods', {
                        loose: true
                    }]
                ],
                presets: [
                    ['@babel/preset-env', {
                        loose: true,
                        modules: false,
                        targets: '>0.25%'
                    }]
                ]
            }),
            getBabelOutputPlugin({
                allowAllFormats: true
            }),
            resolve(),
            virtual({
                entry: content
            })
        ]
    };
    (async () => {
        const generator = await rollup(c);
        await generator.write(c.output);
        await generator.close();
        // Generate browser module…
        content = file.getContent(to);
        file.setContent(to, beautify.js(content, {
            indent_char: ' ',
            indent_size: 4,
            preserve_newlines: false
        }));
        !SILENT && console.info('Create file `' + relative(to) + '`');
        minify(content, {
            compress: {
                unsafe: true
            }
        }).then(result => {
            file.setContent(v = to.replace(/\.js$/, '.min.js'), result.code);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        });
    })();
}, state);

factory('pug', function(from, to, content) {
    // if (!/\.html$/.test(to)) {
    //     to += '.html';
    // }
    if (INCLUDE_PUG) {
        file.setContent(v = to.replace(/\.html$/, '.pug'), content);
        !SILENT && console.info('Create file `' + relative(v) + '`');
    }
    let pug = compile(content, {
        basedir: DIR_FROM,
        doctype: 'html',
        filename: from // What is this for by the way?
    });
    file.setContent(to, beautify.html(pug(state), {
        css: {
            newline_between_rules: false,
            selector_separator_newline: true,
            space_around_combinator: true
        },
        extra_liners: [],
        indent_char: ' ',
        indent_inner_html: true,
        indent_size: 2,
        js: {
            indent_size: 4
        }
    }));
    !SILENT && console.info('Create file `' + relative(to) + '`');
}, state);

factory('scss', function(from, to, content) {
    if (!/\.css$/.test(to)) {
        to += '.css';
    }
    if (INCLUDE_SCSS) {
        file.setContent(v = to.replace(/\.css$/, '.scss'), content);
        !SILENT && console.info('Create file `' + relative(v) + '`');
    }
    sass.render({
        data: content,
        outputStyle: 'compact'
    }, (error, result) => {
        if (error) {
            throw error;
        }
        file.setContent(to, beautify.css(v = result.css.toString(), {
            indent_char: ' ',
            indent_size: 2,
            newline_between_rules: false,
            selector_separator_newline: true,
            space_around_combinator: true
        }));
        !SILENT && console.info('Create file `' + relative(to) + '`');
        minifier.minify(v, (error, result) => {
            if (error) {
                throw error;
            }
            file.setContent(v = to.replace(/\.css$/, '.min.css'), result.styles);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        });
    });
}, state);
