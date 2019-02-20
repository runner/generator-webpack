/**
 * @author Stanislav Kalashnik <darkpark.main@gmail.com>
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

var name  = 'webpack',
    tools = require('runner-tools'),
    log   = require('runner-logger').wrap(name);


function report ( config, instance, error, stats ) {
    var path = require('path'),
        dir  = path.relative('.', config.output.path);

    if ( error ) {
        log.fail(error.toString());
    } else {
        instance.stats = stats.toJson({source: false});

        log.info('time: %s ms', log.colors.magenta(instance.stats.time));
        log.info('hash: ' + log.colors.grey(instance.stats.hash));

        instance.stats.assets.forEach(function ( asset ) {
            log.info(
                'write %s (size: %s)',
                log.colors.bold(path.join(dir, asset.name)),
                log.colors.green(asset.size)
            );
        });

        instance.stats.errors.forEach(function ( error ) {
            error = error.split('\n');
            log.fail('%s %s', log.colors.bold(error.shift()), error.shift());
            console.log(log.colors.red(error.join('\n')));
        });

        instance.stats.warnings.forEach(function ( warning ) {
            warning = warning.split('\n');
            log.warn('%s %s', log.colors.bold(warning.shift()), warning.shift());
            console.log(log.colors.yellow(warning.join('\n')));
        });
    }
}


function watch ( config, instance, done ) {
    var webpack = require('webpack');

    // reuse existing instance if possible
    instance.compiler = instance.compiler || webpack(config);

    if ( instance.compiler.running ) {
        // if build function is still running
        log.fail('You ran Webpack twice. Each instance only supports a single concurrent compilation at a time.');
        done();
    } else {
        instance.watcher = instance.compiler.watch(config.watchOptions, function ( error, stats ) {
            report(config, instance, error, stats);
            if ( instance.buildInWatch ) {
                // if the watch function is called by the build function
                instance.buildInWatch = false;
                done();
            }
        });

        if ( !instance.buildInWatch ) {
            instance.watcherDone = done;
        }
    }

    return instance;
}


function build ( config, instance, done ) {
    var webpack = require('webpack'),
        hooks   = config.hooks;

    delete config.hooks;

    // reuse existing instance if possible
    instance.compiler = instance.compiler || webpack(config);

    if ( hooks ) {
        Object.keys(hooks).forEach(function ( hookName ) {
            var hook = hooks[hookName];

            hook.callbacks.forEach(function ( callback ) {
                instance.compiler.hooks[hookName].tap(hook.class, callback);
            });
        });
    }

    if ( instance.watcher ) {
        // if watch function is still running
        instance.buildInWatch = true;
        instance.watcher.close(function () {
            watch(config, instance, done);
        });
    } else {
        instance.compiler.run(function ( error, stats ) {
            report(config, instance, error, stats);

            done();
        });
    }

    return instance;
}


function unwatch ( instance ) {
    if ( instance.watcher ) {
        instance.watcher.close(function () {
            instance.watcher = null;
            instance.buildInWatch = false;
            instance.watcherDone();
        });
    }

    return instance;
}


function clear ( config, done ) {
    var path  = require('path'),
        files = [path.relative('.', path.join(config.output.path, config.output.filename))];

    // add map file
    if ( config.output.sourceMapFilename ) {
        files.push(path.relative('.', path.join(config.output.path, config.output.sourceMapFilename)));
    }

    tools.unlink(files, log, done);
}


function modules ( instance ) {
    if ( instance ) {
        instance.stats.modules.forEach(function ( statModule ) {
            log.info(log.colors.bold(statModule.name));
            if ( statModule.reasons.length ) {
                statModule.reasons.forEach(function ( reason ) {
                    log.info(
                        '    %s %s from %s',
                        log.colors.grey(reason.type),
                        log.colors.green(reason.userRequest),
                        reason.module ? log.colors.green(reason.module) : log.colors.grey('n/a')
                    );
                });
            } else {
                log.info(log.colors.grey('    (root)'));
            }
        });
    }
}


function generator ( config, options ) {
    var tasks    = {},
        instance = {};

    // sanitize and extend defaults
    config = config || {};
    generator.config = config;
    options = Object.assign({}, generator.options, options || {});

    tasks[options.prefix + 'config' + options.suffix] = function () {
        log.inspect(config);
    };

    tasks[options.prefix + 'build' + options.suffix] = function ( done ) {
        instance = build(config, instance, done);
    };

    tasks[options.prefix + 'modules' + options.suffix] = function () {
        modules(instance);
    };

    tasks[options.prefix + 'clear' + options.suffix] = function ( done ) {
        clear(config, done);
    };

    tasks[options.prefix + 'watch' + options.suffix] = function ( done ) {
        instance = watch(config, instance, done);
    };

    tasks[options.prefix + 'unwatch' + options.suffix] = function () {
        instance = unwatch(instance);
    };

    return tasks;
}


// defaults
generator.options = {
    prefix: name + ':',
    suffix: ''
};


// export main actions
generator.methods = {
    build: build
};


// public
module.exports = generator;
