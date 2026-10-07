import fs from 'fs';
import path from 'path';
import { parse } from 'yaml';

// Funciona tanto a partir de src/docs (ts-node/vitest) quanto de dist/docs (build): o arquivo fica em backend/openapi.yaml.
export const OPENAPI_PATH = path.resolve(__dirname, '../../openapi.yaml');

export const openApiSpec = parse(fs.readFileSync(OPENAPI_PATH, 'utf8')) as Record<string, any>;
