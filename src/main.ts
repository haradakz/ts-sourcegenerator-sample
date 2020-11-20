import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

import BasicSourceCreater from './builder';

if(process.argv.length < 5){
    console.error("Argument error.");
    process.exit(-1);
}

const input_csv = process.argv[2];
const outputDir = process.argv[3];
const sourceFileName = process.argv[4];

const buf = fs.readFileSync(input_csv, 'utf8');
const lines = buf.replace(/\r\n?/g, '\n').split('\n');
const inputdata = lines.map(v => v.split(','));

const builder = new BasicSourceCreater(inputdata, sourceFileName);
const srcText = builder.execute();

fs.writeFileSync(path.join(outputDir, sourceFileName), srcText, 'utf8');

