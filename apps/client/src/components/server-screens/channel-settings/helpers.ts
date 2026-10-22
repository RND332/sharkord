// the channel is refetched after every update, the saved values are applied once per channel
// so a refetch does not drop the edits of the user before they are saved or discarded
const shouldApplyChannelValues = (
  initializedChannelId: number | null,
  channelId: number
) => initializedChannelId !== channelId;

export { shouldApplyChannelValues };
