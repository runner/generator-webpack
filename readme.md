Tasks generator for Webpack
===========================

[![build status](https://img.shields.io/travis/runner/generator-webpack.svg?style=flat-square)](https://travis-ci.org/runner/generator-webpack)
[![npm version](https://img.shields.io/npm/v/@runner/generator-webpack.svg?style=flat-square)](https://www.npmjs.com/package/@runner/generator-webpack)
[![dependencies status](https://img.shields.io/david/runner/generator-webpack.svg?style=flat-square)](https://david-dm.org/runner/generator-webpack)
[![devDependencies status](https://img.shields.io/david/dev/runner/generator-webpack.svg?style=flat-square)](https://david-dm.org/runner/generator-webpack?type=dev)
[![Gitter](https://img.shields.io/badge/gitter-join%20chat-blue.svg?style=flat-square)](https://gitter.im/DarkPark/runner)
[![RunKit](https://img.shields.io/badge/RunKit-try-yellow.svg?style=flat-square)](https://npm.runkit.com/@runner/generator-webpack)


## Installation ##

```bash
npm install @runner/generator-webpack
```


## Usage ##

Add to the scope:

```js
var generator = require('@runner/generator-webpack');
```

Generate tasks according to the given config:

```js
var tasks = generator({
    mode: 'development',
    entry: 'src/js/main.js',
    output: {
        filename: 'develop.js',
        path: path.resolve('build')
    },
    devtool: 'source-map',
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin()
    ]
});
```

Add generated tasks to the `runner` instance:

```js
var runner = require('@runner/core');

Object.assign(runner.tasks, tasks);
```

The following tasks will become available:

 Task name         | Description
-------------------|-------------
 `webpack:config`  | prints the current configuration used for generated tasks
 `webpack:build`   | performs webpack compilation 
 `webpack:modules` | prints detailed info on files used in the latest compilation
 `webpack:clear`   | removes compiled file (source map as well)
 `webpack:watch`   | starts file changes monitoring and rebuilds when necessary
 `webpack:unwatch` | stops monitoring

Generator accepts two arguments: base configuration and additional options.


### Base configuration ###

It's a Webpack [config](https://webpack.js.org/configuration/) passed to the [compiller instance](https://webpack.js.org/api/node/#compiler-instance).


### Additional options ###

It's an object with the following properties:

 Name   | Description
--------|-------------
 prefix | an affix placed before a task name (default is `webpack:`)  
 suffix | a string added at the end of a task name (empty by default)
 
So it's possible to change generated tasks names: 

```js
Object.assign(runner.tasks,
    generator(config, {
        prefix: 'js:',
        suffix: ':develop'
    })
);
```

It will add the following tasks:

* `js:config:develop` 
* `js:build:develop`  
* `js:modules:develop`
* `js:clear:develop`  
* `js:watch:develop`
* `js:unwatch:develop`
 

## Contribution ##

If you have any problems or suggestions please open an [issue](https://github.com/runner/generator-webpack/issues)
according to the contribution [rules](.github/contributing.md).


## License ##

`@runner/generator-webpack` is released under the [GPL-3.0 License](http://opensource.org/licenses/GPL-3.0).
