# ScopeDue in Vietnamese (v68)

ScopeDue is written in English. `runtime.js` lays another language over the page as it is drawn, from a dictionary.
The English in the code never changes, so a new feature works in Vietnamese the moment its texts are in `vi.tsv`.

| File | What it is |
|---|---|
| `vi.tsv` | Every translation: the English exactly as the app writes it, a TAB, the Vietnamese. About 3,350 texts and 1,700 sentences with blanks. |
| `runtime.js` | The code: choosing and keeping the language, looking texts up, watching the page. `build.py` puts the dictionary into it. |
| `../build.py` | The build (at the top of the release folder; `i18n/build.py` still works and calls it). Puts the dictionary inline in `scopedue_v68.html`; for the extension writes `i18n.js` (the runtime alone) and `i18n-vi.js` (the dictionary, loaded only for Vietnamese); for the portal writes `portal-assets/i18n.js` and `portal-assets/i18n-vi.js` (only the texts the portal can show). |
| `extract.js` | Lists every English text in the page, to see what is new (`node extract.js ../scopedue_v68.html out.json`, needs `npm i acorn acorn-walk parse5`). |

## Changing a translation, or adding one

1. Edit `vi.tsv`. Blanks: `{0}`, `{1}`… stand for what the app fills in (a name, a number, a date). In the Vietnamese, `{0}` puts it
   back translated when the dictionary knows it ("Due {0}" with "today" → "Hạn hôm nay"), `{r0}` puts it back exactly as it is.
   The Vietnamese may drop a blank or change the order.
2. `python3 build.py`
3. Reload the extension in `chrome://extensions`.

## The client portal

The portal gets the same runtime (`portal-assets/i18n.js`) and a smaller dictionary of its own (`portal-assets/i18n-vi.js`, read only in Vietnamese): every text found in the portal's source (`src/portal/`), every line under
`# ---- client portal`, and every line under `# portal-only wording` (those are the portal's alone: where the client should
read something else than the studio, e.g. "With {0}" is "Chờ {0}" in the portal and "Cùng {0}" in the app). Open the demo with
`portal.html?lang=vi&i18ndebug` to find what is missing. The emails the server sends are translated in `api.php` itself (`L()`).

## Finding what is still in English

Open the page with `?lang=vi&i18ndebug` (or set `localStorage['sd.i18ndebug'] = 1` in the extension), use it, then in the console:
`[...__i18nMiss.keys()]`. Names, emails and links are expected there; anything else needs a line in `vi.tsv`.

## Rules the runtime keeps

- **People's words are never translated.** The app hands the runtime every text in its data (`SDI18N.userText`, from
  `sdUTSend` in the page) before the first paint and whenever data changes; typed text counts from the first key. Such a
  text is left as written everywhere: whole, inside a sentence, cut short, in another case. Only codes and the places where the
  app writes its own sentences into the data (`SD_UT_APP` in the page) are not people's words. If a new feature stores an app
  sentence in the data, add its path to `SD_UT_APP`, or it will stay in English (safe, never wrong). `tests/x68t.js` checks it.
- Someone's words of three or more inside a longer text ("Edit Reminder in Vietnamese and English", "You added source [1] ·
  Interview notes · GreenHome") are held aside while the rest is looked up, so no pattern or separator cuts through them.
- Inputs, text areas, editable areas and anything inside `translate="no"` are never touched. Stored data is never rewritten.
- A sentence with little text of its own (`{0} and {1}`) only applies when what fills it is known text, a number or a name.
- Dates (`10 thg 10`), times (24-hour) and "3 days ago" are handled in `runtime.js` (`SPECIAL_VI`), not in `vi.tsv`.
- Text that never reaches the page (the client reminder, the support email, quick find) goes through `SDI18N.t(text)` in the app.
- Parts of the page that are hidden (the app's closed drawers and hidden pages: `SD_LATER` in the build) are translated when they are shown: the app calls `SDI18N.reveal(el)`. Sentence patterns are filed by word and compiled on first use, so a text is tried only against the few that can match.
- In the extension the dictionary is `i18n-vi.js`, read before the app only when it starts in Vietnamese (`boot.js`); `SDI18N.load(lang, then)` fetches it on demand (a switch of language, a reminder to a Vietnamese client).
- A label the page knows is its own (the portal's stage names) goes through `SDI18N.app(text)`: translated even when someone wrote the same words.
- In the page, an element marked `data-sd-app` holds such a label (the client card's Change): its text is translated as a whole even when someone wrote the same word. Only for short labels the app writes, never for text that can hold someone's words.
- Text for someone who reads another language than the page (the reminder to a client whose language is set) goes through `SDI18N.to(lang, text)`.

## Words used throughout

Scope → Phạm vi · release (of a private project) → phiên bản · capacity → quỹ thời gian · drift → phát sinh · override the Gate → làm khác Cổng · ship → ra mắt · Change / change request → Thay đổi / yêu cầu thay đổi · baseline → mốc gốc · trusted → tin cậy ·
issue → phát hành · client portal → cổng khách hàng · Now / Next / Never / Parking Lot / Later → Bây giờ / Kế tiếp / Không làm /
Kho ý tưởng / Để sau · Scope Gate → Cổng Phạm vi · Validate → Kiểm chứng · Thesis → Luận điểm · wedge → điểm khác biệt ·
job → nhu cầu (v74: what the customer wants to get done; "job" stays only where it names the JSON key) · demand → (bằng chứng)
có người cần · Gap check / Gap map → Đánh giá cơ hội / Bản đồ nhu cầu · desk research → tra cứu · served → đã có người làm ·
Worth a test → Đáng thử nghiệm · Me-too → Đã đông đối thủ · Evidence strength → Độ tin cậy · substitute → giải pháp thay thế ·
do-it-yourself option → cách khách đang tự làm · clone → gần giống hệt · Graveyard → Đã đóng cửa · channel → nơi tìm khách ·
Proof → Thử nghiệm · strong interview → buổi phỏng vấn đạt · prompt → prompt (never "lời nhắc": that is a reminder here) ·
milestone → mốc · deliverable → sản phẩm bàn giao · Handoff → Bàn giao · quote → báo giá · counter offer → đề nghị ngược ·
evidence → bằng chứng · fingerprint → dấu vân tay · Owner / Editor / Viewer → Chủ sở hữu / Người chỉnh sửa / Người xem ·
safety code → mã an toàn · team sync → đồng bộ nhóm · To do / Doing / In review / Done / Stuck → Cần làm / Đang làm / Đang duyệt / Xong / Bị kẹt.
The person is "bạn"; sample messages between studio people use "mình".
