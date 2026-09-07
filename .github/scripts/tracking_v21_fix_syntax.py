from pathlib import Path

path = Path('src/utils/orderConversions.ts')
text = path.read_text()
old = """    // Conversion reporting is a server-side business operation, not a caller-
    scoped customer query. Using one service-role client here avoids the
    anonymous customer-confirmation RLS dead end that previously returned
    before Meta, GA4, the audit ledger or Google staging could run.
"""
new = """    // Conversion reporting is a server-side business operation, not a caller-
    // scoped customer query. Using one service-role client here avoids the
    // anonymous customer-confirmation RLS dead end that previously returned
    // before Meta, GA4, the audit ledger or Google staging could run.
"""
if text.count(old) != 1:
    raise SystemExit(f'expected one malformed comment block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('Tracking V2.1 syntax repair applied')
