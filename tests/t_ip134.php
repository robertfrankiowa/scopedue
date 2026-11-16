<?php
/* api.php 1.31.2 (CONTRACT 134): whose address client_ip() takes. Run: php tests/t_ip134.php
   It loads api.php without running it (SD_NO_MAIN), twice: once with no config (scopedue.com: ip_header empty), once from a copy in a
   temporary folder whose config.php names an ip_header. Each case sets REMOTE_ADDR and the headers, then asks client_ip() */
$root = dirname(__DIR__);
$cases = [
    // [what, REMOTE_ADDR, headers, want]
    ['through a Cloudflare edge (IPv4): the visitor', '172.68.10.20', ['HTTP_CF_CONNECTING_IP' => '203.0.113.7'], '203.0.113.7'],
    ['through a Cloudflare edge (IPv6): the visitor', '2606:4700:3037::1', ['HTTP_CF_CONNECTING_IP' => '2001:db8::42'], '2001:db8::42'],
    ['straight to the server with a forged header: the caller', '198.51.100.9', ['HTTP_CF_CONNECTING_IP' => '203.0.113.7'], '198.51.100.9'],
    ['a Cloudflare edge with a header that is no address: the edge', '172.68.10.20', ['HTTP_CF_CONNECTING_IP' => 'not-an-ip'], '172.68.10.20'],
    ['a Cloudflare edge without the header: the edge', '172.68.10.20', [], '172.68.10.20'],
    ['a local proxy with the Cloudflare header (no ip_header): REMOTE_ADDR', '127.0.0.1', ['HTTP_CF_CONNECTING_IP' => '203.0.113.7'], '127.0.0.1'],
];
$named = [
    ['ip_header from a local proxy: the header', '10.0.0.5', ['HTTP_X_REAL_IP' => '203.0.113.8'], '203.0.113.8'],
    ['ip_header from a Cloudflare edge: the header', '162.158.1.1', ['HTTP_X_REAL_IP' => '203.0.113.8'], '203.0.113.8'],
    ['ip_header straight from the internet: the caller, not the header', '198.51.100.9', ['HTTP_X_REAL_IP' => '203.0.113.8'], '198.51.100.9'],
    ['ip_header with a list: the last entry (our proxy\'s)', '10.0.0.5', ['HTTP_X_REAL_IP' => '1.2.3.4, 203.0.113.9'], '203.0.113.9'],
];
$country = [
    ['CF-IPCountry from a Cloudflare edge', '172.68.10.20', ['HTTP_CF_IPCOUNTRY' => 'VN'], 'VN'],
    ['CF-IPCountry from a local proxy', '127.0.0.1', ['HTTP_CF_IPCOUNTRY' => 'VN'], 'VN'],
    ['CF-IPCountry straight from the internet: none', '198.51.100.9', ['HTTP_CF_IPCOUNTRY' => 'VN'], ''],
];

/* each set runs in a PHP process of its own, since cfg() reads config.php once */
if (($argv[1] ?? '') === 'run') {
    define('SD_NO_MAIN', true);
    require $argv[2];
    $set = json_decode(base64_decode($argv[3]), true); $fn = $argv[4]; $out = [];
    foreach ($set as [$what, $remote, $hd, $want]) {
        foreach (array_keys($_SERVER) as $k) if (str_starts_with($k, 'HTTP_')) unset($_SERVER[$k]);
        $_SERVER['REMOTE_ADDR'] = $remote; foreach ($hd as $k => $v) $_SERVER[$k] = $v;
        $got = $fn();
        $out[] = [$what, $got === $want, $got, $want];
    }
    echo json_encode($out);
    exit;
}
$php = PHP_BINARY; $ext = getenv('SD_PHP_EXT'); $pre = $ext ? ['-d', 'extension_dir=' . $ext, '-d', 'extension=mbstring', '-d', 'extension=openssl'] : [];
$tmp = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'sd-ip134-' . bin2hex(random_bytes(4)); mkdir($tmp);
copy("$root/api.php", "$tmp/api.php");
file_put_contents("$tmp/config.php", "<?php return ['ip_header' => 'HTTP_X_REAL_IP'];");
$run = static function (string $api, array $set, string $fn) use ($php, $pre): array {
    $cmd = implode(' ', array_map('escapeshellarg', array_merge([$php], $pre, [__FILE__, 'run', $api, base64_encode(json_encode($set)), $fn])));
    $o = json_decode((string)shell_exec($cmd), true);
    return is_array($o) ? $o : [['php did not answer for ' . $fn, false, null, null]];
};
$all = array_merge($run("$root/api.php", $cases, 'client_ip'), $run("$tmp/api.php", $named, 'client_ip'), $run("$root/api.php", $country, 'activity_country'));
unlink("$tmp/api.php"); unlink("$tmp/config.php"); rmdir($tmp);
$fails = 0;
foreach ($all as [$what, $ok, $got, $want]) { echo ($ok ? 'PASS ' : 'FAIL ') . $what . ($ok ? '' : " :: got $got, want $want") . "\n"; if (!$ok) $fails++; }
echo "\n" . (count($all) - $fails) . '/' . count($all) . " passed\n";
exit($fails ? 1 : 0);
