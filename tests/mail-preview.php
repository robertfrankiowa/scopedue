<?php
declare(strict_types=1);
/* 1.21.0: every kind of email api.php sends, as the letter mail_html builds from its text, on one page.
   php tests/mail-preview.php [out.html]   (default: mail-preview.html next to this file; open it in a browser)
   The texts come from the builders themselves where they need no database, else are written the way api.php writes them. */
define('SD_NO_MAIN', true);
require __DIR__ . '/../api.php';

$st = ['id' => 1, 'name' => 'Maya Chen', 'email' => 'maya@lumen.studio', 'slug' => 'lumen', 'created_at' => 0, 'status' => 'active',
    'profile' => json_encode(['biz' => 'Lumen Studio', 'name' => 'Maya Chen', 'tone' => 2, 'lang' => 'vi'])];
$cl = ['id' => 1, 'contact' => 'Mai Võ', 'email' => 'mai@lotus.vn', 'lang' => 'vi'];
$clEn = ['lang' => 'en'] + $cl;
$url = 'https://client.scopedue.com/#s=lumen&k=sdl_8f3a1c0e9b7d4a2f6e5c3b1a0d9e8f7a';
$S = ['brand' => 'studio', 'name' => 'Lumen Studio', 'tone' => 2, 'reply' => true];
$O = ['brand' => 'scopedue'];
$mails = [];
foreach (['vi' => 'Nguyễn Văn Bảo', 'en' => 'Robert Frank'] as $lg => $nm) { [$sub, $b, $wl] = welcome_text($nm, $lg); $mails[] = ["Owner · welcome ($lg)", $sub, $b, $O + $wl]; }   // 1.32.1 (146)
[$sub, $b] = link_mail($st, $cl, $url, 'Lumen Studio đã chia sẻ Cửa hàng online với bạn', 'Mai', 14); $mails[] = ['Client · portal link (vi)', $sub, $b, $S];
[$sub, $b] = link_mail($st, $clEn, $url, 'Lumen Studio shared Online store with you', 'Mai', 14); $mails[] = ['Client · portal link (en)', $sub, $b, $S];
$mails[] = ['Client · approval code', 'Mã duyệt ScopeDue của bạn', "Mã duyệt của bạn là 482913\n\nBạn đang duyệt Phạm vi v1 cho Cửa hàng online với Lumen Studio.\nMã có hiệu lực trong 10 phút.\nChúng tôi ghi lại thời gian và địa chỉ IP của bạn cùng với lần duyệt.\n\nNếu bạn không yêu cầu, hãy bỏ qua email này. Không có gì được duyệt nếu thiếu mã.\n", $S];
$mails[] = ['Client · delivered, for review', 'Thiết kế đã sẵn sàng để bạn xem', hi_line('vi', 'Mai') . "\n\nLumen Studio đã bàn giao Thiết kế cho Cửa hàng online.\n\nBản thiết kế trang chủ và trang sản phẩm, có cả bản mobile.\n\nXem tại: https://figma.com/file/abc123\n\nBạn có đến 13 thg 11 để chấp nhận, yêu cầu chỉnh sửa, hoặc chỉ ra điểm không đúng thoả thuận. Nếu đến lúc đó không có phản hồi, bản bàn giao được coi là đã chấp nhận.\n\nMở cổng của bạn:\n$url\n\nLiên kết này có hiệu lực trong 14 ngày.\n", $S];
$mails[] = ['Client · paused', 'Lumen Studio paused the work on Online store', hi_line('en', 'Mai') . "\n\nLumen Studio paused the work on Online store.\n\nReason: We are waiting for the product photos.\n\nDelivery dates move by the days the work is paused.\n\nOpen your portal:\n$url\n\nThis link works for 14 days.\n", $S];
$mails[] = ['Client · removed from portal', 'Lumen Studio đã gỡ Cửa hàng online khỏi cổng của bạn', hi_line('vi', 'Mai') . "\n\nLumen Studio đã gỡ Cửa hàng online khỏi cổng khách hàng của bạn. Bạn không còn trả lời, duyệt hay nghiệm thu gì trong dự án đó được nữa.\n\nHồ sơ của dự án (các phiên bản Phạm vi, thay đổi, báo giá, phê duyệt và bàn giao) được giữ đến 3 thg 12, sau đó sẽ bị xoá. Để giữ một bản, hãy mở cổng và chọn Tải hồ sơ:\n$url\n\nLiên kết này có hiệu lực đến lúc đó.\n", $S];
$vp = ['name' => 'Ứng dụng đặt lịch']; $w = ['name' => 'Võ Thị Mai', 'lang' => 'vi'];
[$sub, $b] = vlink_mail($st, $vp, $w, 'https://portal.scopedue.com/#k=sdm_1b2c3d4e5f6a7b8c9d0e', false); $mails[] = ['Viewer · invitation', $sub, $b, $S];
[$sub, $b] = vgone_mail($st, $vp, $w); $mails[] = ['Viewer · taken off', $sub, $b, $S];
$mails[] = ['Viewer · answer code', 'Your code to answer on Booking app', "Your code is 507114\n\nIt works for 10 minutes. Enter it on the page to send your answer.\n", $S];
$mails[] = ['Owner · sign-up code', 'Your ScopeDue verification code', "Your ScopeDue verification code is 120934\n\nIt is valid for 10 minutes. You are setting up ScopeDue for maya@lumen.studio.\nIf this was not you, ignore this email: nothing is created or changed without the code.\n", $O];
$mails[] = ['Owner · notice', 'Mai Võ đã duyệt trên Ứng dụng đặt lịch', "Mai Võ đã duyệt trên Ứng dụng đặt lịch\nDự án: Ứng dụng đặt lịch\nThời điểm: 3 thg 11, 14:20\n\nMở ScopeDue để xem.\n", $O];
$mails[] = ['Teammate · Drive invitation', 'Maya Chen invited you to Booking app in ScopeDue', hi_line('en', '') . "\n\nMaya Chen (maya@lumen.studio) invited you to Booking app in ScopeDue, as an Editor.\n\nTo join, open this link. Sign in to ScopeDue with this address (an@lumen.studio), and pick the project's files when Google Drive asks:\nhttps://scopedue.com/api/join.html#f=1AbCdEfGh&ids=1x,2y\n\nThe invitation also waits in ScopeDue's bell, with Accept, once you sign in with this address. Google Drive may send its own email about the shared folder too.\n\nThe project is encrypted in Maya Chen's Google Drive; only the people in it can read it.\n\nIf you were not expecting this, you can ignore it.\n", $O];

$h = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ScopeDue emails</title><style>body{margin:0;font:14px system-ui;background:#ddd}h2{margin:28px 20px 8px;font-size:14px}iframe{display:block;width:calc(100% - 40px);height:760px;margin:0 20px;border:0;background:#fff}</style>';
foreach ($mails as [$t, $sub, $b, $look]) $h .= '<h2>' . htmlspecialchars($t) . '</h2><iframe onload="this.style.height=this.contentDocument.body.scrollHeight+\'px\'" srcdoc="' . htmlspecialchars(mail_html($sub, $b, $look), ENT_QUOTES) . '"></iframe>';
$out = $argv[1] ?? __DIR__ . '/mail-preview.html';
file_put_contents($out, $h);
echo count($mails) . " emails -> $out\n";
