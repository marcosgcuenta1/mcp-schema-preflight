'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('./core.js');
const dir = __dirname;
const samples = {};
for (const [key,name] of [['before','before.json'],['after','after.json'],['review','review-cases.json']]) samples[key] = JSON.parse(fs.readFileSync(path.join(dir,'fixtures',name),'utf8'));
const html=fs.readFileSync(path.join(dir,'demo-template.html'),'utf8').replace('/* CORE_MARKER */',fs.readFileSync(path.join(dir,'core.js'),'utf8')).replace('/* SAMPLES_MARKER */',JSON.stringify(samples).replace(/</g,'\\u003c'));
fs.writeFileSync(path.join(dir,'index.html'),html);
fs.mkdirSync(path.join(dir,'reports'),{recursive:true});
for(const name of ['before','after']) {
  const report=core.analyzeText(JSON.stringify(samples[name],null,2));
  fs.writeFileSync(path.join(dir,'reports',name+'-report.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(dir,'reports',name+'-report.html'),core.reportHtml(report));
}
const trace={sample:'Artificial, original fixture; manually reviewed rename, not an automatically applied repair',built_at_utc:new Date().toISOString(),fixture_hashes:{},handler_sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'handler-demo.js'))).digest('hex'),patch_record:'fixtures/manual-patch.json',before_report:'reports/before-report.json',after_report:'reports/after-report.json',client_compatibility_tested:false};
for(const name of ['before','after'])trace.fixture_hashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,'fixtures',name+'.json'))).digest('hex');
fs.writeFileSync(path.join(dir,'reports','sample-trace.json'),JSON.stringify(trace,null,2)+'\n');
console.log('Built standalone index.html, before/after HTML+JSON reports and SHA-256 sample trace. No network used.');
