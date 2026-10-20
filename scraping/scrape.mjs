import * as cheerio from 'cheerio';
import { writeFile, mkdir } from 'node:fs/promises';

const USER_AGENT = 'ShowroomAutoStudentProject/1.0 (projet scolaire Angular)';

const CARS = [
  { id: 1,  brand: 'Mercedes Benz', model: 'C-CLASS',            url: 'https://en.wikipedia.org/wiki/Mercedes-Benz_C-Class' },
  { id: 2,  brand: 'Mercedes Benz', model: 'GLA',                url: 'https://en.wikipedia.org/wiki/Mercedes-Benz_GLA' },
  { id: 3,  brand: 'Mercedes Benz', model: 'GLE',                url: 'https://en.wikipedia.org/wiki/Mercedes-Benz_GLE' },
  { id: 4,  brand: 'Jaguar',        model: 'F-Pace',             url: 'https://en.wikipedia.org/wiki/Jaguar_F-Pace' },
  { id: 5,  brand: 'Jaguar',        model: 'E-PACE',             url: 'https://en.wikipedia.org/wiki/Jaguar_E-Pace' },
  { id: 6,  brand: 'Audi',          model: 'Q3 CROSSBACK',       url: 'https://en.wikipedia.org/wiki/Audi_Q3' },
  { id: 7,  brand: 'Audi',          model: 'Q5',                 url: 'https://en.wikipedia.org/wiki/Audi_Q5' },
  { id: 8,  brand: 'Audi',          model: 'A3 SPORTBACK',       url: 'https://en.wikipedia.org/wiki/Audi_A3' },
  { id: 9,  brand: 'BMW',           model: 'X2 SDRIVE PACK',     url: 'https://en.wikipedia.org/wiki/BMW_X2' },
  { id: 10, brand: 'BMW',           model: 'IX',                 url: 'https://en.wikipedia.org/wiki/BMW_iX' },
  { id: 11, brand: 'BMW',           model: 'X3 HYBRIDE',         url: 'https://en.wikipedia.org/wiki/BMW_X3' },
  { id: 12, brand: 'Land Rover',    model: 'Range Rover Evoque', url: 'https://en.wikipedia.org/wiki/Range_Rover_Evoque' },
  { id: 13, brand: 'Land Rover',    model: 'Defender 90',        url: 'https://en.wikipedia.org/wiki/Land_Rover_Defender_(L663)' },
  { id: 14, brand: 'Land Rover',    model: 'Range Rover',        url: 'https://en.wikipedia.org/wiki/Range_Rover_(L460)' },
  { id: 15, brand: 'Alfa Romeo',    model: 'Stelvio',            url: 'https://en.wikipedia.org/wiki/Alfa_Romeo_Stelvio' },
  { id: 16, brand: 'Alfa Romeo',    model: 'Giulia',             url: 'https://en.wikipedia.org/wiki/Alfa_Romeo_Giulia_(952)' },
];

const clean = (t) => t.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

function parseCarPage(html) {
  const $ = cheerio.load(html);
  const title = clean($('#firstHeading').text());

  let summary = '';
  $('.mw-parser-output > p').each((_, el) => {
    const text = clean($(el).text());
    if (text.length > 80) { summary = text; return false; }
  });

  const infobox = {};
  $('table.infobox tr').each((_, tr) => {
    const label = clean($(tr).find('th').first().text());
    const value = clean($(tr).find('td').first().text());
    if (label && value) infobox[label] = value;
  });

  let image = $('table.infobox img').first().attr('src') || '';
  if (image.startsWith('//')) image = 'https:' + image;

  return {
    title, summary, image,
    manufacturer: infobox['Manufacturer'] || '',
    production: infobox['Production'] || '',
    bodyStyle: infobox['Body style'] || '',
    engine: infobox['Engine'] || '',
    transmission: infobox['Transmission'] || '',
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const results = [];
for (const car of CARS) {
  process.stdout.write(`[${car.id}/${CARS.length}] ${car.brand} ${car.model} ... `);
  try {
    const res = await fetch(car.url, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    results.push({ ...car, ...parseCarPage(await res.text()), error: '' });
    console.log('OK');
  } catch (err) {
    results.push({ ...car, error: err.message });
    console.log(`ECHEC (${err.message})`);
  }
  await sleep(1500);
}

await mkdir('output', { recursive: true });
await writeFile('output/autos-scraped.json', JSON.stringify(results, null, 2), 'utf8');

const cols = ['id','brand','model','title','manufacturer','production','bodyStyle','engine','transmission','image','url','summary','error'];
const csv = [cols.join(','), ...results.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');
await writeFile('output/autos-scraped.csv', '\uFEFF' + csv, 'utf8');