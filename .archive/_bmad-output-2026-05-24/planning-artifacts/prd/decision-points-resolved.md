# Decision Points (Resolved)

- Battle scope depth: **Phase 1 supports the documented battle lifecycle only** — no richer battle history or secondary battle analysis in this release. `battle_updated` is not logged; log captures lifecycle events only (ADR-5).
- Log detail depth: **Logs remain focused on character events and battle summaries** — specifically character_created, character_updated, character_deleted, battle_started, battle_concluded, and battle_discarded. Broader room-event coverage is deferred beyond Phase 1 (ADR-5).
- Web parity threshold: **Minor UX limitations are acceptable provided complete core capability coverage is maintained.** No supported platform may ship with a materially incomplete core session workflow (NFR8). Release parity is validated through an explicit cross-platform readiness checklist (Story 7.6, NFR9, NFR11).
