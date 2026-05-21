# Log View

Log view:

1. Characters created logs
2. Characters changed logs
3. Battles summaries logs with possibility to view the finished battle
4. Room history loads through the Log button on the room screen and reads `GET /logs?roomId=<roomId>` as a bare newest-first array.
5. Older pages use the last loaded entry `id` as `before`; a short or empty page ends pagination.
