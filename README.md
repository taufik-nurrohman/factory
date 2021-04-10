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

Paste your `*.scss`, `*.mjs`, and `*.pug` files to `.\my-project\src` folder.

~~~ sh
$ cd my-project
$ npm install @taufik-nurrohman/factory --save-dev
~~~

Create a `scripts` field that runs the `pack` command in `.\my-project\package.json`

~~~ json
{
  "scripts": {
    "build": "pack --from=src --to=dist"
  }
}
~~~

Generate the production ready files this way:

~~~ sh
$ npm run build
~~~

File extension from the source folder will be removed. Make sure to name your files with two file extension like so:

 - `index.css.scss`
 - `index.html.pug`
 - `index.js.mjs`
 - `index.php.pug`
 - `LICENSE.txt`
 - `LICENSE.txt.txt`

So that in the distributable folder, your files will be renamed to:

 - `index.css`
 - `index.html`
 - `index.js`
 - `index.php`
 - `LICENSE`
 - `LICENSE.txt`

Options
-------

Key | Description
--- | -----------
`--clean` | Clean-up the old compiled files before re-compile (default to `true`).
`--from` | Folder path to store the files to be compiled (default to `"src"`).
`--js-bottom` | Insert string at the bottom of the file (default to `""`).
`--js-exports` | What [export mode](https://rollupjs.org/guide/en/#outputexports) to use? (default to `"auto"`).
`--js-external` | JavaScript [external module names](https://rollupjs.org/guide/en/#quick-start) (default to `""`).
`--js-format` | JavaScript [module format](https://rollupjs.org/guide/en/#quick-start) (default to `"iife"`).
`--js-globals` | JavaScript global variables (default to `""`). Example: `--js-globals="jquery:jQuery,react:React,vue:Vue"`.
`--js-name` | JavaScript [module name](https://rollupjs.org/guide/en/#quick-start) (default to `""`).
`--js-top` | Insert string at the top of the file (default to `""`).
`--silent` | Disable logging (default to `false`).
`--to` | Folder path to store the compiled files (default to `"dist"`).
`--version` | Show version information.
