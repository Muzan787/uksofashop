-- The "3+2-Seater" category slug contained a literal plus sign, which every
-- URL it appeared in had to percent-encode as %2B. That produced ugly links in
-- search results and in anything that shares a URL as plain text
-- (/shop/3%2B2-Seater/verona-high-back-3and2-seater), and the plus is also
-- read as a space by anything that decodes it as a query string rather than a
-- path segment - the reason the category lookup carried a "slugWithPlus"
-- fallback.
--
-- The new slug matches the convention every other category already uses:
-- lowercase, hyphen-separated, ASCII only.
--
-- Old URLs are not dropped: src/utils/productUrl.ts keeps a LEGACY_CATEGORY_SLUGS
-- map and the category page issues a permanent redirect from the old slug.

update categories
set slug = '3-2-seater'
where slug = '3+2-Seater';
