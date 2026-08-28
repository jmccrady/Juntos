# Juntos

Juntos is a bilingual, privacy-first community transportation network that connects people who need rides with trusted volunteer drivers and dispatchers.

The operating model is inspired by historic mutual-aid carpool networks: volunteer drivers, trusted pickup hubs, dispatching, recurring community routes, and shared responsibility.

## Mission

Help neighbors get to work, medical care, groceries, church, school, and other essential destinations through a lawful, dignified, community-run transportation network.

## Product principles

- English and Spanish from the first screen.
- Never collect immigration status, citizenship status, country of birth, Social Security numbers, political affiliation, or unrelated personal history.
- No public maps of riders or drivers.
- Exact private pickup details are visible only to the rider, assigned driver, and authorized dispatchers.
- Keep sensitive trip-location data only as long as operationally necessary.
- Human dispatch remains available when automated matching is not enough.
- No law-enforcement tracking, evasion, or interference features.

## Initial stack

- Next.js 16.3.3
- React 19.2.x
- TypeScript
- Supabase Auth + PostgreSQL + Row Level Security
- Mobile-first Progressive Web App

## Sprint 0

1. Establish the Next.js/TypeScript foundation.
2. Add bilingual routing and content.
3. Configure Supabase browser/server clients.
4. Create the initial database schema and RLS policies.
5. Build Welcome -> Rider Signup -> Request a Ride.
6. Add CI and security checks before expanding the product.

## Security

Treat all rider movement information as sensitive. Never commit production secrets, service-role keys, `.env.local`, real rider data, addresses, or verification artifacts to this repository.

See `SECURITY.md` and `docs/architecture.md` as the project develops.
