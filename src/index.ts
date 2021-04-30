import path from 'path';
import { promises as fs } from 'fs';
import {
    logErrorAndThrow,
    ensureDirectoryExistence,
    fileExists,
} from './utils';
import { ConfigMapper, ConfigMapperOptions } from './config-mapper';
import { generateTypeScriptModule } from './type-generation';

export { ConfigMapper } from './config-mapper';

export let config: Record<string, any> | null = null;

export function mapConfig(
    configObj: Record<string, any>,
    options: ConfigMapperOptions
) {
    const configMapper = new ConfigMapper(options);
    return configMapper.mapConfig(configObj);
}

export interface BuildConfigOptions
    extends Omit<ConfigMapperOptions, 'useSelectors' | 'addSelectors'> {
    useSelectors?: string[];
    addSelectors?: string[];
    moduleType?: 'globals' | 'node' | 'typescript';
    globalModuleName?: string;
    typeOnlyOutput?: string;
    loadDynamicConfig?(
        baseConfig: Record<string, any>
    ): Promise<Record<string, any>>;
    excludeDynamicConfigFromFile?: boolean;
}

export async function buildConfig(
    inputFilename: string,
    outputFilename: string,
    options: BuildConfigOptions
): Promise<void> {
    const inputFilePath = path.resolve(inputFilename);
    const outputFilePath = path.resolve(outputFilename);
    const configMapperOptions: ConfigMapperOptions = {};

    if (!(await fileExists(inputFilePath))) {
        logErrorAndThrow(`error building config, ${inputFilePath} not found`);
    }

    options = options ?? {};

    configMapperOptions.env =
        options.env || process.env.NODE_ENV || 'development';

    if (options.useSelectors) {
        configMapperOptions.useSelectors = options.useSelectors;
    } else if (options.addSelectors) {
        configMapperOptions.addSelectors = options.addSelectors;
    }

    const configObj = require(inputFilePath);

    console.info(
        `building configuration, env=${configMapperOptions.env}, input=${inputFilePath}, output=${outputFilePath}`
    );

    const baseConfig = mapConfig(configObj, configMapperOptions);
    const extendedConfig =
        await (options.loadDynamicConfig?.(baseConfig) ?? baseConfig);
    const configToBeWritten =
        options.excludeDynamicConfigFromFile
        ? baseConfig
        : extendedConfig;

    const header = `// This file was automatically generated at ${new Date().toISOString()}`;
    let moduleType = options.moduleType ?? 'node';
    let moduleDefinition = `${header}
module.exports = ${JSON.stringify(configToBeWritten, null, 4)};
`;

    await ensureDirectoryExistence(outputFilePath);

    if (moduleType === 'globals') {
        const globalVarName = options.globalModuleName || 'config';
        moduleDefinition = `${header}
${globalVarName} = ${JSON.stringify(configToBeWritten, null, 4)};
`;
    } else if (moduleType === 'typescript') {
        moduleDefinition = `${header}
${generateTypeScriptModule(baseConfig, extendedConfig, options.excludeDynamicConfigFromFile ?? false, false)};
`;
        if (options.typeOnlyOutput) {
            await fs.writeFile(options.typeOnlyOutput, `// This file was automatically generated together with ${outputFilePath}
${generateTypeScriptModule(baseConfig, extendedConfig, options.excludeDynamicConfigFromFile ?? false, true)};
`);
        }
    }

    await fs.writeFile(outputFilePath, moduleDefinition);

    if (moduleType === 'node') {
        config = require(outputFilePath);
    }
}