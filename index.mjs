#!/usr/bin/env node

import * as file from '@taufik-nurrohman/file';
import * as folder from '@taufik-nurrohman/folder';
import beautify from 'js-beautify';
import cleancss from 'clean-css';
import resolve from '@rollup/plugin-node-resolve';
import sass from 'node-sass';
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
        'mjs.format': {
            default: 'iife',
            describe: 'JavaScript module format',
            type: 'string'
        },
        'mjs.globals': {
            default: "",
            describe: 'JavaScript global variables.',
            type: 'string'
        },
        'mjs.name': {
            default: "",
            describe: 'JavaScript module name',
            type: 'string'
        },
        silent: {
            default: false,
            describe: 'Disable logging',
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

const relative = path => path.replace(DIR, '.');

if (!folder.get(DIR_FROM)) {
    !SILENT && console.error('Folder `' + relative(DIR_FROM) + '` does not exist.');
    process.exit();
}

if (!folder.get(DIR_TO)) {
    folder.set(DIR_TO, true);
    !SILENT && console.info('Create folder `' + relative(DIR_TO) + '`');
}

const MJS_FORMAT = args['mjs.format'];
const MJS_GLOBALS = {};
const MJS_NAME = "" === args['mjs.name'] ? false : args['mjs.name'];

(args['mjs.globals'] || "").split(/\s*,\s*/).forEach(v => {
    v = v.split(/\s*:\s*/);
    MJS_GLOBALS[v[0]] = v[1];
});

const c = {
    // input: path,
    output: {
        // file: to,
        format: MJS_FORMAT,
        globals: MJS_GLOBALS,
        name: MJS_NAME,
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
        resolve()
    ]
};

let license = (file.getContent(DIR_FROM + '/LICENSE') || "").trim();
let state = JSON.parse(file.getContent('package.json')) || {};

state.mjs = {
    format: MJS_FORMAT,
    name: MJS_NAME
};

state.year = (new Date).getFullYear();

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

paths = folder.getContent(DIR_FROM, 'css,html,js,mjs,pug,scss', true);

for (let path in paths) {
    to = path;
    x = file.x(path);
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
    if (/^(mjs|pug|scss)$/.test(x)) {
        to = to.replace(/\.(mjs|pug|scss)$/, "");
        if ('mjs' === x) {
            c.input = path;
            c.output.file = to;
            (async () => {
                // Generate Node.js module…
                file.setContent(v = to.replace(/\.js$/, '.mjs'), beautify.js(content, {
                    indent_char: ' ',
                    indent_size: 4
                }));
                !SILENT && console.info('Create file `' + relative(v) + '`');
                const generator = await rollup(c);
                await generator.write(c.output);
                await generator.close();
                // Generate browser module…
                file.setContent(to, beautify.js(content, {
                    indent_char: ' ',
                    indent_size: 4
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
        } else if ('pug' === x) {
            let pug = compile(content, {
                basedir: DIR_FROM,
                doctype: 'html',
                filename: path // What is this for by the way?
            });
            file.setContent(to, beautify.html(pug(state), {
                indent_char: ' ',
                indent_inner_html: true,
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + relative(to) + '`');
        } else if ('scss' === x) {
            sass.render({
                data: content,
                outputStyle: 'expanded'
            }, (error, result) => {
                if (error) {
                    throw error;
                }
                file.setContent(to, beautify.css(v = result.css.toString(), {
                    indent_char: ' ',
                    indent_size: 2
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
            file.setContent(v = to.replace(/\.css$/, '.scss'), content);
            !SILENT && console.info('Create file `' + relative(v) + '`');
        }
    } else {
        if ('css' === x) {
            file.setContent(to, beautify.css(content, {
                indent_char: ' ',
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + relative(to) + '`');
            minifier.minify(content, (error, result) => {
                if (error) {
                    throw error;
                }
                file.setContent(v = to.replace(/\.css$/, '.min.css'), result.styles);
                !SILENT && console.info('Create file `' + relative(v) + '`');
            });
        } else if ('html' === x) {
            file.setContent(to, beautify.html(content, {
                indent_char: ' ',
                indent_inner_html: true,
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + relative(to) + '`');
        } else if ('js' === x) {
            file.setContent(to, beautify.js(content, {
                indent_char: ' ',
                indent_size: 4
            }));
            minify(content, {
                compress: {
                    unsafe: true
                }
            }).then(result => {
                file.setContent(v = to.replace(/\.js$/, '.min.js'), result.code);
                !SILENT && console.info('Create file `' + relative(v) + '`');
            });
        } else {
            file.copy(path, to);
            !SILENT && console.info('Copy file `' + relative(path) + '` to `' + relative(to) + '`');
        }
    }
}
