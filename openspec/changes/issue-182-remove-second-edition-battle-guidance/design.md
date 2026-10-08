# Design

## Context

The battle route currently renders a Second Edition-only guidance block above the editor. The Rules route independently renders the same localized combat guidance and notice. This change affects presentation only.

## Goals / Non-Goals

**Goals:** Remove the redundant guidance block from the Second Edition battle route and retain the Rules route content.

**Non-Goals:** Change rules copy, translation catalogs, Classic battle behavior, battle calculations, or recorded outcomes.

## Decisions

Remove the conditional guidance view from the battle route and its now-unused styles/imports if applicable. Replace route assertions that require the block with assertions that it is absent for Second Edition and that Classic presentation remains unchanged. The dedicated Rules route continues to own and test the guidance content.

## Risks / Trade-offs

- Removing the only battle-route assertions could leave the retained Rules content unprotected → Keep or add assertions in the Rules route suite for the combat body and notice.

## Migration Plan

No data or client migration is needed. The route update takes effect with the next frontend release; rollback is a frontend code revert.
