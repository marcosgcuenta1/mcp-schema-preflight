'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {analyzeText, reportHtml, MAX_BYTES} = require('./core.js');
function run(args) {
  if (!args.length || args.includes('--help')) {
    return {exitCode: 0, output:'Usage: node cli.js input.json [--json report.json] [--html report.html]\nStatic checks only; input is never modified. Exit: 0 no detected errors, 1 findings include errors, 2 CLI/input failure.'};
  }
  const input = path.resolve(args[0]);
  const outputs = {};
  for (let i = 1; i < args.length; i += 2) {
    if (!['--json', '--html'].includes(args[i]) || !args[i+1] || Object.hasOwn(outputs, args[i])) throw new Error('Use each --json/--html once, followed by a filename.');
    const output = path.resolve(args[i+1]);
    if (output === input || (fs.existsSync(output) && fs.realpathSync(output) === fs.realpathSync(input))) throw new Error('Output must not overwrite the input.');
    outputs[args[i]] = output;
  }
  if (outputs['--json'] && outputs['--json'] === outputs['--html']) throw new Error('JSON and HTML outputs must be different files.');
  if (fs.statSync(input).size > MAX_BYTES) throw new Error('Input exceeds the 1 MiB limit.');
  const buffer = fs.readFileSync(input);
  if (buffer.length > MAX_BYTES) throw new Error('Input exceeds the 1 MiB limit.');
  const text = new TextDecoder('utf-8', {fatal: true}).decode(buffer);
  const report = analyzeText(text);
  if (outputs['--json']) fs.writeFileSync(outputs['--json'], JSON.stringify(report, null, 2) + '\n');
  if (outputs['--html']) fs.writeFileSync(outputs['--html'], reportHtml(report));
  return {report, exitCode: report.summary.errors ? 1 : 0, output: !Object.keys(outputs).length ? JSON.stringify(report,null,2) : JSON.stringify({summary:report.summary,input_modified:false,compatibility_tested:false,outputs})};
}
exports.run = run;
if (require.main === module) {
  try {const result=run(process.argv.slice(2));console.log(result.output);process.exitCode=result.exitCode;}
  catch (error) {console.error('Preflight stopped: '+error.message);process.exitCode=2;}
}
