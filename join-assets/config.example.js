/* Copy to config.js next to this file (it is not committed; the build copies it to scopedue.com when it exists).
   The API key must be restricted to both Google Picker API and Google Drive API, and its website restrictions must include
   https://docs.google.com/* plus each join page origin (https://scopedue.com/* and http://localhost:8765/* for testing).
   The OAuth client must list the same application origins as JavaScript origins. */
window.SD_JOIN_CFG = { apiKey: '', appId: '', clientId: '', origins: [] };
