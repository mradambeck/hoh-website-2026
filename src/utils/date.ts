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

export function convert12HrTo24Hr(time: string) {
  const timeArr = time.split(/(AM|PM)/);
  if (timeArr[1] === "PM") {
    const [hours, minutes] = timeArr[0].split(":").map(Number);
    return `${hours + 12}:${minutes}:00`;
  }
  return `${timeArr[0].trim()}:00`;
}

export function generateISO(dateStr: string, dateTime?: string) {
  if (dateTime && (dateTime.includes("AM") || dateTime.includes("PM"))) {
    dateTime = convert12HrTo24Hr(dateTime);
  }
  return new Date(`${dateStr} ${dateTime ?? ""}`).toISOString();
}
