import { getRoomMetadata, type RoomTypeId } from '@/api/rooms';
import { useQuery } from '@tanstack/react-query';

export function useRoomEdition(roomId: string | undefined, routeHint?: string) {
  const query = useQuery({
    queryKey: ['roomMetadata', roomId],
    queryFn: ({ signal }) => getRoomMetadata(roomId!, signal),
    enabled: Boolean(roomId),
  });
  const confirmedRoomTypeId: RoomTypeId | undefined = query.data?.roomTypeId;
  const hintedRoomTypeId = routeHint === 'munchkin' || routeHint === 'munchkin-2e' ? routeHint : undefined;

  return {
    roomTypeId: confirmedRoomTypeId ?? hintedRoomTypeId,
    confirmedRoomTypeId,
  };
}
