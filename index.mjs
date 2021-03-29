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

const args = yargs(process.argv.slice(2)).command('--from=src-folder --to=dist-folder').help().argv;

const DIR = process.cwd();
const FROM = args.from ?? 'src';
const TO = args.to ?? 'dist';

if (!folder.get(FROM)) {
    console.error('Folder `' + FROM + '` does not exist.');
    process.exit();
}

if (!folder.get(TO)) {
    folder.set(TO, true);
    console.info('Create folder `' + TO + '`');
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

let license = (file.getContent(FROM + '/LICENSE') || "").trim();
let state = JSON.parse(file.getContent('package.json'));

state.mjs = {
    format: MJS_FORMAT,
    name: MJS_NAME
};

state.year = (new Date).getFullYear();

delete state.scripts;

if (license) {
    license = license.replace(/\n/g, '\n * ');
    license = license.replace(/\n \* \n/g, '\n *\n');
    license = '/*!\n *\n * ' + license + '\n *\n */';
}

let content, paths, to, x;

paths = folder.getContent(TO, null, true);

console.info('Clean-up folder `' + TO + '`');

for (let path in paths) {
    if (path.startsWith(DIR + '/node_modules/')) {
        continue;
    }
    console.log(path);
}

paths = folder.getContent(FROM, 'css,html,js,mjs,pug,scss', true);

for (let path in paths) {
    to = path;
    x = file.x(path);
    if (/^[_.]/.test(path)) {
        continue; // Skip hidden file/folder
    }
    to = to.replace(FROM + '/', TO + '/');
    !folder.get(file.parent(to)) && folder.set(file.parent(to) ?? '.', true);
    if (folder.isFolder(path)) {
        if (!folder.get(path)) {
            folder.set(path, true);
            console.info('Create folder `' + path + '`');
        }
        continue;
    }
    if (/^(mjs|pug|scss)$/.test(x)) {
        to = to.replace(/\.(mjs|pug|scss)$/, "");
        if ('mjs' === x) {
            c.input = path;
            c.output.file = to;
            (async () => {
                const generator = await rollup(c);
                await generator.write(c.output);
                await generator.close();
                // Generate browser module…
                content = file.getContent(to);
                content = file.parseContent(license + '\n\n' + content, state);
                file.setContent(to, beautify.js(content, {
                    indent_char: ' ',
                    indent_size: 4
                }));
                console.info('Create file `' + to + '`');
                minify(content, {
                    compress: {
                        unsafe: true
                    }
                }).then(result => {
                    file.setContent(to.replace(/\.js$/, '.min.js'), result.code);
                });
                console.info('Create file `' + to.replace(/\.js$/, '.min.js') + '`');
                // Generate Node.js module…
                content = file.getContent(path);
                content = file.parseContent(license + '\n\n' + content, state);
                file.setContent(to.replace(/\.js$/, '.mjs'), beautify.js(content, {
                    indent_char: ' ',
                    indent_size: 4
                }));
                console.info('Create file `' + to.replace(/\.js$/, '.mjs') + '`');
            })();
        } else if ('pug' === x) {
            content = compile(file.getContent(path), {
                basedir: FROM,
                doctype: 'html',
                filename: path // What is this for by the way?
            });
            file.setContent(to, beautify.html(file.parseContent(content(state), state), {
                indent_char: ' ',
                indent_inner_html: true,
                indent_size: 2
            }));
            console.info('Create file `' + to + '`');
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
                console.info('Create file `' + to + '`');
                minifier.minify(result.css, (error, result) => {
                    if (error) {
                        throw error;
                    }
                    file.setContent(to.replace(/\.css$/, '.min.css'), result.styles);
                    console.info('Create file `' + to.replace(/\.css$/, '.min.css') + '`');
                });
            });
        }
    } else {
        content = file.getContent(path);
        if ('css' === x) {
            file.setContent(to, beautify.css(file.parseContent(content, state), {
                indent_char: ' ',
                indent_size: 2
            }));
            console.info('Create file `' + to + '`');
            minifier.minify(result.css, (error, result) => {
                if (error) {
                    throw error;
                }
                file.setContent(to.replace(/\.css$/, '.min.css'), result.styles);
                console.info('Create file `' + to.replace(/\.css$/, '.min.css') + '`');
            });
        } else if ('html' === x) {
            file.setContent(to, beautify.html(file.parseContent(content, state), {
                indent_char: ' ',
                indent_inner_html: true,
                indent_size: 2
            }));
            console.info('Create file `' + to + '`');
        } else if ('js' === x) {
            file.setContent(to, beautify.js(file.parseContent(content, state), {
                indent_char: ' ',
                indent_size: 4
            }));
            minify(content, {
                compress: {
                    unsafe: true
                }
            }).then(result => {
                file.setContent(to.replace(/\.js$/, '.min.js'), result.code);
                console.info('Create file `' + to.replace(/\.js$/, '.min.js') + '`');
            });
        } else {
            file.copy(path, to);
            console.info('Copy file `' + to + '`');
        }
    }
}
