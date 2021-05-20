#!/usr/bin/env node

import { ArgumentParser } from 'argparse';
import { buildConfig } from './index';

const parser = new ArgumentParser({
    version: '2.0.0',
    addHelp: true,
    description: 'Builds a module (default: ./config.js) from a single json configuration file (default: ./config.json) ' +
    'by selecting object nodes whose properties names match the current NODE_ENV ("prod" mapped to "production", "dev" ' +
    'mapped to "development"). For more info visit https://github.com/smnh/buildconfig'
});

parser.addArgument(['-i', '--input'], {
    defaultValue: './config.json',
    help: 'The file path of the input json relative to the current working directory, default: ./config.json'
});

parser.addArgument(['-o', '--output'], {
    defaultValue: './config.js',
    help: 'The file path of the output module relative to the current working directory, default: ./config.js'
});

parser.addArgument(['--type-only-output'], {
    help: 'The file path of the type definitions output module relative to the current working directory, only available when module type is set to "typescript".'
});

parser.addArgument(['-e', '--env'], {
    help: 'Environment value (for dev or prod specify "development" or "production"), if specified overrides NODE_ENV'
});

parser.addArgument(['--add-selectors'], {
    help: 'Comma-separated selectors that will be added to the default set of selectors, ignored if --use-selectors is specified'
});

parser.addArgument(['--use-selectors'], {
    help: 'Comma-separated selectors that will be used instead the default set of selectors, the default selector will not be overridden'
});

parser.addArgument(['--module-type'], {
    choices: ['node', 'globals', 'typescript'],
    defaultValue: 'node',
    help: 'JavaScript module type that will be used for the output file, default is "node" which is CommonJS-like environments that support module.exports. "typescript" generates a typed TypeScript file.'
});

parser.addArgument(['--global-module-name'], {
    defaultValue: 'config',
    help: 'The name of the global variable that will be used if module-type is globals.'
});

const args = parser.parseArgs();
const inputFilename = args.input;
const outputFilename = args.output;
const options = {
    env: args.env,
    addSelectors: args.add_selectors?.split(','),
    useSelectors: args.use_selectors?.split(','),
    moduleType: args.module_type,
    globalModuleName: args.global_module_name,
    typeOnlyOutput: args.type_only_output
};

(async () => {
    await buildConfig(inputFilename, outputFilename, options);
});
