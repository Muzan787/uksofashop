-- The 69 fabrics we offer, as they stood when the library was built.
--
-- Generated rather than typed: the codes, supplier titles and swatch images
-- come from R&S's own catalogue, the display names are their titles with the
-- code and collection words stripped out (and their two spelling mistakes,
-- "Torqouise" and "Mocca", corrected), and each hex is the predominant colour
-- Cloudinary measured in the swatch photograph itself rather than a guess.
--
-- The images are copies on our own Cloudinary account, not hotlinks to the
-- supplier's CDN - next.config.ts only allows res.cloudinary.com, and a
-- supplier's URL is not something to build a product page on.
--
-- Idempotent: re-running updates names, images and sort order in place.

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('Chenille', 'chenille', 'chenille-fabric', 1)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH01', 'Cream', 'CH01 Chenille Cream', '#D2C9B6', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339351/fabrics/ch01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH02', 'Mink', 'CH02 Chenille Mink', '#855F48', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339353/fabrics/ch02.jpg', 2),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH03', 'Chocolate', 'CH03 Chenille Chocolate', '#1C0904', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339354/fabrics/ch03.jpg', 3),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH04', 'Silver', 'CH04 Chenille Silver', '#7C716E', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339356/fabrics/ch04.jpg', 4),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH05', 'Charcoal', 'CH05 Chenille Charcoal', '#302D2A', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339358/fabrics/ch05.jpg', 5),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH06', 'Duck Egg', 'CH06 Chenille Duck Egg', '#456C79', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339360/fabrics/ch06.jpg', 6),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH07', 'Teal', 'CH07 Chenille Teal', '#022C39', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339362/fabrics/ch07.jpg', 7),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH08', 'Purple', 'CH08 Chenille Purple', '#281A32', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339364/fabrics/ch08.jpg', 8),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH09', 'Aubergine', 'CH09 Chenille Aubergine', '#30040A', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339365/fabrics/ch09.jpg', 9),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH10', 'Red', 'CH10 Chenille Red', '#83030F', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339367/fabrics/ch10.jpg', 10),
  ((select id from public.fabric_collections where slug = 'chenille'), 'CH11', 'Black', 'CH11 Chenille Black', '#292524', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339369/fabrics/ch11.jpg', 11)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('Plush Soft Velvet', 'plush-soft-velvet', 'velvet-fabric', 2)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL01', 'Steel', 'PL01 Plush Soft Velvet Steel', '#323239', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339371/fabrics/pl01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL02', 'Silver', 'PL02 Plush Soft Velvet Silver', '#848488', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339373/fabrics/pl02.jpg', 2),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL03', 'Grey', 'PL03 Plush Soft Velvet Grey', '#BCBCC0', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339374/fabrics/pl03.jpg', 3),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL05', 'Mustard', 'PL05 Plush Soft Velvet Mustard', '#825018', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339376/fabrics/pl05.jpg', 4),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL06', 'Sky', 'PL06 Plush Soft Velvet Sky', '#426882', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339378/fabrics/pl06.jpg', 5),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL07', 'Mink', 'PL07 Plush Soft Velvet Mink', '#836551', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339380/fabrics/pl07.jpg', 6),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL08', 'Turquoise', 'PL08 Plush Soft Velvet Torqouise', '#66B6CC', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339382/fabrics/pl08.jpg', 7),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL09', 'Blue', 'PL09 Soft Plush Velvet Blue', '#133A68', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339383/fabrics/pl09.jpg', 8),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL10', 'Claret', 'PL10 Plush Soft Velvet Claret', '#DA6E8A', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339385/fabrics/pl10.jpg', 9),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL11', 'White', 'PL11 Soft Plush Velvet White', '#C2C6D0', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339387/fabrics/pl11.jpg', 10),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL12', 'Pink', 'PL12 Plush Soft Velvet Pink', '#D8B7BF', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339389/fabrics/pl12.jpg', 11),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL13', 'Ice', 'PL13 Plush Soft Velvet Ice', '#C7C7CA', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339390/fabrics/pl13.jpg', 12),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL14', 'Cream', 'PL14 Plush Soft Velvet Cream', '#BBB7B2', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339392/fabrics/pl14.jpg', 13),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL15', 'Pebble', 'PL15 Soft Plush Velvet Pebble', '#8C8683', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339393/fabrics/pl15.jpg', 14),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL16', 'Mocha', 'PL16 Plush Soft Velvet Mocca', '#755A4D', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339395/fabrics/pl16.jpg', 15),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL17', 'Emerald', 'PL17 Plush Soft Velvet Emerald', '#012724', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339397/fabrics/pl17.jpg', 16),
  ((select id from public.fabric_collections where slug = 'plush-soft-velvet'), 'PL18', 'Burnt Orange', 'PL18 Plush Soft Velvet Burnt Orange', '#E07E49', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339398/fabrics/pl18.jpg', 17)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('Crushed Velvet', 'crushed-velvet', 'crushed-velvet-fabric', 3)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV01', 'White', 'Crushed Velvet CV01 White', '#CACCD1', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339401/fabrics/cv01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV04', 'Cream', 'Crushed Velvet CV04 Cream', '#D2CBBE', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339403/fabrics/cv04.jpg', 2),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV05', 'Champagne', 'Crushed Velvet CV05 Champagne', '#C5C0BB', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339405/fabrics/cv05.jpg', 3),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV06', 'Gold', 'Crushed Velvet CV06 Gold', '#D5CABC', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339406/fabrics/cv06.jpg', 4),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV07', 'Mink', 'Crushed Velvet CV07 Mink', '#CFC7C0', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339408/fabrics/cv07.jpg', 5),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV08', 'Brown', 'Crushed Velvet CV08 Brown', '#2F201E', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339410/fabrics/cv08.jpg', 6),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV09', 'Teal', 'Crushed Velvet CV09 Teal', '#022C35', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339413/fabrics/cv09.jpg', 7),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV10', 'Denim Blue', 'Crushed Velvet CV10 Denim Blue', '#BECEDA', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339414/fabrics/cv10.jpg', 8),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV11', 'Red', 'Crushed Velvet CV11 Red', '#CC092F', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339417/fabrics/cv11.jpg', 9),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV13', 'Black', 'Crushed Velvet CV13 Black', '#050505', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339418/fabrics/cv13.jpg', 10),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV14', 'Aubergine', 'Crushed Velvet CV14 Aubergine', '#38020F', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339421/fabrics/cv14.jpg', 11),
  ((select id from public.fabric_collections where slug = 'crushed-velvet'), 'CV15', 'Pewter', 'Crushed Velvet CV15 Pewter', '#35322D', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339423/fabrics/cv15.jpg', 12)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('Naple', 'naple', 'naple-fabric', 4)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'naple'), 'NP01', 'Cream', 'NP01 Naple Cream', '#CBC3B3', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339426/fabrics/np01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP02', 'Beige', 'NP02 Naple Beige', '#C7BCAA', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339427/fabrics/np02.jpg', 2),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP03', 'Sand', 'NP03 Naple Sand', '#CFC2AE', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339429/fabrics/np03.jpg', 3),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP04', 'Mink', 'NP04 Naple Mink', '#795E4C', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339431/fabrics/np04.jpg', 4),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP05', 'Seal Grey', 'NP05 Naple Seal Grey', '#837D72', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339433/fabrics/np05.jpg', 5),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP06', 'Silver', 'NP06 Naple Silver', '#787571', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339435/fabrics/np06.jpg', 6),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP07', 'Slate Grey', 'NP07 Naple Slate Grey', '#7B6D6A', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339437/fabrics/np07.jpg', 7),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP08', 'Charcoal', 'NP08 Naple Charcoal', '#66737C', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339439/fabrics/np08.jpg', 8),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP09', 'Blue', 'NP09 Naple Blue', '#064E78', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339441/fabrics/np09.jpg', 9),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP10', 'Purple', 'NP10 Naple Purple', '#331C2E', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339443/fabrics/np10.jpg', 10),
  ((select id from public.fabric_collections where slug = 'naple'), 'NP11', 'Black', 'NP11 Naple Black', '#1F1E22', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339445/fabrics/np11.jpg', 11)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('Marble', 'marble', 'fabrics', 5)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'marble'), 'MB01', 'Silver', 'MB01 Marble Silver', '#C6C7C1', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339447/fabrics/mb01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB02', 'Platinum', 'MB02 Marble Platinum', '#D4D0CD', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339450/fabrics/mb02.jpg', 2),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB03', 'Steel', 'MB03 Marble Steel', '#837B7A', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339452/fabrics/mb03.jpg', 3),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB04', 'Gunmetal', 'MB04 Marble Gunmetal', '#6D727E', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339454/fabrics/mb04.jpg', 4),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB05', 'Oatmeal', 'MB05 Marble Oatmeal', '#C7BEAC', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339456/fabrics/mb05.jpg', 5),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB06', 'Mink', 'MB06 Marble Mink', '#C4B6A4', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339458/fabrics/mb06.jpg', 6),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB07', 'Stone', 'MB07 Marble Stone', '#7F6352', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339460/fabrics/mb07.jpg', 7),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB08', 'Ocean', 'MB08 Marble Ocean', '#597C8C', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339462/fabrics/mb08.jpg', 8),
  ((select id from public.fabric_collections where slug = 'marble'), 'MB09', 'Peacock', 'MB09 Marble Peacock', '#047379', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339464/fabrics/mb09.jpg', 9)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;

insert into public.fabric_collections (name, slug, supplier_handle, sort) values
  ('PVC Leather', 'pvc-leather', 'pvc-leather-fabric', 6)
on conflict (slug) do update set name = excluded.name, supplier_handle = excluded.supplier_handle, sort = excluded.sort;

insert into public.fabrics (collection_id, code, name, supplier_title, hex, image_url, sort) values
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC01', 'White', 'PVC 01 White', '#BEBFC1', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339466/fabrics/pvc01.jpg', 1),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC02', 'Cream', 'PVC 02 Cream', '#888070', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339467/fabrics/pvc02.jpg', 2),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC03', 'Pink', 'PVC 03 Pink', '#D97D8D', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339469/fabrics/pvc03.jpg', 3),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC04', 'Red', 'PVC 04 Red', '#D8585C', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339470/fabrics/pvc04.jpg', 4),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC05', 'Blue', 'PVC 05 Blue', '#3B567E', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339472/fabrics/pvc05.jpg', 5),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC06', 'Silver', 'PVC 06 Silver', '#BEC8CF', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339474/fabrics/pvc06.jpg', 6),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC07', 'Brown', 'PVC 07 Brown', '#241817', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339476/fabrics/pvc07.jpg', 7),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC08', 'Black', 'PVC 08 Black', '#25262B', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339478/fabrics/pvc08.jpg', 8),
  ((select id from public.fabric_collections where slug = 'pvc-leather'), 'PVC09', 'Grey', 'PVC 09 Grey', '#778187', 'https://res.cloudinary.com/dmlna04yk/image/upload/v1788339480/fabrics/pvc09.jpg', 9)
on conflict (collection_id, code) do update set
  name = excluded.name, supplier_title = excluded.supplier_title,
  hex = excluded.hex, image_url = excluded.image_url, sort = excluded.sort;