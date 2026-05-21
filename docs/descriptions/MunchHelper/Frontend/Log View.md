# Log View

Log view:

1. Characters created logs
2. Characters changed logs
3. Battles summaries logs with possibility to view the finished battle
4. Room history loads through the Log button on the room screen and reads `GET /logs?roomId=<roomId>` as a bare newest-first array.
5. Older pages use the last loaded entry `id` as `before`; a short or empty page ends pagination.
6. Character events render as `LogEntry` rows with avatar, character name, action labels, per-field update diffs, relative time, and one row-level accessibility label.
7. Empty room history shows `No events recorded yet.` with no call to action.
8. Battle events currently render their summary fallback in `LogEntry`; rich battle rows and completed-battle drill-in are owned by Story 6.7.
