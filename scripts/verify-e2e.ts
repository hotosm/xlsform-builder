import { writeFileSync } from 'fs';

import { exportToXlsx } from '../src/utils/export';
import { fieldSurvey as doc } from './fixtures/field-survey';

const args = process.argv.slice(2);
const saveOnly = args.includes('--save-only');
const save = saveOnly || args.includes('--save');
const PYXFORM_URL = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:8086/api/v1/convert';

async function main() {
  console.log('1. Constructing XLSFormDocument...');
  console.log(`   survey nodes: ${doc.survey.length}`);
  console.log(`   choice lists: ${doc.choices.length}`);
  console.log(`   languages:    ${doc.languages.join(', ')}`);

  console.log('2. Exporting to .xlsx via exportToXlsx()...');
  const xlsxBytes = exportToXlsx(doc);
  console.log(`   output size:  ${xlsxBytes.byteLength} bytes`);

  if (save) {
    const filename = `${doc.settings.formId}.xlsx`;
    writeFileSync(filename, xlsxBytes);
    console.log(`   wrote ${filename}`);
  }

  if (saveOnly) {
    console.log('Done (--save-only).');
    return;
  }

  console.log(`3. POSTing to pyxform-http at ${PYXFORM_URL}...`);
  const resp = await fetch(PYXFORM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'X-XlsForm-FormId-Fallback': doc.settings.formId,
    },
    body: xlsxBytes,
  });

  const body = await resp.json();

  if (resp.status !== 200) {
    console.error(`   HTTP ${resp.status}`);
    console.error(JSON.stringify(body, null, 2));
    process.exit(1);
  }

  if (body.error) {
    console.error('   pyxform returned an error:');
    console.error(
      typeof body.error === 'string' ? body.error : JSON.stringify(body.error, null, 2),
    );
    process.exit(1);
  }

  const xml: string = body.result;
  console.log(`   response OK — XForm XML received (${xml.length} chars)`);

  console.log('4. Validating XForm output...');
  const checks = [
    ['XML declaration', xml.startsWith('<?xml')],
    ['<h:html> root', xml.includes('<h:html')],
    ['form title', xml.includes('Field Survey')],
    ['form id', xml.includes('field_survey_v1')],
    ['text field (respondent_name)', xml.includes('respondent_name')],
    ['integer field (age)', xml.includes('age')],
    ['group (location_info)', xml.includes('location_info')],
    ['geopoint (gps)', xml.includes('gps')],
    ['select_one (region)', xml.includes('region')],
    ['select_multiple (services_needed)', xml.includes('services_needed')],
    ['choice (north)', xml.includes('north')],
    ['choice (water)', xml.includes('water')],
    ['constraint', xml.includes('. &gt; 0 and . &lt; 150') || xml.includes('. > 0 and . < 150')],
    ['English translation', xml.includes('English (en)')],
    ['Spanish translation', xml.includes('Spanish (es)')],
  ] as const;

  let passed = 0;
  for (const [label, ok] of checks) {
    const status = ok ? 'PASS' : 'FAIL';
    console.log(`   [${status}] ${label}`);
    if (ok) passed++;
  }

  console.log(`${passed}/${checks.length} checks passed.`);
  if (passed < checks.length) {
    process.exit(1);
  }
  console.log('E2E verification complete. All checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
