# Kịch bản test tay: client portal

Dùng khi muốn tự tay kiểm tra portal trên trình duyệt, theo góc nhìn của khách hàng. Phần máy làm được thì 5 bộ test tự động đã
kiểm (`p68`, `pt68`, `sec68`, `xss68`, `x68c`: 147 kiểm tra). Kịch bản này dành cho những gì cần mắt người: chữ có tự nhiên không,
nút có dễ thấy không, điện thoại có vừa không, trên host thật có chạy không.

Đánh dấu `[x]` vào từng ô khi thấy đúng. Thấy sai thì ghi lại: bước nào, thấy gì, chụp màn hình.

---

## 0. Chuẩn bị

### Cách 1: trên máy (nên làm trước, đủ mọi trạng thái)

```bash
node tests/portal-local.js
```

Script dựng server thử trên máy (`http://127.0.0.1:8096`) với dữ liệu mẫu, rồi in ra 3 link:

| Link | Khách | Trạng thái có sẵn |
|---|---|---|
| **A** | Công ty An Phát (tiếng Việt) | Phạm vi v1 chờ duyệt |
| **B** | Bloom Café (tiếng Việt) | 2 dự án; Phạm vi đã duyệt; 1 báo giá chờ, 1 câu hỏi đã được trả lời, 1 lần bàn giao chờ xem, 1 việc khách cần gửi |
| **C** | Acme Ltd (tiếng Anh) | Phạm vi v1 chờ duyệt |

Cửa sổ chạy script sẽ hiện **mọi email server gửi**: mã 6 số, link mới, thông báo cho studio. Khi portal bảo "kiểm tra email",
lấy mã ở đó. Mỗi lần chạy lại script, dữ liệu được làm mới từ đầu (link cũ hết dùng được). Dừng: `Ctrl+C`.

Mẹo: mở mỗi link trong **một cửa sổ ẩn danh riêng** (Ctrl+Shift+N), để các khách không lẫn phiên của nhau.

### Cách 2: trên host thật (làm sau, xem phần 9)

Trong ScopeDue (extension), đăng nhập, tạo một khách với **email của chính bạn**, rồi gửi link portal cho khách đó.

---

## 1. Mở portal lần đầu (link A)

- [ ] Mở link A: vào thẳng dự án **Website mới**, không phải nhập gì.
- [ ] Toàn bộ chữ là tiếng Việt (trừ tên người, tên dự án do bạn đặt). Tiêu đề tab: *Website mới · Cổng khách hàng · Robert Studio*.
- [ ] Phần đầu trang có: tên studio, nút **English**, nút giao diện (hình tròn), **Cần trợ giúp?**, chuông, tên khách.
- [ ] Thanh tiến độ 5 bước (Lên phạm vi → … → Bàn giao) đúng bước hiện tại.
- [ ] Bấm F5 (tải lại): vẫn vào được, không bắt mở lại link.
- [ ] Bấm F12 › Console: không có dòng đỏ.

## 2. Duyệt Phạm vi (link A)

- [ ] Thẻ **Duyệt Phạm vi v1** tóm tắt: số sản phẩm bàn giao, việc không bao gồm, số mốc, việc bạn cung cấp, số vòng chỉnh sửa, giá trị hợp đồng.
- [ ] **Đọc toàn bộ Phạm vi**: mở ngăn bên phải, có đủ sản phẩm, mốc, ngày, điều khoản; đóng được bằng nút X và phím Esc.
- [ ] Trong phần điều khoản, mọi câu đều là tiếng Việt (vòng chỉnh sửa, báo giá thay đổi, tạm dừng khi im lặng, báo trễ, kết thúc sớm, quyền sở hữu).
- [ ] **Đặt câu hỏi** về Phạm vi: gõ một câu, gửi. Câu hỏi hiện trong danh sách; cửa sổ script hiện email báo cho studio.
- [ ] Bấm **Duyệt Phạm vi v1**: hiện màn hình nhập mã, email bị che một phần (m•••••@anphat.example).
- [ ] Nhập **sai** mã (000000): báo mã sai, không duyệt.
- [ ] **Gửi lại mã** chỉ bấm được sau 30 giây đếm ngược.
- [ ] Nhập đúng mã từ cửa sổ script, **Xác nhận duyệt**: hiện *Đã duyệt*, có ngày giờ và dấu vân tay; thông báo *Robert Studio đã được báo*.
- [ ] Sau khi duyệt: mục mốc, việc bạn cung cấp và nút **Yêu cầu thay đổi** xuất hiện.
- [ ] **In biên nhận** / **Tải hồ sơ**: mở trang in, đủ thông tin, tiếng Việt.

## 3. Báo giá, câu hỏi, yêu cầu thay đổi (link B)

- [ ] Trang đầu **Dự án của bạn**: mục *Cần bạn* có 4 việc, 2 dự án (Nhận diện thương hiệu, Menu in).
- [ ] Dòng câu hỏi ghi *Câu hỏi về Phạm vi v1* và *CR-002 · Robert Studio đã nhắn cho bạn* (không lẫn tiếng Anh).
- [ ] Mở **CR-002**: thấy câu hỏi của khách và câu trả lời của studio. **Trả lời** được.
- [ ] Mở **CR-001 Thêm bộ icon**: báo giá +$300, +3 ngày, hiệu lực đến một ngày cụ thể.
- [ ] **Đề xuất điều khoản khác**: nhập giá/ngày khác, gửi. Thread hiện đề nghị ngược; studio nhận email.
- [ ] **Từ chối thay đổi này** (trên một báo giá khác hoặc sau khi chạy lại script): hiện *Đã từ chối. Phạm vi và ngày bàn giao của bạn vẫn giữ như đã thống nhất.*
- [ ] Chạy lại script, mở lại B, **Chấp nhận** báo giá CR-001 bằng mã: hiện *Đã duyệt. Robert Studio sẽ thêm nó vào Phạm vi v2…*
- [ ] **Yêu cầu thay đổi** mới: nhập tiêu đề và mô tả, gửi. Xuất hiện CR-003; studio nhận email.
- [ ] Chuông: số việc đúng; bấm một thông báo thì mở đúng chỗ; **Đánh dấu đã đọc hết** làm số về 0, tải lại vẫn giữ.

## 4. Bàn giao và mốc (link B, dự án Nhận diện thương hiệu)

- [ ] Thẻ **Xem lại Bản thiết kế**: lời nhắn của studio, link bàn giao, hạn trả lời.
- [ ] **Tôi muốn chỉnh sửa**: ghi rõ đây là vòng 1/2; gửi được; số vòng còn lại giảm.
- [ ] **Không đúng thoả thuận**: chọn dòng "Xong khi" bị thiếu; gửi được; ghi rõ là không tính vòng.
- [ ] **Chấp nhận Bản thiết kế** bằng mã: mốc chuyển sang đã chấp nhận, có biên nhận.
- [ ] Việc bạn cung cấp **Logo và ảnh sản phẩm** › **Tôi đã gửi**: trạng thái đổi, studio nhận email.
- [ ] **Lịch sử**: mọi việc trên có trong danh sách, đúng thứ tự, đúng giờ.
- [ ] Dự án **Menu in**: Phạm vi riêng chờ duyệt, không lẫn với dự án kia.

## 5. Ngôn ngữ

- [ ] Link B › bấm **English**: cả trang đổi sang tiếng Anh ngay, không tải lại. Tên dự án và tên người giữ nguyên.
- [ ] Tải lại: vẫn tiếng Anh (khách đã tự chọn). Bấm **Tiếng Việt**: về lại tiếng Việt.
- [ ] Link C (khách tiếng Anh): mở bằng tiếng Anh, kể cả khi trình duyệt để tiếng Việt. Email mã duyệt cho Tom bằng tiếng Anh.
- [ ] Gõ chữ có dấu vào các ô nhập (câu hỏi, yêu cầu): giữ nguyên, không bị "dịch" hay đổi.

## 6. Giao diện

- [ ] Nút tròn ở đầu trang › **Giao diện**: chọn Tối / Sáng / **Tự động**. Trang đổi màu ngay, chữ vẫn dễ đọc.
- [ ] Tải lại: giữ lựa chọn. **Tự động** theo chế độ sáng/tối của máy.
- [ ] Portal mẫu theo theme: `http://127.0.0.1:8096/portal.html?demo&theme=ivory` (nền ngà, chữ có chân), `&theme=dark`, `&theme=light.porcelain`.

## 7. Phiên và link

- [ ] Menu tên khách › **Đăng xuất**: màn hình *Bạn đã đăng xuất*. Tiêu đề tab: *Bạn đã đăng xuất · Cổng khách hàng · Robert Studio*.
- [ ] Tải lại sau khi đăng xuất: màn hình *Mở liên kết cổng của bạn* (tiêu đề tab cũng tiếng Việt).
- [ ] Nhập email khách (lan@bloom.example) › **Gửi cho tôi liên kết mới**: báo *Kiểm tra email của bạn*; cửa sổ script hiện link mới; mở link đó vào được.
- [ ] Nhập một email **không phải** của khách: vẫn hiện cùng câu trả lời (không lộ email nào có thật), nhưng **không** có email nào được gửi.
- [ ] Sửa vài ký tự cuối của link rồi mở: không vào được dự án, có màn hình báo và ô xin link mới.

## 8. Điện thoại và trình duyệt khác

- [ ] F12 › biểu tượng điện thoại › iPhone (375px): không phải cuộn ngang; nút English và Cần trợ giúp vừa đầu trang.
- [ ] Trên khổ điện thoại: mở ngăn Phạm vi, nhập mã duyệt, gửi câu hỏi: bàn phím không che nút.
- [ ] Chạy thử nhanh phần 1–2 trên **Edge** và **Firefox**.
- [ ] Phóng to 200% (Ctrl +): không mất chữ, không cuộn ngang.
- [ ] Chỉ dùng bàn phím (Tab, Enter, Esc): đi được hết các nút, luôn thấy ô đang chọn, Esc đóng ngăn và quay về đúng nút.

## 9. Trên host thật (scopedue.com)

Làm sau khi đã tải `api.php`, `portal.html` và thư mục `portal-assets/` lên (xem `DEPLOY-CHECKLIST.md`).

- [ ] `https://<site>/api/api.php?r=/v1/health` trả `"version":"1.4.1"`, `"lang":["en","vi"]`, `"team":true`.
- [ ] Gửi link portal cho email của chính bạn từ ScopeDue: email đến hộp thư thật (xem cả thư rác), tiếng Việt, link là **https**.
- [ ] Mở link: chạy như phần 1–2, F12 › Console không có lỗi CSP.
- [ ] Mã duyệt đến hộp thư thật trong vòng 1 phút; giờ trong email đúng múi giờ của bạn.
- [ ] Studio (bạn) nhận email *… đã duyệt Phạm vi v1*.
- [ ] Mở link trên **iPhone (Safari)** và **Android (Chrome)** thật: đọc Phạm vi, duyệt bằng mã, đổi ngôn ngữ; không có gì nằm dưới tai thỏ hay bàn phím.
- [ ] `portal.html?demo&theme=dark`, `&theme=ivory`, `&theme=light.porcelain` hiện đúng màu và font.

---

Khi đã tick hết phần 1–8 trên máy và phần 9 trên host thật, mọi việc khách hàng làm được trong portal đã được người thử tận tay
ít nhất một lần.
