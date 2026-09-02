export function formatRelativeCloseTime(closesAt: string | Date | null, closedAt: string | Date | null): string {
  if (closedAt) {
    return 'Poll closed';
  }
  if (!closesAt) {
    return 'No close time set';
  }

  const closeTime = new Date(closesAt).getTime();
  const now = Date.now();
  const diffMs = closeTime - now;

  if (diffMs <= 0) {
    return 'Closed';
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (days > 1) {
    return `closes in ${days} days`;
  }
  if (hours >= 1) {
    return `closes in ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  if (minutes >= 1) {
    return `closes in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return 'closes in less than a minute';
}
