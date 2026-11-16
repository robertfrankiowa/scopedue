  /* ---------- the calendar: the one place that knows what today is ----------
     Deadlines are stored as a day (dueAt, local midnight). "Due today", "In 1 day" and "Overdue" are worked out from the real date
     every time, never typed in. */
  var DAY_MS = 864e5, WDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dayStart(t) { var d = new Date(t == null ? Date.now() : t); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
  function dayAdd(n) { var d = new Date(dayStart()); d.setDate(d.getDate() + n); return d.getTime(); }
  function dayLbl(ts) { var d = new Date(ts); return d.getDate() + ' ' + MON[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''); }
  function dayKeyNow() { var d = new Date(); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); }
  function dueInfo(ts) {
    var diff = Math.round((dayStart(ts) - dayStart()) / DAY_MS), lbl = dayLbl(ts);
    if (diff < 0) return { chip: 'crit', t: 'Overdue', d: lbl };
    if (diff === 0) return { chip: 'crit', t: 'Due today', d: lbl };
    if (diff <= 2) return { chip: 'warn', t: 'In ' + diff + (diff === 1 ? ' day' : ' days'), d: lbl };
    return { d: lbl };
  }

