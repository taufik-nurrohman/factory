Factory
=======

Simple Node.js script to generate CSS, HTML and JavaScript files from ECMAScript, Pug and SCSS files.

Usage
-----

~~~ sh
$ mkdir my-project
$ mkdir my-project/src
$ mkdir my-project/dist
~~~

Paste your `*.scss`, `*.mjs`, and `*.pug` files to `./my-project/src` folder.

~~~ sh
$ npm install @taufik-nurrohman/factory --global --save-dev
~~~

Generate the production ready files this way:

~~~ sh
$ cd my-project
$ pack
~~~

File extension from the source folder will be removed. Make sure to name your files with two file extension like so:

 - `index.css.scss`
 - `index.html.pug`
 - `index.js.mjs`
 - `index.php.pug`

So that in the distributable folder, your files will be renamed to:

 - `index.css`
 - `index.html`
 - `index.js`
 - `index.php`

Options
-------

Key | Description
--- | -----------
`--clean` | Clean-up the old compiled files before re-compile (default to `true`).
`--from` | Folder path to store the files to be compiled (default to `"src"`).
`--mjs.format` | JavaScript [module format](https://rollupjs.org/guide/en/#quick-start) (default to `"iife"`).
`--mjs.globals` | JavaScript global variables. Example: `--mjs.globals=jquery:jQuery,react:React,vue:Vue`.
`--mjs.name` | JavaScript [module name](https://rollupjs.org/guide/en/#quick-start) (default to `""`).
`--silent` | Disable logging (default to `false`).
`--to` | Folder path to store the compiled files (default to `"dist"`).
`--version` | Show version information.
