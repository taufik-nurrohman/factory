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

~~~
$ npm install @taufik-nurrohman/factory --global
~~~

Generate the production ready files this way:

~~~
$ cd my-project
$ pack --from=src --to=dist
~~~

File extension from the source folder will be removed. Make sure to name your files with two file extension like so:

 - `index.css.scss`
 - `index.html.pug`
 - `index.js.mjs`
 - `index.php.pug`
 - etc.

So that in the destination folder, your files will be renamed to:

 - `index.css`
 - `index.html`
 - `index.js`
 - `index.php`

TODO
