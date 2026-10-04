const thaiDate = new Intl.DateTimeFormat("th-TH", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "Asia/Bangkok",
});

/** Format a date in Thai (Buddhist calendar), e.g. 4 ต.ค. 2569. */
export function formatThaiDate(date: Date | string) {
  return thaiDate.format(typeof date === "string" ? new Date(date) : date);
}

/** Today's date in Bangkok as YYYY-MM-DD (for date inputs). */
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}
