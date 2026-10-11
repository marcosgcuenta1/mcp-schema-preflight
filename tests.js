'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const cli = require('./cli.js');
const core = require('./core.js');
const handler = require('./handler-demo.js');
const fixture = name => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
let passed = 0;
function check(name, fn) { fn(); passed++; console.log('PASS ' + name); }
check('manual rename is the only fixture change; handler output and ID order/duplicates are equivalent', () => {
  const before = JSON.parse(fixture('before.json')), after = JSON.parse(fixture('after.json'));
  const expected = JSON.parse(JSON.stringify(before));
  const schema = expected.tools[0].inputSchema;
  schema.properties.ids = schema.properties['ids[]']; delete schema.properties['ids[]']; schema.required = ['ids'];
  assert.deepEqual(after, expected);
  for (const ids of [[7,2,7], [1], [Number.MAX_SAFE_INTEGER], Array.from({length:20}, (_, i) => i+1)]) assert.deepEqual(handler.before({'ids[]':ids}), handler.after({ids}));
  assert.throws(() => handler.after({'ids[]':[1]}));
  assert.throws(() => handler.before({ids:[1]}));
  assert.throws(() => handler.after({ids:[1], 'ids[]':[1]}));
  assert.throws(() => handler.after({ids:['1']}));
});
check('special name is warning, renamed sample removes only that warning; source unchanged', () => {
  const text = fixture('before.json'), a = core.analyzeText(text), b = core.analyzeText(fixture('after.json'));
  assert.equal(a.summary.errors, 0); assert.equal(a.summary.warnings, 1); assert.equal(b.summary.errors, 0); assert.equal(b.summary.warnings, 0);
  assert.deepEqual(a.findings.find(f=>f.rule==='PROPERTY_NAME_REVIEW').property_names, ['ids[]']);
  assert.equal(fixture('before.json'), text); assert.equal(a.input_modified, false); assert.equal(a.compatibility_tested, false);
});
check('object root mandatory; root anyOf/oneOf with object are information, not errors', () => {
  const report = core.analyzeText(fixture('review-cases.json'));
  assert.equal(report.summary.errors, 1); assert.equal(report.summary.warnings, 0);
  assert.equal(report.findings.filter(f=>f.rule==='ROOT_COMPOSITION').length, 2);
  assert(report.findings.filter(f=>f.rule==='ROOT_COMPOSITION').every(f=>f.severity==='info'));
  for (const s of [true, null, {type:['object','null']}, {}, {type:'string'}]) assert.equal(core.analyzeText(JSON.stringify({tools:[{name:'x',inputSchema:s}]})).summary.errors, 1);
});
check('UTF-8 size measurements, BOM and JSON-RPC envelope are supported', () => {
  const schema = {type:'object', description:'漢字 é 🌙'};
  const text = '\ufeff'+JSON.stringify({jsonrpc:'2.0',id:1,result:{tools:[{name:'unicode',inputSchema:schema}]}});
  const r=core.analyzeText(text), compact=JSON.stringify(schema);
  assert.equal(r.summary.errors, 0); assert.equal(r.input.raw_utf8_bytes, Buffer.byteLength(text));
  assert.equal(r.tools[0].schema_size.compact_json_utf8_bytes, Buffer.byteLength(compact));
  assert.equal(r.tools[0].schema_size.compact_json_characters, Array.from(compact).length);
});
check('invalid JSON/shape, 1 MiB byte limit and 200-tool limit fail safely with no partial run', () => {
  for (const text of ['{', 'null', '[]', '{"tools":{}}']) assert.equal(core.analyzeText(text).summary.errors, 1);
  assert.equal(core.analyzeText(' '.repeat(core.MAX_BYTES+1)).findings[0].rule, 'INPUT_LIMIT');
  const tool={name:'x', inputSchema:{type:'object'}};
  assert.equal(core.analyzeText(JSON.stringify({tools:Array(200).fill(tool)})).summary.errors,0);
  const r=core.analyzeText(JSON.stringify({tools:Array(201).fill(tool)})); assert.equal(r.findings[0].rule,'TOOLS_LIMIT'); assert.equal(r.tools.length,0);
});
check('untrusted HTML is escaped in exported report and treated only as names/data', () => {
  const dangerous='</pre><script>globalThis.fakeAttack=1</script><img src=x onerror=alert(1)>';
  const r=core.analyzeText(JSON.stringify({tools:[{name:dangerous,inputSchema:{type:'object',properties:{[dangerous]:{type:'string'}}}}]}));
  const html=core.reportHtml(r); assert(!html.includes('<script>')); assert(!html.includes('<img')); assert(html.includes('&lt;script&gt;')); assert.equal(r.tools[0].name,dangerous);
});
check('CLI writes independently parseable report files, refuses overwriting input and malformed UTF-8', () => {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mcp-preflight-test-'));
  try {
    const json=path.join(folder,'report.json'), html=path.join(folder,'report.html');
    const run=args=>cli.run(args);
    const input=path.join(__dirname,'fixtures','before.json');
    assert.equal(run([input,'--json',json,'--html',html]).exitCode,0);
    assert.equal(JSON.parse(fs.readFileSync(json,'utf8')).summary.warnings,1); assert(fs.readFileSync(html,'utf8').includes('Static MCP preflight report'));
    assert.throws(()=>run([input,'--json',input]),/overwrite/);
    const bad=path.join(folder,'bad.json');fs.writeFileSync(bad,Buffer.from([0xff]));assert.throws(()=>run([bad]));
    assert.equal(run([path.join(__dirname,'fixtures','review-cases.json')]).exitCode,1);
  } finally { for(const file of fs.readdirSync(folder)) fs.unlinkSync(path.join(folder,file));fs.rmdirSync(folder); }
});
console.log(passed + ' meaningful checks passed; no network or MCP clients were used.');
