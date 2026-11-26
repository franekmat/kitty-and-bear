/**
 * Kitty & Bear ♡ — Live Two-Way Google Sheets Sync Bridge
 *
 * Setup (takes ~2 minutes):
 * 1. Open your "Kitty and bear" Google Sheet.
 * 2. Click Extensions → Apps Script.
 * 3. Paste this entire file into Code.gs and save.
 * 4. (Optional) Change PASSCODE below to any secret word you & Kitty want.
 * 5. Click Deploy → New deployment → Web app:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and paste it in the "Sync" modal of your Kitty & Bear web app!
 */

const PASSCODE = ''; // Optional shared secret; leave empty to allow without passcode
const GEMINI_API_KEY = ''; // Optional: paste your Google AI Studio key here so BOTH phones get instant ✨ AI auto-fill!

function doGet(e) {
  return handleRequest_(e, 'GET');
}

function doPost(e) {
  return handleRequest_(e, 'POST');
}

function handleRequest_(e, method) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    let body = {};
    if (method === 'POST' && e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const token = body.passcode || params.passcode || '';
    if (PASSCODE && token !== PASSCODE) {
      return jsonOut_({ ok: false, error: 'Invalid passcode' });
    }

    const action = body.action || params.action || 'readAll';
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'readAll') {
      return jsonOut_({
        ok: true,
        updatedAt: new Date().toISOString(),
        restaurants: readRestaurants_(ss),
        dates: readDates_(ss),
        winter: readWinter_(ss),
        home: readHome_(ss),
      });
    }

    if (action === 'addItem') {
      return jsonOut_(addItem_(ss, body.section, body.item));
    }

    if (action === 'updateItem') {
      return jsonOut_(updateItem_(ss, body.section, body.row, body.item));
    }

    if (action === 'deleteItem') {
      return jsonOut_(deleteItem_(ss, body.section, body.row));
    }

    if (action === 'updateStatus') {
      return jsonOut_(updateStatus_(ss, body.section, body.row, body.status));
    }

    if (action === 'updateRating') {
      return jsonOut_(updateRomance_(ss, body.section, body.row, body.romance));
    }

    if (action === 'aiFill') {
      return jsonOut_(aiFillWithGemini_(body.prompt));
    }

    return jsonOut_({ ok: false, error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function extractLink_(richText, displayVal) {
  const label = String(displayVal || '').trim();
  if (richText) {
    const direct = richText.getLinkUrl();
    if (direct) return { label: label || direct, url: direct };
    const runs = richText.getRuns();
    for (let i = 0; i < runs.length; i++) {
      const u = runs[i].getLinkUrl();
      if (u) return { label: label || u, url: u };
    }
  }
  if (/^https?:\/\//i.test(label)) return { label: label, url: label };
  return { label: '', url: '' };
}

function parseNum_(v) {
  if (typeof v === 'number') return v;
  const cleaned = String(v || '').replace(/,/g, '');
  const m = cleaned.match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function parseMins_(travel) {
  const s = String(travel || '');
  const h = s.match(/(\d+)h\s*(\d+)?m?/);
  if (h) return Number(h[1]) * 60 + (h[2] ? Number(h[2]) : 0);
  const m = s.match(/(\d+)\s*(?:–\d+)?\s*min/);
  return m ? Number(m[1]) : 999;
}

function parseTier_(travel) {
  const s = String(travel || '').trim();
  if (s.startsWith('★')) return 'tier1';
  if (s.startsWith('◆')) return 'tier2';
  if (s.startsWith('●')) return 'tier3';
  if (s.startsWith('○')) return 'tier4';
  return 'tier1';
}

function readRestaurants_(ss) {
  const sh = ss.getSheetByName('Restaurants');
  if (!sh) return [];
  const last = Math.min(Math.max(sh.getLastRow(), 6), 205);
  const vals = sh.getRange(6, 1, last - 5, 13).getValues();
  const rich = sh.getRange(6, 11, last - 5, 1).getRichTextValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!String(r[0] || '').trim()) continue;
    const link = extractLink_(rich[i][0], r[10]);
    out.push({
      id: 'rest-' + (i + 6),
      row: i + 6,
      name: String(r[0] || '').trim(),
      cuisine: String(r[1] || '').trim(),
      area: String(r[2] || '').trim(),
      travel: String(r[3] || '').trim(),
      travelMins: parseMins_(r[3]),
      travelTier: parseTier_(r[3]),
      romance: parseNum_(r[4]) || 0,
      budget: parseNum_(r[5]),
      occasion: String(r[6] || '').trim(),
      booking: String(r[7] || '').trim(),
      mustTry: String(r[8] || '').trim(),
      status: String(r[9] || '').trim() || 'Idea',
      linkLabel: link.label,
      linkUrl: link.url,
      notes: String(r[11] || '').trim(),
      rating: parseNum_(r[12]),
    });
  }
  return out;
}

function readDates_(ss) {
  const sh = ss.getSheetByName('Date ideas');
  if (!sh) return [];
  const last = Math.min(Math.max(sh.getLastRow(), 6), 205);
  const vals = sh.getRange(6, 1, last - 5, 13).getValues();
  const rich = sh.getRange(6, 11, last - 5, 1).getRichTextValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!String(r[0] || '').trim()) continue;
    const link = extractLink_(rich[i][0], r[10]);
    out.push({
      id: 'date-' + (i + 6),
      row: i + 6,
      name: String(r[0] || '').trim(),
      kind: String(r[1] || '').trim(),
      area: String(r[2] || '').trim(),
      travel: String(r[3] || '').trim(),
      travelMins: parseMins_(r[3]),
      travelTier: parseTier_(r[3]),
      romance: parseNum_(r[4]) || 0,
      budget: parseNum_(r[5]),
      timeNeeded: String(r[6] || '').trim(),
      setting: String(r[7] || '').trim(),
      bestMoment: String(r[8] || '').trim(),
      status: String(r[9] || '').trim() || 'Idea',
      linkLabel: link.label,
      linkUrl: link.url,
      notes: String(r[11] || '').trim(),
      rating: parseNum_(r[12]),
    });
  }
  return out;
}

function readWinter_(ss) {
  const sh = ss.getSheetByName('Winter wardrobe');
  if (!sh) return [];
  const last = Math.min(Math.max(sh.getLastRow(), 6), 205);
  const vals = sh.getRange(6, 1, last - 5, 11).getValues();
  const rich = sh.getRange(6, 10, last - 5, 1).getRichTextValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!String(r[0] || '').trim() && !String(r[3] || '').trim()) continue;
    const link = extractLink_(rich[i][0], r[9]);
    out.push({
      id: 'winter-' + (i + 6),
      row: i + 6,
      item: String(r[0] || '').trim(),
      entryType: String(r[1] || '').trim(),
      forWho: String(r[2] || '').trim(),
      storeOrPiece: String(r[3] || '').trim(),
      requirements: String(r[4] || '').trim(),
      price: parseNum_(r[5]),
      area: String(r[6] || '').trim(),
      priority: String(r[7] || '').trim(),
      status: String(r[8] || '').trim() || 'To browse',
      linkLabel: link.label,
      linkUrl: link.url,
      notes: String(r[10] || '').trim(),
    });
  }
  return out;
}

function readHome_(ss) {
  const sh = ss.getSheetByName('Our home');
  if (!sh) return [];
  const last = Math.min(Math.max(sh.getLastRow(), 6), 205);
  const vals = sh.getRange(6, 1, last - 5, 11).getValues();
  const rich = sh.getRange(6, 10, last - 5, 1).getRichTextValues();
  const out = [];
  for (let i = 0; i < vals.length; i++) {
    const r = vals[i];
    if (!String(r[0] || '').trim()) continue;
    const link = extractLink_(rich[i][0], r[9]);
    out.push({
      id: 'home-' + (i + 6),
      row: i + 6,
      item: String(r[0] || '').trim(),
      room: String(r[1] || '').trim(),
      when: String(r[2] || '').trim(),
      priority: String(r[3] || '').trim(),
      budget: parseNum_(r[4]),
      store: String(r[5] || '').trim(),
      who: String(r[6] || '').trim(),
      details: String(r[7] || '').trim(),
      status: String(r[8] || '').trim() || 'Idea',
      linkLabel: link.label,
      linkUrl: link.url,
      notes: String(r[10] || '').trim(),
    });
  }
  return out;
}

function nextEmptyRow_(sh, colIndex) {
  const vals = sh.getRange(6, colIndex, 200, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (!String(vals[i][0] || '').trim()) return i + 6;
  }
  return 206;
}

function setRichLink_(sh, row, col, label, url) {
  if (!url) return;
  const rt = SpreadsheetApp.newRichTextValue()
    .setText(label || url)
    .setLinkUrl(url)
    .build();
  sh.getRange(row, col).setRichTextValue(rt);
}

function writeItemRow_(ss, section, row, item) {
  if (section === 'restaurants') {
    const sh = ss.getSheetByName('Restaurants');
    sh.getRange(row, 1, 1, 13).setValues([[
      item.name || '', item.cuisine || '', item.area || '', item.travel || '',
      item.romance || '', item.budget || '', item.occasion || '', item.booking || 'Not checked',
      item.mustTry || '', item.status || 'Idea', item.linkLabel || item.linkUrl || '',
      item.notes || '', item.rating || ''
    ]]);
    setRichLink_(sh, row, 11, item.linkLabel || item.name, item.linkUrl);
    return { ok: true, row: row };
  }
  if (section === 'dates') {
    const sh = ss.getSheetByName('Date ideas');
    sh.getRange(row, 1, 1, 13).setValues([[
      item.name || '', item.kind || '', item.area || '', item.travel || '',
      item.romance || '', item.budget || '', item.timeNeeded || '', item.setting || '',
      item.bestMoment || '', item.status || 'Idea', item.linkLabel || item.linkUrl || '',
      item.notes || '', item.rating || ''
    ]]);
    setRichLink_(sh, row, 11, item.linkLabel || item.name, item.linkUrl);
    return { ok: true, row: row };
  }
  if (section === 'winter') {
    const sh = ss.getSheetByName('Winter wardrobe');
    sh.getRange(row, 1, 1, 11).setValues([[
      item.item || '', item.entryType || 'Specific item', item.forWho || 'Kitty',
      item.storeOrPiece || '', item.requirements || '', item.price || '',
      item.area || '', item.priority || 'Must-have', item.status || 'To browse',
      item.linkLabel || item.linkUrl || '', item.notes || ''
    ]]);
    setRichLink_(sh, row, 10, item.linkLabel || item.storeOrPiece, item.linkUrl);
    return { ok: true, row: row };
  }
  if (section === 'home') {
    const sh = ss.getSheetByName('Our home');
    sh.getRange(row, 1, 1, 11).setValues([[
      item.item || '', item.room || '', item.when || 'First week',
      item.priority || 'Soon', item.budget || '', item.store || '',
      item.who || 'Together', item.details || '', item.status || 'Idea',
      item.linkLabel || item.linkUrl || '', item.notes || ''
    ]]);
    setRichLink_(sh, row, 10, item.linkLabel || item.item, item.linkUrl);
    return { ok: true, row: row };
  }
  return { ok: false, error: 'Unknown section' };
}

function addItem_(ss, section, item) {
  const sheetMap = {
    restaurants: 'Restaurants',
    dates: 'Date ideas',
    winter: 'Winter wardrobe',
    home: 'Our home',
  };
  const name = sheetMap[section];
  if (!name) return { ok: false, error: 'Unknown section' };
  const sh = ss.getSheetByName(name);
  const row = nextEmptyRow_(sh, 1);
  return writeItemRow_(ss, section, row, item);
}

function updateItem_(ss, section, row, item) {
  if (!row || Number(row) < 6) return { ok: false, error: 'Invalid row' };
  return writeItemRow_(ss, section, Number(row), item);
}

function deleteItem_(ss, section, row) {
  const map = {
    restaurants: ['Restaurants', 13],
    dates: ['Date ideas', 13],
    winter: ['Winter wardrobe', 11],
    home: ['Our home', 11],
  };
  const cfg = map[section];
  if (!cfg || !row || Number(row) < 6) return { ok: false, error: 'Invalid section/row' };
  const sh = ss.getSheetByName(cfg[0]);
  sh.getRange(Number(row), 1, 1, cfg[1]).clearContent();
  return { ok: true };
}

function updateStatus_(ss, section, row, status) {
  const map = {
    restaurants: ['Restaurants', 10],
    dates: ['Date ideas', 10],
    winter: ['Winter wardrobe', 9],
    home: ['Our home', 9],
  };
  const cfg = map[section];
  if (!cfg || !row) return { ok: false, error: 'Invalid section/row' };
  ss.getSheetByName(cfg[0]).getRange(Number(row), cfg[1]).setValue(status);
  return { ok: true };
}

function updateRomance_(ss, section, row, romance) {
  const map = { restaurants: ['Restaurants', 5], dates: ['Date ideas', 5] };
  const cfg = map[section];
  if (!cfg || !row) return { ok: false, error: 'Invalid section/row' };
  ss.getSheetByName(cfg[0]).getRange(Number(row), cfg[1]).setValue(Number(romance));
  return { ok: true };
}

function aiFillWithGemini_(prompt) {
  if (!GEMINI_API_KEY) {
    return { ok: false, error: 'No Gemini API key configured in Apps Script' };
  }
  const resp = UrlFetchApp.fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-goog-api-key': GEMINI_API_KEY },
      payload: JSON.stringify({
        model: 'gemini-3.8-flash',
        tools: [{ type: 'google_search' }],
        input: prompt,
      }),
      muteHttpExceptions: true,
    }
  );
  const code = resp.getResponseCode();
  const body = resp.getContentText();
  if (code < 200 || code >= 300) {
    return { ok: false, error: 'Gemini HTTP ' + code + ': ' + body.slice(0, 160) };
  }
  const json = JSON.parse(body);
  const outputs = json.outputs || [];
  let text = json.output_text || '';
  if (!text) {
    for (let i = 0; i < outputs.length; i++) {
      if (outputs[i].type === 'text' && outputs[i].text) {
        text += (text ? '\n' : '') + outputs[i].text;
      }
    }
  }
  return { ok: true, text: text };
}
