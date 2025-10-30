#!/usr/bin/env node

const fs = require('fs');
const { convert_markdown_to_yaml } = require('./converter.js');

const input_file = process.argv[2];

if (!fs.existsSync(input_file)) {
    console.error(`Error: File '${input_file}' not found`);
    process.exit(1);
}

const markdown = fs.readFileSync(input_file, 'utf8');
const yaml = convert_markdown_to_yaml(markdown);

console.log(yaml);
