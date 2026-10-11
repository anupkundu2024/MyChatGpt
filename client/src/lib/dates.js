const DAY = 24 * 60 * 60 * 1000;

const GROUP_ORDER = ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Older'];

/**
 * Groups the sidebar list like ChatGPT: pinned chats first, then by last activity.
 * Returns [{ label, conversations }] in display order, skipping empty groups.
 */
export function groupConversations(conversations, now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const groups = new Map(GROUP_ORDER.map((label) => [label, []]));

  for (const c of conversations) {
    const t = new Date(c.updatedAt).getTime();
    const label = c.pinned
      ? 'Pinned'
      : t >= startOfToday
        ? 'Today'
        : t >= startOfToday - DAY
          ? 'Yesterday'
          : t >= startOfToday - 7 * DAY
            ? 'Previous 7 days'
            : 'Older';
    groups.get(label).push(c);
  }

  return GROUP_ORDER.filter((label) => groups.get(label).length).map((label) => ({
    label,
    conversations: groups.get(label),
  }));
}
