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
import {rollup} from 'rollup';

const minifier = new cleancss({
    level: 2
});

const args = yargs(process.argv.slice(2))
    .options({
        clean: {
            default: false,
            describe: 'Clean-up dist folder before re-compile',
            type: 'boolean'
        },
        from: {
            default: 'src',
            describe: 'Folder to store the source files',
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
const DIR_FROM = args.from;
const DIR_TO = args.to;
const SILENT = args.silent;

if (!folder.get(DIR_FROM)) {
    !SILENT && console.error('Folder `' + DIR_FROM + '` does not exist.');
    process.exit();
}

if (!folder.get(DIR_TO)) {
    folder.set(DIR_TO, true);
    !SILENT && console.info('Create folder `' + DIR_TO + '`');
}

const MJS_FORMAT = args['mjs.format'] ?? 'iife';
const MJS_NAME = args['mjs.name'] ?? '$';

const c = {
    // input: path,
    output: {
        // file: to,
        format: MJS_FORMAT,
        name: MJS_NAME,
        sourcemap: false
    },
    plugins: [
        babel({
            babelHelpers: 'bundled',
            plugins: [
                '@babel/plugin-proposal-class-properties',
                '@babel/plugin-proposal-private-methods'
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
    !SILENT && console.info('Clean-up folder `' + DIR_TO + '`');
    for (let path in paths) {
        v = path + '/';
        if (v.startsWith(DIR + '/node_modules/')) {
            continue;
        }
        if (v.startsWith(DIR_FROM + '/')) {
            continue;
        }
        1 === paths[path] ? file.move(path) : folder.move(path);
    }
}

paths = folder.getContent(DIR_FROM, 'css,html,js,mjs,pug,scss', true);

for (let path in paths) {
    to = path;
    x = file.x(path);
    if (/^[_.]/.test(path)) {
        continue; // Skip hidden file/folder
    }
    to = to.replace(DIR_FROM + '/', DIR_TO + '/');
    !folder.get(v = file.parent(to)) && folder.set(v ?? '.', true);
    if (folder.isFolder(path)) {
        if (!folder.get(path)) {
            folder.set(path, true);
            !SILENT && console.info('Create folder `' + path + '`');
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
                !SILENT && console.info('Create file `' + v + '`');
                const generator = await rollup(c);
                await generator.write(c.output);
                await generator.close();
                // Generate browser module…
                file.setContent(to, beautify.js(content, {
                    indent_char: ' ',
                    indent_size: 4
                }));
                !SILENT && console.info('Create file `' + to + '`');
                minify(content, {
                    compress: {
                        unsafe: true
                    }
                }).then(result => {
                    file.setContent(v = to.replace(/\.js$/, '.min.js'), result.code);
                    !SILENT && console.info('Create file `' + v + '`');
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
            !SILENT && console.info('Create file `' + to + '`');
        } else if ('scss' === x) {
            sass.render({
                file: path,
                outputStyle: 'expanded'
            }, (error, result) => {
                if (error) {
                    throw error;
                }
                file.setContent(to, beautify.css(result.css.toString(), {
                    indent_char: ' ',
                    indent_size: 2
                }));
                !SILENT && console.info('Create file `' + to + '`');
                minifier.minify(result.css, (error, result) => {
                    if (error) {
                        throw error;
                    }
                    file.setContent(v = to.replace(/\.css$/, '.min.css'), result.styles);
                    !SILENT && console.info('Create file `' + v + '`');
                });
            });
            file.setContent(v = to.replace(/\.css$/, '.scss'), beautify.css(content, {
                indent_char: ' ',
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + v + '`');
        }
    } else {
        if ('css' === x) {
            file.setContent(to, beautify.css(file.parseContent(content, state), {
                indent_char: ' ',
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + to + '`');
            minifier.minify(result.css, (error, result) => {
                if (error) {
                    throw error;
                }
                file.setContent(to.replace(/\.css$/, '.min.css'), result.styles);
                !SILENT && console.info('Create file `' + to.replace(/\.css$/, '.min.css') + '`');
            });
        } else if ('html' === x) {
            file.setContent(to, beautify.html(file.parseContent(content, state), {
                indent_char: ' ',
                indent_inner_html: true,
                indent_size: 2
            }));
            !SILENT && console.info('Create file `' + to + '`');
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
                !SILENT && console.info('Create file `' + v + '`');
            });
        } else {
            file.copy(path, to);
            !SILENT && console.info('Copy file `' + path + '` to `' + to + '`');
        }
    }
}
