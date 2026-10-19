import type { Pool } from 'pg';

/**
 * Demo missions for two Colombian cities: Cartagena (places already imported by
 * seedCartagena) and Medellín (a small set of landmark candidates created here,
 * coordinates approximate). Idempotent: ids are derived from stable keys.
 * Rewards are USD minor units (cents). Nothing is verified or paid by the seed;
 * the one 'verified' mission per city is waiting for the operator's Pay button.
 */

type Kind = 'hours' | 'access' | 'evidence';
type Status = 'offered' | 'accepted' | 'verified';

interface PlaceSpec { name: string; category: string; lat: number; lon: number; landmark: string }
interface MissionSpec {
  key: string;
  place: string; // matches PlaceSpec.name (Medellín) or an existing Cartagena place name
  category: string;
  kind: Kind;
  status: Status;
  owner: 0 | 1;
  brief: string;
  reward: number;
}
interface SpotterSpec { key: string; name: string; email: string; phone: string; lat: number; lon: number }
interface CitySpec {
  slug: string;
  name: string;
  timezone: string;
  bbox: [number, number, number, number]; // lonMin, latMin, lonMax, latMax
  places: PlaceSpec[]; // created if missing
  spotters: [SpotterSpec, SpotterSpec];
  missions: MissionSpec[];
}

const MEDELLIN_PROFILES: Record<string, unknown> = {
  "Plaza Botero": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "Open plaza in the historic centre of Medell\u00edn with a collection of Fernando Botero bronze sculptures, facing the Museo de Antioquia.", es: "Plaza abierta en el centro histórico de Medellín con esculturas en bronce de Fernando Botero, frente al Museo de Antioquia." },
    image: { url: '/demo/medellin/plaza-botero.jpg', credit: 'Steffen Schmitz (more photos) / Wikimedia Commons · 2023', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Medell%C3%ADn,_Plaza_Botero,_2023-07_CN-01.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
    sources: [{ label: "Wikipedia: Plaza Botero", url: "https://es.wikipedia.org/wiki/Plaza_Botero" }],
  },
  "Pueblito Paisa (Cerro Nutibara)": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "A replica of a traditional Antioquian town on top of Cerro Nutibara, with views over the city.", es: "Réplica de un pueblo antioqueño tradicional en la cima del Cerro Nutibará, con vistas sobre la ciudad." },
    image: { url: '/demo/medellin/pueblito-paisa.jpg', credit: 'Petruss / Wikimedia Commons · 2013', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pueblito_Paisa_Medell%C3%ADn.JPG', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
    sources: [{ label: "Wikipedia: Cerro Nutibará", url: "https://es.wikipedia.org/wiki/Cerro_Nutibara" }],
  },
  "Comuna 13 - Escaleras el\u00e9ctricas": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "Hillside neighbourhood in San Javier known for its outdoor escalators and street art.", es: "Barrio de ladera en San Javier conocido por sus escaleras eléctricas al aire libre y su arte urbano." },
    image: { url: '/demo/medellin/comuna-trece-escaleras.jpg', credit: 'Juan Gómez / Wikimedia Commons · 2019', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Escaleras_el%C3%A9ctricas_de_la_comuna_13,_Medell%C3%ADn_-_04.jpg', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0' },
    sources: [{ label: "Wikipedia: Comuna 13", url: "https://es.wikipedia.org/wiki/Comuna_13_(Medell%C3%ADn)" }],
  },
  "Jard\u00edn Bot\u00e1nico de Medell\u00edn": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "Botanical garden in the north of the city, next to Parque Explora.", es: "Jardín botánico en el norte de la ciudad, junto al Parque Explora." },
    image: { url: '/demo/medellin/jardin-botanico.jpg', credit: 'George Donnelly / Wikimedia Commons · 2008', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jard%C3%ADn_Bot%C3%A1nico_de_Medell%C3%ADn-_Lago.jpg', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0' },
    sources: [{ label: "Wikipedia: Jardín Botánico de Medellín", url: "https://es.wikipedia.org/wiki/Jard%C3%ADn_Bot%C3%A1nico_de_Medell%C3%ADn" }],
  },
  "Parque Arv\u00ed": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "Nature reserve on the hills east of Medell\u00edn, reached by the Metrocable Line L.", es: "Reserva natural en las montañas al oriente de Medellín, a la que se llega por el Metrocable Línea L." },
    image: { url: '/demo/medellin/parque-arvi.jpg', credit: 'Alejandro Rojas (SajoR) / Wikimedia Commons · 2021', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Metrocable_del_Parque_Arv%C3%AD_-_Medell%C3%ADn.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
    sources: [{ label: "Wikipedia: Parque Arví", url: "https://es.wikipedia.org/wiki/Parque_Arv%C3%AD" }],
  },
  "Museo de Antioquia": {
    demo: true, researchedAt: '2026-10-19',
    summary: { en: "Art museum on Plaza Botero, one of the oldest museums in Colombia.", es: "Museo de arte en la Plaza Botero, uno de los más antiguos de Colombia." },
    image: { url: '/demo/medellin/museo-de-antioquia.jpg', credit: 'Steffen Schmitz (more photos) / Wikimedia Commons · 2023', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Medell%C3%ADn,_Museo_de_Antioquia,_2023-07_CN-01.jpg', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0' },
    sources: [{ label: "Wikipedia: Museo de Antioquia", url: "https://es.wikipedia.org/wiki/Museo_de_Antioquia" }],
  },
};

const MEDELLIN: CitySpec = {
  slug: 'medellin',
  name: 'Medellín',
  timezone: 'America/Bogota',
  bbox: [-75.72, 6.15, -75.48, 6.34],
  places: [
    { name: 'Plaza Botero', category: 'culture_history', lat: 6.2518, lon: -75.5689, landmark: 'Open plaza with the Botero bronze sculptures, in front of the Museo de Antioquia.' },
    { name: 'Pueblito Paisa (Cerro Nutibara)', category: 'culture_history', lat: 6.2355, lon: -75.5792, landmark: 'Replica Antioquian village on top of Cerro Nutibara.' },
    { name: 'Parque Lleras', category: 'nightlife_music', lat: 6.2088, lon: -75.5675, landmark: 'Small park at the centre of El Poblado nightlife.' },
    { name: 'Comuna 13 - Escaleras eléctricas', category: 'culture_history', lat: 6.2565, lon: -75.6120, landmark: 'Outdoor escalators and street-art lanes in San Javier.' },
    { name: 'Jardín Botánico de Medellín', category: 'nature_walk', lat: 6.2720, lon: -75.5640, landmark: 'Botanical garden next to Parque Explora.' },
    { name: 'Mercado del Río', category: 'eat_drink', lat: 6.2296, lon: -75.5762, landmark: 'Food hall of restaurants and market stalls near the Medellín River.' },
    { name: 'Parque Arví', category: 'nature_walk', lat: 6.2796, lon: -75.4962, landmark: 'Nature reserve reached by the Metrocable Line L.' },
    { name: 'Museo de Antioquia', category: 'culture_history', lat: 6.2519, lon: -75.5695, landmark: 'Art museum on Plaza Botero.' },
  ],
  spotters: [
    { key: 'med-camila', name: 'Camila Restrepo', email: 'camila.restrepo@demo.guaca.live', phone: '+57 300 000 0101', lat: 6.2476, lon: -75.5658 },
    { key: 'med-santiago', name: 'Santiago Zapata', email: 'santiago.zapata@demo.guaca.live', phone: '+57 300 000 0102', lat: 6.2088, lon: -75.5675 },
  ],
  missions: [
    { key: 'med-1', place: 'Plaza Botero', category: 'culture_history', kind: 'access', status: 'offered', owner: 0, brief: 'Check whether the sculptures on Plaza Botero are open to walk through today and note any fencing or events.', reward: 150 },
    { key: 'med-2', place: 'Pueblito Paisa (Cerro Nutibara)', category: 'culture_history', kind: 'hours', status: 'offered', owner: 0, brief: 'Confirm the opening hours of Pueblito Paisa and whether the viewpoint is free to enter.', reward: 200 },
    { key: 'med-3', place: 'Comuna 13 - Escaleras eléctricas', category: 'culture_history', kind: 'access', status: 'offered', owner: 1, brief: 'Check that the outdoor escalators are running and how to reach them from the San Javier Metro station.', reward: 250 },
    { key: 'med-4', place: 'Mercado del Río', category: 'eat_drink', kind: 'hours', status: 'offered', owner: 1, brief: 'Confirm closing time at Mercado del Río on a weekday and whether the stalls take cards.', reward: 180 },
    { key: 'med-5', place: 'Jardín Botánico de Medellín', category: 'nature_walk', kind: 'evidence', status: 'offered', owner: 0, brief: 'Photograph the main entrance and ticket window at the Jardín Botánico so a visitor can find it.', reward: 160 },
    { key: 'med-6', place: 'Parque Lleras', category: 'nightlife_music', kind: 'evidence', status: 'accepted', owner: 1, brief: 'Photograph the street entrance to Parque Lleras from Calle 10 and note if it is closed to traffic.', reward: 140 },
    { key: 'med-7', place: 'Museo de Antioquia', category: 'culture_history', kind: 'hours', status: 'verified', owner: 0, brief: 'Confirm the Museo de Antioquia opening hours and the entry price for foreign visitors.', reward: 300 },
  ],
};

/** Cartagena places that already exist (imported by seedCartagena) but have no public profile. */
const CARTAGENA_EXTRA_PROFILES: Record<string, unknown> = {
  'Fuerte de San Sebastián del Pastelillo': {
    demo: true, researchedAt: '2026-10-19',
    summary: {
      en: 'Colonial fort on the Manga waterfront, at the entrance of the bay. It is part of the historic defences of Cartagena and today houses the Club de Pesca.',
      es: 'Fuerte colonial en el borde de Manga, a la entrada de la bahía. Hace parte de las antiguas defensas de Cartagena y hoy alberga el Club de Pesca.',
    },
    image: { url: '/demo/cartagena/fuerte-pastelillo.jpg', credit: "Ivonne Correa / Wikimedia Commons · 2012", sourceUrl: "https://commons.wikimedia.org/wiki/File:Fuerte_de_San_Sebasti%C3%A1n_del_Pastelillo.JPG", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0" },
    sources: [{ label: 'Wikipedia: Fuerte de San Sebastián del Pastelillo', url: 'https://es.wikipedia.org/wiki/Fuerte_de_San_Sebasti%C3%A1n_del_Pastelillo' }],
  },
};

const CARTAGENA: CitySpec = {
  slug: 'cartagena',
  name: 'Cartagena',
  timezone: 'America/Bogota',
  bbox: [-75.62, 10.37, -75.45, 10.48],
  places: [],
  spotters: [
    { key: 'ctg-valentina', name: 'Valentina Ospino', email: 'valentina.ospino@demo.guaca.live', phone: '+57 300 000 0111', lat: 10.4236, lon: -75.5494 },
    { key: 'ctg-julian', name: 'Julián Barrios', email: 'julian.barrios@demo.guaca.live', phone: '+57 300 000 0112', lat: 10.4225, lon: -75.5446 },
  ],
  missions: [
    { key: 'ctg-1', place: 'Castillo San Felipe de Barajas', category: 'culture_history', kind: 'hours', status: 'offered', owner: 0, brief: 'Confirm the ticket-window hours at the Castillo San Felipe de Barajas and the last entry time.', reward: 250 },
    { key: 'ctg-2', place: 'Catedral de Santa Catalina de Alejandría', category: 'culture_history', kind: 'access', status: 'offered', owner: 0, brief: 'Check whether the cathedral is open to visitors today and which door is used.', reward: 150 },
    { key: 'ctg-3', place: 'Las Bovedas', category: 'market_shop', kind: 'hours', status: 'offered', owner: 1, brief: 'Confirm what time the Las Bóvedas craft stalls open and close in the afternoon.', reward: 180 },
    { key: 'ctg-4', place: 'Plaza de los coches', category: 'market_shop', kind: 'evidence', status: 'offered', owner: 1, brief: 'Photograph the Plaza de los Coches from the Torre del Reloj gate so a visitor can recognise it.', reward: 140 },
    { key: 'ctg-5', place: "Bembe De Getsemani - Bar", category: 'eat_drink', kind: 'hours', status: 'offered', owner: 1, brief: 'Confirm the opening time of Bembé in Getsemaní and whether there is a cover charge.', reward: 160 },
    { key: 'ctg-6', place: 'La Brioche Bocagrande', category: 'eat_drink', kind: 'hours', status: 'accepted', owner: 0, brief: 'Confirm breakfast hours at La Brioche in Bocagrande and whether they accept cards.', reward: 120 },
    { key: 'ctg-8', place: 'Fuerte de San Sebastián del Pastelillo', category: 'culture_history', kind: 'access', status: 'offered', owner: 1, brief: 'Check whether visitors can walk up to the Fuerte de San Sebastián del Pastelillo today, which entrance is used, and whether the Club de Pesca restricts access.', reward: 200 },
    { key: 'ctg-7', place: 'castillo san Felipe viewpoint', category: 'nature_walk', kind: 'evidence', status: 'verified', owner: 1, brief: 'Photograph the view from the Castillo San Felipe viewpoint and the path leading to it.', reward: 300 },
  ],
};

const city_profiles = (name: string): unknown => MEDELLIN_PROFILES[name] ?? null;

async function ensureArea(pool: Pool, city: CitySpec): Promise<string> {
  const [x1, y1, x2, y2] = city.bbox;
  const res = await pool.query<{ id: string }>(
    `insert into areas (id, name, slug, country, timezone, geom)
     values (md5($1)::uuid, $2, $1, 'CO', $3,
             ST_GeogFromText($4))
     on conflict (slug) do update set name = excluded.name
     returning id`,
    [city.slug, city.name, city.timezone, `POLYGON((${x1} ${y1},${x2} ${y1},${x2} ${y2},${x1} ${y2},${x1} ${y1}))`],
  );
  return res.rows[0]!.id;
}

async function ensureSpotter(pool: Pool, s: SpotterSpec, areaId: string): Promise<string> {
  const res = await pool.query<{ id: string }>(
    `insert into spotters (id, name, email, phone, area_id, home_h3, language)
     values (md5($1)::uuid, $2, $3, $4, $5, h3_lat_lng_to_cell(point($6, $7), 8)::text, 'es')
     on conflict (phone) do update set name = excluded.name, email = excluded.email, area_id = excluded.area_id, active = true
     returning id`,
    [s.key, s.name, s.email, s.phone, areaId, s.lon, s.lat],
  );
  return res.rows[0]!.id;
}

async function ensurePlace(pool: Pool, areaId: string, p: PlaceSpec): Promise<void> {
  const profile = city_profiles(p.name);
  await pool.query(
    `insert into places (id, area_id, name, category, landmark_description, location, h3_8, source, verification_status, public_profile)
     select md5($1 || ':' || $3)::uuid, $2, $3, $4, $5,
            ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography,
            h3_lat_lng_to_cell(point($6, $7), 8)::text, 'osm_candidate', 'candidate', $8::jsonb
      where not exists (select 1 from places where area_id = $2 and name = $3)`,
    [`place`, areaId, p.name, p.category, p.landmark, p.lon, p.lat, profile ? JSON.stringify(profile) : null],
  );
  // Places created by an earlier run of this seed get their profile now.
  if (profile) {
    await pool.query(`update places set public_profile = $3::jsonb where area_id = $1 and name = $2 and public_profile is null`, [
      areaId, p.name, JSON.stringify(profile),
    ]);
  }
}

async function seedCity(pool: Pool, city: CitySpec): Promise<{ missions: number; spotters: number }> {
  const areaId = await ensureArea(pool, city);
  for (const p of city.places) await ensurePlace(pool, areaId, p);
  if (city.slug === 'cartagena') {
    for (const [name, profile] of Object.entries(CARTAGENA_EXTRA_PROFILES)) {
      await pool.query(`update places set public_profile = $3::jsonb where area_id = $1 and name = $2 and public_profile is null`, [
        areaId, name, JSON.stringify(profile),
      ]);
    }
  }
  const spotterIds = [] as string[];
  for (const s of city.spotters) spotterIds.push(await ensureSpotter(pool, s, areaId));

  let missions = 0;
  for (const m of city.missions) {
    const place = await pool.query<{ id: string; h3: string }>(
      `select id, h3_8 as h3 from places where area_id = $1 and name = $2 order by created_at limit 1`,
      [areaId, m.place],
    );
    const target = place.rows[0];
    if (!target) throw new Error(`${city.name}: place not found: ${m.place}`);
    const gap = await pool.query<{ id: string }>(
      `insert into gaps (id, area_id, category, h3_8, question_count, distinct_session_count, score, status)
       values (md5($1)::uuid, $2, $3, $4, 3, 2, 12, 'commissioned')
       on conflict (area_id, category, h3_8) do update set updated_at = now()
       returning id`,
      [`gap:${m.key}`, areaId, m.category, target.h3],
    );
    const res = await pool.query(
      `insert into missions (id, gap_id, spotter_id, brief, target_category, target_h3, reward_minor, currency, status,
                             created_by, result_place_id, task_kind, accepted_at, expires_at)
       values (md5($1)::uuid, $2, $3, $4, $5, $6, $7, 'USD', $8, 'operator', $9, $10,
               case when $8 in ('accepted','verified') then now() - interval '2 hours' end,
               now() + interval '14 days')
       on conflict do nothing`,
      [`mission:${m.key}`, gap.rows[0]!.id, spotterIds[m.owner], m.brief, m.category, target.h3, m.reward, m.status, target.id, m.kind],
    );
    missions += res.rowCount ?? 0;
  }
  return { missions, spotters: spotterIds.length };
}

export async function seedColombiaMissions(pool: Pool): Promise<Record<string, { missions: number; spotters: number }>> {
  const cartagena = await pool.query(`select 1 from places p join areas a on a.id = p.area_id where a.slug = 'cartagena' limit 1`);
  if (cartagena.rowCount === 0) throw new Error('Run seed:cartagena first: the Cartagena missions target its imported places.');
  return { medellin: await seedCity(pool, MEDELLIN), cartagena: await seedCity(pool, CARTAGENA) };
}
