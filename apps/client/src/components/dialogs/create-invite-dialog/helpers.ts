const copyInviteLink = async (link: string) => {
  await navigator.clipboard.writeText(link);
};

export { copyInviteLink };
