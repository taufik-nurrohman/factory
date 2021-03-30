Factory
=======

My personal Node.js build tool.

Usage
-----

~~~ sh
$ mkdir my-project
$ mkdir my-project/src
$ mkdir my-project/dist
~~~

Paste your `*.scss`, `*.mjs`, and `*.pug` files to `./my-project/src` folder.

~~~ sh
$ npm install @taufik-nurrohman/factory --global
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
`--clean` | Clean-up the old compiled files before re-compile (default to `false`).
`--from` | Folder path to store the files to be compiled (default to `"src"`).
`--silent` | Disable logging (default to `false`).
`--to` | Folder path to store the compiled files (default to `"dist"`).
`--version` | Show version information.
