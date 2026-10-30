# Cách làm việc của nhóm Travelplan

Thành viên (cả 4 đều là dev): Dương (@25540008), Khôi (@khoi41807-source), Hà (@dnh-uit), Phượng (@phuongtruong282).

Yêu cầu: [docs/SRS.md](docs/SRS.md) (bản Word/PDF trong `docs/`). Việc cần làm: các Issue `[TP-xx]` và [Project board](https://github.com/users/25540008/projects/1).

## Lịch sprint (sprint 1 tuần, Thứ Năm đến Thứ Tư)

| Sprint | Thời gian | Mục tiêu | Use case |
|---|---|---|---|
| S1 · Khởi động và tài khoản | 22/10 – 28/10 | Repo, CI/CD, Docker, migration, khung frontend chung; đăng ký, đăng nhập, đăng xuất | 1–3 |
| S2 · Chuyến đi và lịch trình | 29/10 – 04/11 | Danh sách, tạo, sửa, xoá chuyến, ảnh bìa, chia sẻ; lịch trình theo ngày, thêm/sửa/xoá hoạt động | 13–22 |
| S3 · Ngân sách, thời tiết, lịch trình mẫu | 05/11 – 11/11 | Ngân sách và khoản chi, dự báo thời tiết, Trang chủ, tìm và lọc lịch trình mẫu, dùng lại, lưu | 6, 7, 10–12, 24–27 |
| S4 · Điểm đến và mật khẩu | 12/11 – 18/11 | Danh sách và chi tiết điểm đến, thêm địa điểm gợi ý; quên và đặt lại mật khẩu | 4, 5, 8, 9, 23 |
| S5 · Quản trị, sửa lỗi, phát hành | 19/11 – 24/11 | API và trang quản trị điểm đến, sửa lỗi BE/FE, bảo mật, deploy bản cuối | 28 |

Mốc: demo nội bộ cuối S2 (04/11), đóng băng tính năng cuối S4 (18/11), nộp đồ án 24/11.

## Nhịp Scrum

| Buổi | Khi nào | Nội dung |
|---|---|---|
| Sprint Planning | Thứ Năm đầu sprint, 30 phút | Chọn việc vào sprint, chia người, ước lượng điểm |
| Daily (online) | Mỗi tối, 10 phút | Hôm qua làm gì, hôm nay làm gì, đang vướng gì; kéo thẻ cho đúng cột |
| Sprint Review | Thứ Tư cuối sprint | Demo các thẻ ở cột Done trên bản deploy Render |
| Retrospective | Ngay sau Review, 15 phút | Điều gì tốt, điều gì cần đổi ở sprint sau |

## Cột trên board

- **Todo**: việc đã nhận trong sprint, chưa bắt đầu.
- **In Progress**: mỗi người tối đa 2 thẻ cùng lúc.
- **Review**: đã mở PR, chờ 1 người khác duyệt code hoặc kiểm thử.
- **Done**: đạt Definition of Done bên dưới.

## Definition of Done

1. Code khớp luồng hoạt động và bảng Business Rules của use case trong SRS.
2. Giao diện khớp màn hình thiết kế (Screen 1–14), hiển thị đúng thông báo MSG.
3. PR đã được 1 thành viên khác duyệt và merge vào `dev`; CI xanh.
4. Một thành viên khác đã chạy test case của use case và không còn lỗi P1.
5. Đã chạy được trên bản deploy Render.

## Quy ước Git

- Nhánh: `main` (bản phát hành), `dev` (tích hợp), `feature/TP-xx-mo-ta-ngan` cho từng thẻ. Tên nhánh viết thường, không dấu, nối bằng `-`, không có dấu phẩy hay khoảng trắng (đúng: `feature/TP-14-dang-nhap`; sai: `TP-14-Screen-10-Đăng-nhập,-lưu-token`).
- Không push thẳng lên `main` hay `dev`, luôn đi qua PR.
- Commit trên web GitHub cũng phải đặt message theo mẫu dưới, không để mặc định "Create …" / "Delete …".
- Commit: `TP-14: Screen 10 đăng nhập, lưu token` (mã thẻ ở đầu để tra ngược về board).
- Mô tả PR ghi `Closes #<số issue>` để issue tự đóng và thẻ tự sang Done khi merge.
- Cuối mỗi sprint merge `dev` vào `main` và gắn tag `v0.x`.

## Quy ước đặt tên file

Quy tắc chung: chữ thường, tiếng Việt **không dấu**, các từ nối bằng `-` (kebab-case). Không đặt mã thẻ (`TP-15-…`), tên người hay chữ `screen5` vào tên file; mã thẻ ghi ở commit và PR.

### Trang (frontend/)

- Mọi trang nằm thẳng trong `frontend/` (không đặt ở gốc repo, không tạo thư mục con), link giữa các trang là link tương đối.
- Tên file là tên màn hình trong SRS, không dấu. Danh sách chính thức nằm ở `PAGES` trong `frontend/js/config.js`; trang mới phải thêm vào đó trước, rồi mọi chỗ khác gọi `pageUrl('key')` thay vì gõ tay tên file hay đường dẫn tuyệt đối như `/dang-nhap`.

| Màn hình | File | Key trong `PAGES` |
|---|---|---|
| Screen 1 Trang chủ | `index.html` | `home` |
| Screen 2 Lịch trình mẫu | `lich-trinh-mau.html` | `templates` |
| Screen 3 Điểm đến | `diem-den.html` | `destinations` |
| Screen 4 Chi tiết điểm đến | `diem-den-chi-tiet.html?slug=` | `destinationDetail` |
| Screen 5 Chuyến đi của tôi | `chuyen-di-cua-toi.html` | `myTrips` |
| Screen 6 Tạo chuyến | `tao-chuyen.html` | `createTrip` |
| Screen 7, 9 Chuyến đi (lịch trình, ngân sách) | `chuyen-di.html?id=` | `trip` |
| Screen 10 Đăng nhập | `dang-nhap.html` | `login` |
| Screen 11 Tạo tài khoản | `dang-ky.html` | `register` |
| Screen 12 Quên mật khẩu | `quen-mat-khau.html` | `forgotPassword` |
| Đặt mật khẩu mới | `dat-lai-mat-khau.html` | `resetPassword` |

- File bắt đầu bằng `_` là file mẫu, không phải trang thật (ví dụ `_mau-trang.html`). Trang mới chép từ file này.

### CSS và JS (frontend/css, frontend/js)

- Dùng chung trước: `tokens.css`, `base.css`; `api.js`, `auth.js`, `config.js`, `ui.js`, `layout.js`, `messages.js`, `format.js`. Không viết lại header, popup, toast, lưu token… trong từng trang.
- File riêng của một nhóm màn hình đặt theo chức năng, kebab-case tiếng Anh ngắn gọn như các file chung: ví dụ `css/auth.css` (Screen 10, 11), `js/password.js`. Không đặt `script-TP-15.js`, `TP-15-script.js`.
- Script riêng của một trang: viết `<script type="module">` ngay trong trang, hoặc tách thành `js/pages/<ten-trang>.js` cùng tên với file HTML (ví dụ `js/pages/chuyen-di.js` cho `chuyen-di.html`).
- Import luôn dùng đường dẫn tương đối có `./` và đuôi `.js`: `import { api } from './api.js'` (không viết `'js/api.js'`).
- Token chỉ đọc/ghi qua `auth.js` (key `tp_token`, `tp_user`); không tự đặt key khác như `jwt`, `token`.

### Backend (Backend/src)

- Mỗi module một bộ file cùng tên, theo đúng lớp: `routes/<module>.routes.js`, `controllers/<module>.controller.js`, `services/<module>.service.js`. Tên module tiếng Anh, camelCase nếu nhiều từ (`trip`, `itineraryItem`, `tripAccess`).
- Middleware và tiện ích: camelCase (`rateLimit.js`, `validators.js`); file chỉ chứa một class đặt PascalCase theo tên class (`AppError.js`).
- Test: `tests/<module>.test.js`; test cần PostgreSQL thật đặt `<module>.db.test.js`.
- Đường dẫn API giữ đúng SRS mục 8.4, kebab-case, danh từ số nhiều (`/api/trips/:id/expenses`, `/api/auth/forgot-password`).

### Tài liệu và ảnh

- Ảnh, tài liệu: kebab-case không dấu, ảnh màn hình có số thứ tự Screen ở đầu (`docs/screens/10-dang-nhap.png`, `Backend/database/erd-travel-planner.jpeg`).
- Ngoại lệ giữ nguyên: file theo quy ước của công cụ (`README.md`, `CONTRIBUTING.md`, `Dockerfile`, `docker-compose.yml`, migration Prisma) và tên bảng, cột trong DB (snake_case như `travel_planner.sql`, `itinerary_items`).

## Label

- `BE` / `FE`: loại việc. `P1` (bắt buộc) / `P2` / `P3` (làm nếu còn thời gian): ưu tiên.
- `module: …`: mảng chức năng (Tài khoản, Chuyến đi, Lịch trình, Ngân sách, …).
- Milestone = sprint, có hạn chót của sprint.
