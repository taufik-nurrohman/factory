#!/usr/bin/env node

import * as file from '@taufik-nurrohman/file';
import * as folder from '@taufik-nurrohman/folder';
import beautify from 'js-beautify';
import cleancss from 'clean-css';
import commonJS from '@rollup/plugin-commonjs';
import fetch from 'node-fetch';
import resolvePackage from '@rollup/plugin-node-resolve';
import yargs from 'yargs';
import {babel} from '@rollup/plugin-babel';
import {compile as compilePug} from 'pug';
import {compileString as compileSass} from 'sass';
import {minify} from 'terser';
import {resolve} from 'path';
import {rollup} from 'rollup';
import {statSync, watch} from 'fs';

const minifier = new cleancss({
    level: {
        2: {
            restructureRules: true
        }
    }
});

const args = yargs(process.argv.slice(2))
    .options({
        'clean': {
            default: true,
            describe: 'Clean-up dist folder before re-compile',
            type: 'boolean'
        },
        'from': {
            default: 'src',
            describe: 'Folder to store the source files',
            type: 'string'
        },
        'js-bottom': {
            default: "",
            describe: 'Insert string at the bottom of the file',
            type: 'string'
        },
        'js-exports': {
            default: 'auto',
            describe: 'What export mode to use?',
            type: 'string'
        },
        'js-external': {
            default: "",
            describe: 'JavaScript external module names',
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
        'js-top': {
            default: "",
            describe: 'Insert string at the top of the file',
            type: 'string'
        },
        'mjs': {
            default: false,
            describe: 'Include MJS files to the output as well',
            type: 'boolean'
        },
        'scss': {
            default: false,
            describe: 'Include SCSS files to the output as well',
            type: 'boolean'
        },
        'silent': {
            default: false,
            describe: 'Disable logging',
            type: 'boolean'
        },
        'pug': {
            default: false,
            describe: 'Include Pug files to the output as well',
            type: 'boolean'
        },
        'to': {
            default: 'dist',
            describe: 'Folder to store the distributable files',
            type: 'string'
        }
    })
    .command('--from=src --to=dist')
    .help()
    .argv;

const normalizePath = path => path.replace(/\\/g, '/');

const CLEAN = args.clean;
const DIR = normalizePath(process.cwd());
const DIR_FROM = normalizePath(resolve(DIR + ('.' === args.from ? "" : '/' + args.from)));
const DIR_TO = normalizePath(resolve(DIR + ('.' === args.to ? "" : '/' + args.to)));
const SILENT = args.silent;

const INCLUDE_MJS = args.mjs;
const INCLUDE_PUG = args.pug;
const INCLUDE_SCSS = args.scss;

const relative = path => normalizePath(path).replace(DIR, '.');

// Fix #1
function resolvePath({parent, self}) {
    return {
        resolveId: function (id, origin) {
            id = normalizePath(id);
            if (origin && origin.startsWith(DIR)) {
                parent = file.parent(origin);
            }
            if (id.startsWith('./') || id.startsWith('../')) {
                return normalizePath(resolve(parent + '/' + id));
            }
            return null; // Continue to the next task(s)!
        }
    };
}

// Download URL
function resolveURL() {
    return {
        load: function (id) {
            if (-1 !== id.indexOf('://')) {
                !SILENT && console.info('Fetch URL: `' + id + '`');
                return fetch(id).then(v => v.text());
            }
            return null; // Continue to the next task(s)!
        },
        resolveId: function (id) {
            return -1 !== id.indexOf('://') ? id : null; // <https://github.com/rollup/rollup/issues/323#issuecomment-159314796>
        }
    }
}

if (!folder.get(DIR_FROM)) {
    !SILENT && console.error('Folder `' + relative(DIR_FROM) + '` does not exist.');
    process.exit();
}

if (!folder.get(DIR_TO)) {
    folder.set(DIR_TO, true);
    !SILENT && console.info('Create folder `' + relative(DIR_TO) + '`');
}

const JS_EXTERNAL = (args['js-external'] || "").split(/\s*,\s*/);
const JS_FORMAT = args['js-format'];
const JS_GLOBALS = {};
const JS_NAME = "" === args['js-name'] ? false : args['js-name'];

(args['js-globals'] || "").split(/\s*,\s*/).forEach(v => {
    v = v.split(/\s*:\s*/);
    JS_GLOBALS[v[0]] = v[1];
});

let license = (file.getContent(DIR_FROM + '/LICENSE') || file.getContent(DIR_FROM + '/LICENSE.txt') || "").trim();
let state = JSON.parse(file.getContent(DIR + '/package.json') || '{}');

state.year = (new Date).getFullYear();

license = file.parseContent(license, state);

let licenseCSS = '/*!\n *\n * ' + license.replace(/\n(\S)/g, '\n * $1').replace(/\n\n/g, '\n *\n') + '\n *\n */';
let licenseHTML = '<!--\n\n' + license + '\n\n-->';
let licenseJS = license.replace(/(^|\n)(\S)/g, '$1// $2');

state.css = {
    license: licenseCSS
};

state.html = {
    license: licenseHTML
};

state.js = {
    format: JS_FORMAT,
    license: licenseCSS,
    name: JS_NAME
};

state.mjs = {
    license: licenseCSS
};

state.pug = {
    license: '!= ' + JSON.stringify(licenseHTML)
};

state.scss = {
    license: licenseJS
};

delete state.scripts;

// <https://stackoverflow.com/a/48032528/1163000>
async function replaceAsync(content, pattern, then) {
    const promises = [];
    content.replace(pattern, (match, ...args) => {
        const promise = then(match, ...args);
        promises.push(promise);
    });
    const data = await Promise.all(promises);
    return content.replace(pattern, () => data.shift());
}

let content, paths, to, v, x;

if (CLEAN) {
    !SILENT && console.info('Clean-up folder `' + relative(DIR_TO) + '`');
    paths = folder.getContent(DIR_TO, (value, key) => {
        key = normalizePath(key) + '/';
        return -1 === key.indexOf('/.git/') && -1 === key.indexOf('/node_modules/');
    }, true);
    for (let path in paths) {
        v = normalizePath(path) + '/';
        if (v.startsWith(DIR_FROM + '/') || (DIR_FROM + '/').startsWith(v)) {
            continue;
        }
        v = v.slice(0, -1);
        if (
            // Skip hidden file/folder such as `.gitattributes` and `.gitignore`
            v.startsWith(DIR + '/.') ||
            // Skip special file
            v === DIR + '/LICENSE' ||
            v === DIR + '/README.md' ||
            v === DIR + '/composer.json' ||
            v === DIR + '/composer.lock' ||
            v === DIR + '/package-lock.json' ||
            v === DIR + '/package.json'
        ) {
            !SILENT && console.info('Skip file `' + relative(path) + '`');
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
    x = x.replace(/\s+/g, "");
    paths = folder.getContent(DIR_FROM, (value, key) => {
        key = normalizePath(key);
        // Skip file/folder in hidden folder
        if (/\/[_.]/.test(key.replace(DIR_FROM, ""))) {
            return false;
        }
        // Skip hidden file/folder
        if (/^[_.]/.test(file.name(key))) {
            return false;
        }
        if (1 === value && -1 === (',' + x + ',').indexOf(',' + file.x(key) + ',')) {
            return false;
        }
        key += '/';
        return -1 === key.indexOf('/.git/') && -1 === key.indexOf('/node_modules/');
    }, true);
    for (let path in paths) {
        to = normalizePath(path).replace(DIR_FROM + '/', DIR_TO + '/');
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
        to = to.replace(new RegExp('\\.(' + x.replace(/[,]/g, '|') + ')$'), "");
        then(path, to);
    }
}

function isFileStale(from, to) {
    if (!file.isFile(from)) {
        return true;
    }
    from = statSync(from);
    if (!from || !from.mtime) {
        return true;
    }
    if (!file.isFile(to)) {
        return true;
    }
    to = statSync(to);
    if (!to || !to.mtime) {
        return true;
    }
    return from.mtime.getTime() > to.mtime.getTime();
}

factory('jsx,mjs,ts,tsx', async function (from, to) {
    // Generate Node.js module…
    if (INCLUDE_MJS) {
        let v;
        if (isFileStale(from, v = to.replace(/\.js$/, '.mjs'))) {
            // Convert `/// fetch('./foo/bar.baz')` to raw code
            let content = await replaceAsync(file.parseContent(file.getContent(from), state), /\/{3,}\s*fetch\s*\(\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)\s*\)\s*;?/gi, ($0, $1) => {
                let id = $1.slice(1, -1);
                if (-1 !== id.indexOf('://')) {
                    !SILENT && console.info('Fetch URL: `' + id + '`');
                    return fetch(id).then(v => v.text());
                }
                return file.getContent(resolve(file.parent(from) + '/' + id)) ?? $0;
            });
            content = content.replace(/(^|\n)(\/{3,})[ \t]*iife\(\s*([\s\S]*?)\s*\n\2[ \t]*\)[ \t]*(\n|$)/i, "");
            file.setContent(v, content);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        }
    }
    if (isFileStale(from, to)) {
        let top = args['js-top'];
        let bottom = args['js-bottom'];
        if (top) {
            top = file.parseContent(top, state);
        }
        if (bottom) {
            bottom = file.parseContent(bottom, state);
        }
        const generator = await rollup({
            context: 'this', // <https://rollupjs.org/guide/en#context>
            external: JS_EXTERNAL,
            input: from,
            // WARNING: Do not sort!
            plugins: [
                babel(state.babel || {
                    babelHelpers: 'bundled',
                    // WARNING: Do not sort!
                    plugins: [
                        '@babel/plugin-transform-class-static-block',
                        '@babel/plugin-transform-class-properties',
                        '@babel/plugin-transform-private-methods',
                        '@babel/plugin-transform-private-property-in-object'
                    ],
                    presets: [
                        ['@babel/preset-env', {
                            modules: false,
                            targets: '>0.25%'
                        }]
                    ]
                }),
                commonJS(),
                resolvePath({
                    parent: file.parent(from),
                    self: from
                }),
                resolvePackage({
                    moduleDirectories: ['node_modules']
                }),
                resolveURL()
            ]
        });
        await generator.write({
            banner: top,
            compact: true,
            exports: args['js-exports'],
            file: to,
            footer: bottom,
            format: JS_FORMAT,
            globals: JS_GLOBALS,
            name: JS_NAME,
            sourcemap: false
        });
        await generator.close();
        // Convert `/// fetch('./foo/bar.baz')` to raw code
        let content = await replaceAsync(file.parseContent(file.getContent(to), state), /\/{3,}\s*fetch\s*\(\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)\s*\)\s*;?/gi, ($0, $1) => {
            let id = $1.slice(1, -1);
            if (-1 !== id.indexOf('://')) {
                !SILENT && console.info('Fetch URL: `' + id + '`');
                return fetch(id).then(v => v.text());
            }
            return file.getContent(resolve(file.parent(from) + '/' + id)) ?? $0;
        });
        // Generate browser module…
        file.setContent(to, beautify.js(content, {
            end_with_newline: false,
            eol: '\n',
            indent_char: ' ',
            indent_size: 4,
            preserve_newlines: false,
            space_after_anon_function: true,
            space_after_named_function: false,
            space_in_empty_paren: false,
            space_in_paren: false
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
    }
}, state);

factory('pug', function (from, to) {
    let content = file.parseContent(file.getContent(from), state);
    if (INCLUDE_PUG) {
        let v;
        if (isFileStale(from, v = to.replace(/\.html$/, '.pug'))) {
            file.setContent(v, content);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        }
    }
    if (isFileStale(from, to)) {
        let pug = compilePug(content, {
            basedir: DIR_FROM,
            doctype: 'html',
            filename: from // What is this for by the way?
        });
        file.setContent(to, beautify.html(pug(state), {
            css: {
                end_with_newline: false,
                eol: '\n',
                indent_char: ' ',
                indent_size: 2,
                newline_between_rules: false,
                selector_separator_newline: true,
                space_around_combinator: true
            },
            end_with_newline: false,
            eol: '\n',
            extra_liners: [],
            indent_char: ' ',
            indent_inner_html: true,
            indent_size: 2,
            js: {
                end_with_newline: false,
                eol: '\n',
                indent_char: ' ',
                indent_size: 4,
                preserve_newlines: false,
                space_after_anon_function: true,
                space_after_named_function: false,
                space_in_empty_paren: false,
                space_in_paren: false
            }
        }));
        !SILENT && console.info('Create file `' + relative(to) + '`');
    }
}, state);

factory('scss', async function (from, to) {
    // Convert `/// fetch('./foo/bar.baz')` to raw code
    let content = await replaceAsync(file.parseContent(file.getContent(from), state), /\/{3,}\s*fetch\s*\(\s*("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)\s*\)\s*;?/gi, ($0, $1) => {
        let id = $1.slice(1, -1);
        if (-1 !== id.indexOf('://')) {
            !SILENT && console.info('Fetch URL: `' + id + '`');
            return fetch(id).then(v => v.text());
        }
        return file.getContent(resolve(file.parent(from) + '/' + id)) ?? $0;
    });
    if (INCLUDE_SCSS) {
        let v;
        if (isFileStale(from, v = to.replace(/\.css$/, '.scss'))) {
            file.setContent(v, content);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        }
    }
    if (isFileStale(from, to)) {
        let result = compileSass(content, {
            loadPaths: [file.parent(from)],
            style: 'expanded'
        });
        file.setContent(to, beautify.css(v = result.css.toString(), {
            end_with_newline: false,
            eol: '\n',
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
    }
}, state);

// File(s) that ends with `.txt` extension will not include the `.txt` part to the
// destination folder. To include the `.txt` part to the destination folder, be
// sure to double the `.txt` suffix after the file name. Example: `LICENSE.txt.txt`
factory('txt', function (from, to) {
    if (isFileStale(from, to)) {
        file.setContent(to, file.parseContent(file.getContent(from), state));
        !SILENT && console.info('Create file `' + relative(to) + '`');
    }
}, state);