import fs from 'node:fs/promises';

const schemaPaths = [
  'protocol/ultimatebridge-request-v1.schema.json',
  'protocol/ultimatebridge-report-v1.schema.json',
  'protocol/ultimatebridge-attachment-manifest-v1.schema.json'
];

for (const schemaPath of schemaPaths) {
  const text = await fs.readFile(schemaPath, 'utf8');
  JSON.parse(text);
  console.log(`schema ok: ${schemaPath}`);
}
