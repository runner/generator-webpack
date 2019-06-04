/**
 * @author Stanislav Kalashnik <darkpark.main@gmail.com>
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

const
    name    = 'webpack',
    tools   = require('runner-tools'),
    log     = require('runner-logger').wrap(name),
    configs = new Map();


function resolveConfig ( configProducer, webpack ) {
    if ( !configs.has(configProducer) ) {
        configs.set(configProducer, configProducer(webpack));
    }

    return configs.get(configProducer);
}


function applyHooksToCompiler ( hooks, compiler ) {
    Object.keys(hooks).forEach(function ( hookName ) {
        const hook = hooks[hookName];

        hook.callbacks.forEach(function ( callback ) {
            compiler.hooks[hookName].tap(hook.class, callback);
        });
    });
}


function report ( config, instance, error, stats ) {
    const
        path = require('path'),
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


function watch ( configProducer, instance, done ) {
    const
        webpack = require('webpack'),
        config  = resolveConfig(configProducer, webpack),
        hooks   = config.hooks;

    delete config.hooks;

    // reuse existing instance if possible
    instance.compiler = instance.compiler || webpack(config);

    if ( instance.compiler.running ) {
        // if build function is still running
        log.fail('You ran Webpack twice. Each instance only supports a single concurrent compilation at a time.');
        done();
    } else {
        if ( hooks ) {
            applyHooksToCompiler(hooks, instance.compiler);
        }

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


function build ( configProducer, instance, done ) {
    const
        webpack = require('webpack'),
        config  = resolveConfig(configProducer, webpack),
        hooks   = config.hooks;

    delete config.hooks;

    // reuse existing instance if possible
    instance.compiler = instance.compiler || webpack(config);

    if ( hooks ) {
        applyHooksToCompiler(hooks, instance.compiler);
    }

    if ( instance.watcher ) {
        // if watch function is still running
        instance.buildInWatch = true;
        instance.watcher.close(function () {
            watch(configProducer, instance, done);
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


function clear ( configProducer, done ) {
    const
        path   = require('path'),
        config = resolveConfig(configProducer, require('webpack')),
        files  = [path.relative('.', path.join(config.output.path, config.output.filename))];

    // add map file
    if ( config.output.sourceMapFilename ) {
        files.push(path.relative('.', path.join(config.output.path, config.output.sourceMapFilename)));
    }

    tools.unlink(files, log, done);
}


function modules ( instance ) {
    if ( instance.stats ) {
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


function generator ( configProducer, options = {} ) {
    const
        tasks = {},
        {prefix = name + ':', suffix = ''} = options;

    let instance = {};

    tasks[prefix + 'config' + suffix] = function () {
        log.inspect(resolveConfig(configProducer, require('webpack')));
    };

    tasks[prefix + 'build' + suffix] = function ( done ) {
        instance = build(configProducer, instance, done);
    };

    tasks[prefix + 'modules' + suffix] = function () {
        modules(instance);
    };

    tasks[prefix + 'clear' + suffix] = function ( done ) {
        clear(configProducer, done);
    };

    tasks[prefix + 'watch' + suffix] = function ( done ) {
        instance = watch(configProducer, instance, done);
    };

    tasks[prefix + 'unwatch' + suffix] = function () {
        instance = unwatch(instance);
    };

    return tasks;
}


// export main actions
generator.methods = {
    build: build
};


// public
module.exports = generator;
