export function formatDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function isInPast(dateStr?: string) {
  return new Date(`${dateStr}T00:00:00`) < new Date();
}

export function isOlderThanMonths(dateStr: string, months: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return new Date(`${dateStr}T00:00:00`) < cutoff;
}

export function generateISO(dateStr: string, dateTime?: string) {
  // Date time can sometimes be in the format "10:00AM" without a space before AM/PM,
  // so we need to add the space for the Date constructor:
  if (
    dateTime &&
    (dateTime.includes("AM") || dateTime.includes("PM")) &&
    !dateTime.includes(" AM") &&
    !dateTime.includes(" PM")
  ) {
    const timeArr = dateTime.split(/(AM|PM)/);
    dateTime = `${timeArr[0].trim()} ${timeArr[1]}`;
  }
  return new Date(`${dateStr} ${dateTime ?? ""}`).toISOString();
}
