// Puts the server's files into the test server's folder (srv60), as on a real host: api.php, portal.html and portal-assets/.
const fs = require('fs'), path = require('path');
module.exports = (root, srv) => {
  fs.copyFileSync(path.join(root, 'api.php'), path.join(srv, 'api.php'));
  fs.copyFileSync(path.join(root, 'portal.html'), path.join(srv, 'portal.html'));
  fs.rmSync(path.join(srv, 'portal-assets'), { recursive: true, force: true });
  fs.cpSync(path.join(root, 'portal-assets'), path.join(srv, 'portal-assets'), { recursive: true });
};
