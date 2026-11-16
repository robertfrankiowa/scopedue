SDB.boot().then(function (SDBOOT) {
  /* chosen on the first run: start empty. Where this browser cannot keep data, the choice still holds on every load */
  try { if (!SDBOOT.restored && localStorage.getItem('sd-first') === 'empty') { var sdb0 = SDBOOT; SDBOOT = { restored: false, pick: function () { return []; }, meta: sdb0.meta }; } } catch (e) {}
(function () {
