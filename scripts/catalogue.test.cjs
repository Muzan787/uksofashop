// The catalogue (admin upgrade Phase 9).
//
// Replays supabase/migrations/20261015064636_catalogue.sql into PGlite on a
// stand-in schema and checks:
//   * save_product() writes a product, its categories, tier and colourways in
//     one go, and saving a product unchanged changes nothing;
//   * a colourway taken off the form is deleted, or hidden if it was ordered;
//   * the shop sees shown colourways only, a customer still sees one they
//     ordered, and an admin sees them all;
//   * every refusal comes back as its code; non-admins are refused;
//   * an ordered product can't be deleted; categories, ranges, fabrics and
//     collections can't be deleted while used; a category can't sit inside
//     itself;
// plus the pure rules in src/utils/catalogue.ts and source checks that the
// shop reads what it should.
const { test, before } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')

const root = path.join(__dirname, '..')
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8')
function load(file) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports })
  return module.exports
}
const plain = value => JSON.parse(JSON.stringify(value))

const ADMIN = '11111111-1111-4111-8111-111111111111'
const P = 'aaaaaaaa-0000-4000-8000-000000000001'
const V_ORDERED = 'bbbbbbbb-0000-4000-8000-000000000001'
const V_SPARE = 'bbbbbbbb-0000-4000-8000-000000000002'
const C_SOFAS = 'cccccccc-0000-4000-8000-000000000001'
const C_CORNER = 'cccccccc-0000-4000-8000-000000000002'
const G = 'dddddddd-0000-4000-8000-000000000001'
const FC = 'eeeeeeee-0000-4000-8000-000000000001'
const F_USED = 'ffffffff-0000-4000-8000-000000000001'
const F_FREE = 'ffffffff-0000-4000-8000-000000000002'

let db

before(async () => {
  db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('test.jwt', true), ''), '{}')::jsonb $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.jwt() to anon, authenticated;
    create schema private;
    grant usage on schema private to authenticated, anon;
    create function private.is_admin() returns boolean language sql stable as $$ select coalesce(current_setting('test.admin', true), '') = 'yes' $$;
    create function private.require_admin() returns void language plpgsql as $$ begin if not private.is_admin() then raise exception 'NOT_AUTHORISED'; end if; end $$;
    grant execute on function private.is_admin() to authenticated, anon;

    create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, parent_id uuid references public.categories(id) on delete set null, image_url text, created_at timestamptz default now());
    create table public.variant_groups (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, subgroup_title text not null default 'Style');
    create table public.main_collections (id uuid primary key default gen_random_uuid(), name text not null);
    create table public.products (
      id uuid primary key default gen_random_uuid(), category_id uuid references public.categories(id), title text not null, slug text not null unique,
      description text, base_price numeric not null, specifications jsonb default '{}', average_rating numeric default 0, review_count int default 0,
      is_featured boolean default false, created_at timestamptz default now(), is_active boolean default true, variant_group_id uuid references public.variant_groups(id) on delete set null,
      size_label text, gallery_images text[] default '{}', subgroup_label text, origin text not null default 'unspecified', custom_made boolean not null default false,
      was_price numeric, main_collection_id uuid references public.main_collections(id) on delete set null,
      check (was_price is null or was_price > base_price)
    );
    create table public.product_variants (
      id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade, sku text not null unique,
      color text, material text, price_adjustment numeric default 0, stock_quantity int default 0, image_url text, created_at timestamptz default now(), color_hex text, priority int default 99
    );
    create table public.product_categories (product_id uuid not null references public.products(id) on delete cascade, category_id uuid not null references public.categories(id) on delete cascade, primary key (product_id, category_id));
    create table public.offer_product_tiers (product_id uuid primary key references public.products(id) on delete cascade, tier text not null check (tier in ('ELECTRIC','ROMA','STANDARD','EXCLUDED')));
    create table public.orders (id uuid primary key default gen_random_uuid(), customer_email text);
    create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid references public.orders(id), variant_id uuid references public.product_variants(id), fabric_id uuid);
    create table public.reviews (id uuid primary key default gen_random_uuid(), product_id uuid references public.products(id) on delete cascade);
    create table public.fabric_collections (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, is_active boolean not null default true);
    create table public.fabrics (id uuid primary key default gen_random_uuid(), collection_id uuid not null references public.fabric_collections(id) on delete cascade, code text not null, name text not null, is_active boolean not null default true);
    create table public.swatch_request_items (id uuid primary key default gen_random_uuid(), fabric_id uuid references public.fabrics(id) on delete set null);

    -- The shop's catalogue is public to read, as in production; writes go
    -- through the staff functions (or, for reviews here, the test itself).
    grant select on all tables in schema public to anon, authenticated;
    grant insert, delete on public.reviews to authenticated;

    alter table public.product_variants enable row level security;
    create policy "public read product_variants" on public.product_variants for select to public using (true);
    create policy "admin write product_variants" on public.product_variants for all to authenticated using (private.is_admin());
    grant select on public.product_variants to anon, authenticated;
    alter table public.orders enable row level security;
    create policy "owner can view own orders" on public.orders for select to authenticated using ((auth.jwt() ->> 'email') = customer_email);
    grant select on public.orders to authenticated;
    alter table public.order_items enable row level security;
    create policy "owner can view own order_items" on public.order_items for select to authenticated
      using (exists (select 1 from public.orders o where o.id = order_items.order_id and (auth.jwt() ->> 'email') = o.customer_email));
    grant select on public.order_items to authenticated;
    alter table public.categories enable row level security;
    create policy "public read categories" on public.categories for select to public using (true);
    create policy "admin write categories" on public.categories for all to authenticated using (private.is_admin());
    grant select, insert, update, delete on public.categories to authenticated;
    grant select on public.categories to anon;

    insert into public.categories (id, name, slug) values ('${C_SOFAS}', 'Sofas', 'sofas'), ('${C_CORNER}', 'Corner Sofas', 'corner-sofas');
    update public.categories set parent_id = '${C_SOFAS}' where id = '${C_CORNER}';
    insert into public.variant_groups (id, name, slug) values ('${G}', 'Verona', 'verona');
    insert into public.products (id, category_id, title, slug, description, base_price, specifications, variant_group_id, size_label)
      values ('${P}', '${C_SOFAS}', 'Verona 3 Seater', 'verona-3-seater', 'A sofa.', 599, '{"Dimensions": "W 200cm"}', '${G}', '3 Seater');
    insert into public.product_categories values ('${P}', '${C_SOFAS}');
    insert into public.offer_product_tiers values ('${P}', 'STANDARD');
    insert into public.product_variants (id, product_id, sku, color, color_hex, material, priority) values
      ('${V_ORDERED}', '${P}', 'VER-3-GRY', 'Grey', '#808080', 'Velvet', 1),
      ('${V_SPARE}', '${P}', 'VER-3-BLU', 'Blue', '#0000ff', 'Velvet', 2);
    insert into public.orders (id, customer_email) values ('99999999-0000-4000-8000-000000000001', 'buyer@example.com');
    insert into public.order_items (order_id, variant_id, fabric_id) values ('99999999-0000-4000-8000-000000000001', '${V_ORDERED}', '${F_USED}');
    insert into public.fabric_collections (id, name, slug) values ('${FC}', 'Chenille', 'chenille');
    insert into public.fabrics (id, collection_id, code, name) values ('${F_USED}', '${FC}', 'CH-1', 'Mink'), ('${F_FREE}', '${FC}', 'CH-2', 'Sand');
  `)
  await db.exec(read('supabase/migrations/20261015064636_catalogue.sql'))
})

async function isolated(fn) {
  await db.exec('begin')
  try { return await fn() } finally { await db.exec('rollback') }
}
async function as(who, email = '') {
  await db.exec('reset role')
  await db.query(`select set_config('test.admin', $1, true), set_config('test.uid', $2, true), set_config('test.jwt', $3, true)`,
    [who === 'admin' ? 'yes' : '', who === 'admin' ? ADMIN : '', email ? JSON.stringify({ email }) : ''])
  await db.exec(who === 'anon' ? 'set local role anon' : 'set local role authenticated')
}
async function refusal(sql, params = []) {
  await db.exec('savepoint s')
  try { await db.query(sql, params); await db.exec('release savepoint s'); return null }
  catch (err) { await db.exec('rollback to savepoint s'); return err.message }
}
const save = (id, product, cats, canonical, tier, variants) =>
  db.query(`select public.save_product($1, $2::jsonb, $3::uuid[], $4, $5, $6::jsonb) as r`,
    [id, JSON.stringify(product), cats, canonical, tier, JSON.stringify(variants)])

const currentPayload = async () => {
  const p = (await db.query(`select to_jsonb(p) as p from public.products p where id = $1`, [P])).rows[0].p
  const v = (await db.query(`select id, sku, color, color_hex, material, price_adjustment, image_url, is_active, priority from public.product_variants where product_id = $1 order by priority`, [P])).rows
  return { p, v }
}

test('saving a product unchanged changes nothing', async () => {
  await isolated(async () => {
    await as('admin')
    const before = await db.query(`select to_jsonb(p) - 'average_rating' - 'review_count' as p from public.products p where id = $1`, [P])
    const variantsBefore = (await db.query(`select * from public.product_variants where product_id = $1 order by sku`, [P])).rows
    const { p, v } = await currentPayload()
    const r = (await save(P, p, [C_SOFAS], C_SOFAS, 'STANDARD', v)).rows[0].r
    assert.deepEqual(r, { id: P, hidden: 0, deleted: 0 })
    assert.deepEqual((await db.query(`select to_jsonb(p) - 'average_rating' - 'review_count' as p from public.products p where id = $1`, [P])).rows, before.rows)
    assert.deepEqual((await db.query(`select * from public.product_variants where product_id = $1 order by sku`, [P])).rows, variantsBefore)
    assert.equal((await db.query(`select tier from public.offer_product_tiers where product_id = $1`, [P])).rows[0].tier, 'STANDARD')
  })
})

test('a colourway taken off the form is hidden if ordered, deleted if not', async () => {
  await isolated(async () => {
    await as('admin')
    const { p, v } = await currentPayload()
    // Take both off, add a new one: the ordered one is hidden, the spare deleted.
    const r = (await save(P, p, [C_SOFAS], C_SOFAS, 'STANDARD', [{ sku: 'VER-3-GRN', color: 'Green', color_hex: '#00ff00', priority: 3 }])).rows[0].r
    assert.deepEqual(r, { id: P, hidden: 1, deleted: 1 })
    const rows = (await db.query(`select sku, is_active from public.product_variants where product_id = $1 order by sku`, [P])).rows
    assert.deepEqual(rows, [{ sku: 'VER-3-GRN', is_active: true }, { sku: 'VER-3-GRY', is_active: false }])
    assert.ok(v.length === 2)

    // Who can see the hidden one now.
    await as('anon')
    assert.deepEqual((await db.query(`select sku from public.product_variants order by sku`)).rows.map(x => x.sku), ['VER-3-GRN'])
    await as('customer', 'someone@example.com')
    assert.deepEqual((await db.query(`select sku from public.product_variants order by sku`)).rows.map(x => x.sku), ['VER-3-GRN'])
    await as('customer', 'buyer@example.com')
    assert.deepEqual((await db.query(`select sku from public.product_variants order by sku`)).rows.map(x => x.sku), ['VER-3-GRN', 'VER-3-GRY'], 'the buyer still sees what they bought')
    await as('admin')
    assert.equal((await db.query(`select count(*)::int n from public.product_variants`)).rows[0].n, 2)
  })
})

test('a new product saves whole, and every refusal comes back as its code', async () => {
  await isolated(async () => {
    await as('admin')
    const r = (await save(null,
      { title: 'Rio Sofa', slug: 'rio-sofa', base_price: 499, was_price: 599, description: 'Soft.', is_active: false, seo_title: 'Rio' },
      [C_SOFAS, C_CORNER], C_CORNER, 'ELECTRIC',
      [{ sku: 'RIO-1', color: 'Grey', color_hex: '#808080' }, { sku: 'RIO-2', color: 'Blue' }])).rows[0].r
    const row = (await db.query(`select title, is_active, category_id, seo_title from public.products where id = $1`, [r.id])).rows[0]
    assert.deepEqual(row, { title: 'Rio Sofa', is_active: false, category_id: C_CORNER, seo_title: 'Rio' })
    assert.equal((await db.query(`select count(*)::int n from public.product_categories where product_id = $1`, [r.id])).rows[0].n, 2)
    assert.equal((await db.query(`select tier from public.offer_product_tiers where product_id = $1`, [r.id])).rows[0].tier, 'ELECTRIC')

    const base = { title: 'Clash', slug: 'clash', base_price: 100, description: 'x' }
    const one = [{ sku: 'X-1', color: 'a' }]
    const cases = [
      [{ ...base, slug: 'rio-sofa' }, [C_SOFAS], null, one, /SLUG_TAKEN/],
      [{ ...base, slug: 'Bad Slug' }, [C_SOFAS], null, one, /SLUG_INVALID/],
      [{ ...base, title: 'ab' }, [C_SOFAS], null, one, /TITLE_SHORT/],
      [{ ...base, base_price: 0 }, [C_SOFAS], null, one, /PRICE_INVALID/],
      [{ ...base, was_price: 90 }, [C_SOFAS], null, one, /WAS_PRICE_LOW/],
      [{ ...base, description: ' ' }, [C_SOFAS], null, one, /DESCRIPTION_REQUIRED/],
      [{ ...base, variant_group_id: G }, [C_SOFAS], null, one, /SIZE_LABEL_REQUIRED/],
      [base, [], null, one, /NO_CATEGORY/],
      [base, [C_SOFAS], 'GOLD', one, /TIER_INVALID/],
      [base, [C_SOFAS], null, [], /NO_COLOURWAYS/],
      [base, [C_SOFAS], null, [{ sku: 'RIO-1', color: 'a' }], /SKU_TAKEN/],
      [base, [C_SOFAS], null, [{ sku: 'X-1', color: 'a' }, { sku: 'X-1', color: 'b' }], /SKU_DUPLICATE/],
      [base, [C_SOFAS], null, [{ sku: 'X-1', color: 'a', color_hex: 'red' }], /BAD_COLOUR/],
      [base, [C_SOFAS], null, [{ sku: 'X-1', color: '' }], /COLOUR_NAME_REQUIRED/],
      [base, [C_SOFAS], null, [{ sku: '', color: 'a' }], /SKU_REQUIRED/],
      [{ ...base, is_active: true }, [C_SOFAS], null, [{ sku: 'X-1', color: 'a', is_active: false }], /NO_SHOWN_COLOURWAYS/],
      [base, [C_SOFAS], null, [{ id: V_SPARE, sku: 'X-1', color: 'a' }], /VARIANT_UNKNOWN/],
    ]
    for (const [product, cats, tier, variants, expected] of cases) {
      const message = await refusal(`select public.save_product(null, $1::jsonb, $2::uuid[], null, $3, $4::jsonb)`,
        [JSON.stringify(product), cats, tier, JSON.stringify(variants)])
      assert.match(message ?? 'ALLOWED', expected, String(expected))
    }

    await as('customer', 'someone@example.com')
    assert.match(await refusal(`select public.save_product(null, '{}'::jsonb, '{}'::uuid[], null, null, '[]'::jsonb)`) ?? 'ALLOWED', /NOT_AUTHORISED/)
    await as('anon')
    assert.match(await refusal(`select public.save_product(null, '{}'::jsonb, '{}'::uuid[], null, null, '[]'::jsonb)`) ?? 'ALLOWED', /permission denied/)
  })
})

test('nothing in use can be deleted, and a category cannot sit inside itself', async () => {
  await isolated(async () => {
    await as('admin')
    assert.match(await refusal(`select public.delete_product($1)`, [P]), /PRODUCT_ORDERED/)
    const fresh = (await save(null, { title: 'Spare Sofa', slug: 'spare-sofa', base_price: 1, description: 'x' }, [C_SOFAS], C_SOFAS, null, [{ sku: 'SP-1', color: 'a' }])).rows[0].r.id
    await db.query(`insert into public.reviews (product_id) values ($1)`, [fresh])
    assert.match(await refusal(`select public.delete_product($1)`, [fresh]), /PRODUCT_HAS_REVIEWS/)
    await db.query(`delete from public.reviews where product_id = $1`, [fresh])
    await db.query(`select public.delete_product($1)`, [fresh])
    assert.equal((await db.query(`select count(*)::int n from public.products where id = $1`, [fresh])).rows[0].n, 0)

    assert.match(await refusal(`select public.delete_category($1)`, [C_SOFAS]), /IN_USE/)
    assert.match(await refusal(`select public.delete_variant_group($1)`, [G]), /IN_USE/)
    assert.match(await refusal(`select public.delete_fabric($1)`, [F_USED]), /IN_USE/)
    assert.match(await refusal(`select public.delete_fabric_collection($1)`, [FC]), /IN_USE/)
    await db.query(`select public.delete_fabric($1)`, [F_FREE])
    assert.equal((await db.query(`select count(*)::int n from public.fabrics where id = $1`, [F_FREE])).rows[0].n, 0)

    assert.match(await refusal(`update public.categories set parent_id = $1 where id = $2`, [C_CORNER, C_SOFAS]), /CATEGORY_LOOP/)
    assert.match(await refusal(`update public.categories set parent_id = id where id = $1`, [C_SOFAS]), /CATEGORY_LOOP/)

    await as('customer', 'someone@example.com')
    for (const fn of ['delete_product', 'delete_category', 'delete_variant_group', 'delete_fabric', 'delete_fabric_collection']) {
      assert.match(await refusal(`select public.${fn}($1)`, [P]) ?? 'ALLOWED', /NOT_AUTHORISED/, fn)
    }
  })
})

test('the catalogue rules that need no database', () => {
  const c = load('src/utils/catalogue.ts')
  assert.equal(c.slugify('Verona 3 Seater (Grey) & Footstool'), 'verona-3-seater-grey-and-footstool')
  assert.equal(c.slugify('  Café — Corner  '), 'cafe-corner')
  const base = { title: 'Rio', is_active: true, is_featured: false, custom_made: false, size_label: null, gallery_images: [], specifications: { Dimensions: 'W 200cm' }, variant_group: 'Rio range', product_variants: [{ sku: 'RIO-1', color: 'Grey', color_hex: '#808080', image_url: 'https://res.cloudinary.com/x.jpg', is_active: true }] }
  assert.deepEqual(plain(c.productFlags(base)), [])
  assert.deepEqual(plain(c.productFlags({ ...base, is_active: false, is_featured: true, custom_made: true, specifications: {}, product_variants: [{ ...base.product_variants[0], image_url: null }] })),
    ['hidden', 'featured', 'made-to-order', 'no-photo', 'no-size'])
  assert.equal(c.needsAttention({ ...base, specifications: { Dimensions: ' ' } }), true)
  assert.equal(c.needsAttention({ ...base, product_variants: [{ ...base.product_variants[0], is_active: false }] }), true, 'a hidden colourway photo does not count')
  assert.equal(c.needsAttention({ ...base, product_variants: [{ ...base.product_variants[0], image_url: null }], gallery_images: ['https://res.cloudinary.com/g.jpg'] }), false)
  for (const q of ['rio', 'RIO-1', 'grey', 'rio range', 'GREY rio']) assert.equal(c.matchesSearch(base, q), true, q)
  assert.equal(c.matchesSearch(base, 'blue'), false)

  assert.deepEqual(plain(c.saveRefusal('SLUG_TAKEN', null)), { field: 'slug', text: 'Another product already uses this web address. Change it slightly.' })
  assert.equal(c.saveRefusal('SKU_TAKEN', 'RIO-1').sku, 'RIO-1')
  assert.match(c.saveRefusal('SKU_TAKEN', 'RIO-1').text, /RIO-1/)
  assert.equal(c.saveRefusal('something odd', null).field, 'form')
  for (const code of ['TITLE_SHORT', 'SLUG_INVALID', 'PRICE_INVALID', 'WAS_PRICE_LOW', 'DESCRIPTION_REQUIRED', 'SIZE_LABEL_REQUIRED', 'NO_CATEGORY', 'NO_COLOURWAYS', 'NO_SHOWN_COLOURWAYS', 'SKU_DUPLICATE', 'BAD_COLOUR', 'SEO_TITLE_LONG']) {
    assert.notEqual(c.saveRefusal(code, 'X').field, 'form', code)
  }
  assert.match(c.deleteRefusal('PRODUCT_ORDERED', null, 'product'), /only be hidden/)
  assert.match(c.deleteRefusal('IN_USE', '12 fabrics', 'collection'), /12 fabrics/)
})

test('the shop reads shown colourways and categories, in the admin\'s order', () => {
  assert.match(read('src/utils/catalog/productFeed.ts'), /\.eq\('product_variants\.is_active', true\)/, 'the feed reads with the server key, so it filters itself')
  assert.match(read('src/app/review/page.tsx'), /\.eq\('product_variants\.is_active', true\)/)
  const nav = read('src/utils/navigation.ts')
  assert.match(nav, /\.eq\('is_active', true\)\s*\.order\('sort'\)\s*\.order\('name'\)/)
  assert.match(read('src/app/sitemap.ts'), /\.eq\('is_active', true\)/)
  assert.match(read('src/app/shop/[category]/[slug]/page.tsx'), /product\.seo_title\?\.trim\(\) \|\| product\.title/)
  assert.match(read('src/app/search/page.tsx'), /ilike\('search_words'/)
  assert.match(read('src/components/Category/CategoryHero.tsx'), /intro\?\.trim\(\) &&/)
  for (const gone of ['src/components/Admin/AddProductForm.tsx', 'src/components/Admin/EditProductForm.tsx', 'src/components/Admin/AddCategoryForm.tsx']) {
    assert.equal(fs.existsSync(path.join(root, gone)), false, `${gone} is replaced by the editor`)
  }
  const editor = read('src/components/Admin/ProductEditor.tsx')
  for (const kept of ['PriceFields', 'Description', 'Where is it made?', 'Can be made to order', 'Feature on the homepage', 'Main collection', 'Size label', 'What customers see this choice called', 'Gallery photos', 'Specifications', 'beforeunload']) {
    assert.ok(editor.includes(kept), kept)
  }
})
