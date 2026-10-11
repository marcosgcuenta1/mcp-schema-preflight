(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.McpPreflight = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const MAX_BYTES = 1024 * 1024, MAX_TOOLS = 200;
  const SPEC = 'https://modelcontextprotocol.io/specification/2026-07-28/schema#tool-inputschema';
  const rules = [
    {id: 'ROOT_OBJECT', kind: 'normative', reference: SPEC, explanation: 'MCP requires inputSchema to be an object with root type exactly object.'},
    {id: 'ROOT_COMPOSITION', kind: 'optional review', reference: SPEC, explanation: 'Root anyOf/oneOf are permitted alongside type: object. Presence alone is not an error or evidence of a client failure.'},
    {id: 'PROPERTY_NAME_REVIEW', kind: 'conservative heuristic', reference: SPEC, explanation: 'Special characters in root property names prompt client/handler review; this is not a universal MCP prohibition.'},
    {id: 'SCHEMA_SIZE', kind: 'measurement', reference: SPEC, explanation: 'Compact JSON character and UTF-8 byte counts only. No tokens, client size limit or compatibility inference.'}
  ];
  const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const bytes = s => new TextEncoder().encode(s).length;
  const characters = s => Array.from(s).length;
  function analyzeText(text) {
    const report = {product: 'MCP Schema Preflight — static sample', scope: 'Limited static checks; not an MCP client, connectivity test, complete schema validator or compatibility certificate.', protocol_reference: '2026-07-28', limits: {input_bytes: MAX_BYTES, tools: MAX_TOOLS}, rules, input: {}, tools: [], findings: [], summary: {errors: 0, warnings: 0, information: 0}};
    function add(severity, rule, message, details = {}) {
      const finding = {severity, rule, message, ...details};
      report.findings.push(finding);
      report.summary[severity === 'error' ? 'errors' : severity === 'warning' ? 'warnings' : 'information']++;
      return finding;
    }
    if (typeof text !== 'string') { add('error', 'INPUT', 'Input must be UTF-8 JSON text.'); return report; }
    report.input.raw_utf8_bytes = bytes(text);
    report.input.raw_characters = characters(text);
    if (report.input.raw_utf8_bytes > MAX_BYTES) { add('error', 'INPUT_LIMIT', 'Input exceeds the 1 MiB UTF-8 limit.'); return report; }
    let value;
    try { value = JSON.parse(text.replace(/^\uFEFF/, '')); }
    catch { add('error', 'INPUT_JSON', 'Invalid JSON. No data has been changed.'); return report; }
    let result = value;
    if (isObject(value) && Object.prototype.hasOwnProperty.call(value, 'result')) result = value.result;
    if (!isObject(result) || !Array.isArray(result.tools)) { add('error', 'INPUT_SHAPE', 'Expected a tools/list result {tools:[...]} or JSON-RPC envelope {result:{tools:[...]}}.'); return report; }
    report.input.tool_count = result.tools.length;
    report.input.has_next_cursor = Object.prototype.hasOwnProperty.call(result, 'nextCursor');
    if (result.tools.length > MAX_TOOLS) { add('error', 'TOOLS_LIMIT', 'Input exceeds 200 tools; no partial analysis was performed.'); return report; }
    if (report.input.has_next_cursor) add('info', 'PAGINATION', 'A nextCursor is present. This report covers only the supplied page, not the complete server.');
    for (let index = 0; index < result.tools.length; index++) {
      const tool = result.tools[index];
      const entry = {index, name: isObject(tool) && typeof tool.name === 'string' ? tool.name : '(unnamed)', findings: []};
      report.tools.push(entry);
      const emit = (severity, rule, message, details = {}) => entry.findings.push(add(severity, rule, message, {tool_index: index, tool_name: entry.name, ...details}));
      if (!isObject(tool)) { emit('error', 'INPUT_TOOL', 'Tool entry is not an object.'); continue; }
      const schema = tool.inputSchema;
      if (!isObject(schema) || schema.type !== 'object') emit('error', 'ROOT_OBJECT', 'inputSchema must be a JSON object with root type: object.');
      if (isObject(schema)) {
        for (const keyword of ['anyOf', 'oneOf']) {
          if (Object.prototype.hasOwnProperty.call(schema, keyword)) emit('info', 'ROOT_COMPOSITION', `Root ${keyword} is present. Review only if a concrete target client needs it; do not move or remove it automatically.`, {keyword});
        }
        if (isObject(schema.properties)) {
          const names = Object.keys(schema.properties).filter(name => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
          if (names.length) emit('warning', 'PROPERTY_NAME_REVIEW', 'Root property names fall outside a conservative identifier pattern. They are not universally invalid; verify the target client and matching handler before any rename.', {property_names: names});
        }
      }
      if (schema !== undefined) {
        try {
          const compact = JSON.stringify(schema);
          entry.schema_size = {compact_json_characters: characters(compact), compact_json_utf8_bytes: bytes(compact)};
          emit('info', 'SCHEMA_SIZE', 'Size of this compact JSON inputSchema; not tokens or a client limit.', {measurement: entry.schema_size});
        } catch { emit('error', 'INPUT_DEPTH', 'Schema is too deeply nested to measure safely in this sample.'); }
      }
    }
    report.analysis_complete = !report.findings.some(f => ['INPUT', 'INPUT_LIMIT', 'INPUT_JSON', 'INPUT_SHAPE', 'TOOLS_LIMIT', 'INPUT_TOOL', 'INPUT_DEPTH'].includes(f.rule));
    report.compatibility_tested = false;
    report.input_modified = false;
    return report;
  }
  const escapeHtml = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function reportHtml(report) {
    return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>Static MCP preflight report</title><style>body{font:16px system-ui;margin:40px auto;padding:0 20px;max-width:1000px;background:#101727;color:#eef3ff}h1{color:#85dfcf}li{margin:15px 0;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#18243c;padding:20px}a{color:#85dfcf}</style><h1>Static MCP preflight report</h1><p>' + escapeHtml(report.scope) + '</p><p>' + escapeHtml(JSON.stringify(report.summary)) + '</p><p>Original input is unchanged. Composition is optional review; unusual names are heuristic warnings.</p><ul>' + report.findings.map(f => '<li><strong>' + escapeHtml(f.severity + ' · ' + f.rule) + '</strong> ' + escapeHtml(f.tool_name || '') + ': ' + escapeHtml(f.message) + (f.property_names ? '<br>Names: ' + escapeHtml(f.property_names.join(', ')) : '') + '</li>').join('') + '</ul><h2>Rule references</h2><p><a href="' + SPEC + '">MCP 2026-07-28 Tool inputSchema</a></p><h2>Machine-readable report</h2><pre>' + escapeHtml(JSON.stringify(report, null, 2)) + '</pre></html>';
  }
  return {MAX_BYTES, MAX_TOOLS, SPEC, rules, analyzeText, reportHtml};
}));
