# Travelplan

Website lên kế hoạch chuyến đi: lịch trình theo ngày, ngân sách, lịch trình mẫu, điểm đến. Đồ án môn Internet và Công nghệ Web.

- Yêu cầu: [docs/SRS.md](docs/SRS.md) (bản Word/PDF trong `docs/`)
- Cách làm việc nhóm, sprint, quy ước Git: [CONTRIBUTING.md](CONTRIBUTING.md)
- Board: https://github.com/users/25540008/projects/1

| Thư mục | Nội dung |
|---|---|
| `Backend/` | API Node.js 20 + Express + Prisma + PostgreSQL |
| `frontend/` | HTML/CSS/JS thuần, mỗi màn hình một file `.html` |
| `docs/` | SRS, ảnh màn hình thiết kế |

## Chạy bằng Docker (khuyên dùng)

Cần Docker Desktop.

```bash
docker compose up -d --build
```

| Dịch vụ | Địa chỉ |
|---|---|
| Frontend | http://localhost:8080 |
| Trang mẫu component | http://localhost:8080/_mau-trang.html |
| Backend | http://localhost:3000/api/health |
| PostgreSQL | `localhost:5432`, user `postgres`, mật khẩu `postgres`, db `travelplan` |

Tài khoản demo (tạo bởi `prisma/seed.js` mỗi lần backend khởi động): **demo@travelplan.vn / Demo@123**, có sẵn chuyến "Đà Lạt chill cuối tuần" 23–25/10/2026, ngân sách 5.000.000đ, đã chi 2.780.000đ.

Lệnh hay dùng: `docker compose logs -f backend`, `docker compose down` (giữ dữ liệu), `docker compose down -v` (xoá sạch database).

## Chạy không dùng Docker

1. Cần Node.js 20+ và một PostgreSQL 16. Cách nhanh: chỉ bật database bằng Docker `docker compose up -d db`, hoặc cài Postgres.app (Mac) / PostgreSQL installer (Windows).
2. Backend:
   ```bash
   cd Backend
   cp .env.example .env        # sửa DATABASE_URL nếu cần
   npm install
   npx prisma migrate dev      # tạo bảng
   npm run db:seed             # dữ liệu mẫu
   npm run dev                 # nodemon, http://localhost:3000/api/health
   ```
3. Frontend: mở thư mục `frontend/` bằng Live Server của VS Code (cổng 5500) hoặc chép vào `htdocs` của XAMPP. Khi chạy ở `localhost`, `js/config.js` tự gọi API `http://localhost:3000/api`.

## Lệnh backend

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy server, tự reload |
| `npm test` | Jest + Supertest (test cần DB tự bỏ qua nếu không có `DATABASE_URL`) |
| `npm run lint` | ESLint |
| `npx prisma migrate dev --name <ten>` | Tạo migration mới sau khi sửa `prisma/schema.prisma` |
| `npm run db:seed` | Nạp lại dữ liệu mẫu |
| `npm run db:studio` | Xem/sửa dữ liệu bằng Prisma Studio |

## Cấu trúc backend

```
Backend/
  prisma/schema.prisma      bảng dữ liệu; prisma/migrations/ được commit
  prisma/seed.js            dữ liệu mẫu
  src/server.js             khởi động server
  src/app.js                middleware chung, gắn /api
  src/routes/               *.routes.js: đường dẫn + validate + auth
  src/controllers/          đọc req, gọi service, trả JSON
  src/services/             làm việc với Prisma
  src/middlewares/          auth, requireRole, validate, errorHandler
  src/utils/                AppError, bảng MSG, jwt, helper zod
  tests/                    *.test.js
```

Route mẫu để chép khi làm thẻ BE mới: `src/routes/example.routes.js` (chỉ bật khi không phải production, tại `/api/_example/trips`).

Quy ước response:

- Thành công: trả dữ liệu trực tiếp, ví dụ `[{ "id": 1, ... }]` hoặc `{ "id": 1, ... }`.
- Lỗi: `{ "code": "MSG 7", "message": "Email này đã có tài khoản. Đăng nhập luôn?" }`, lỗi form có thêm `errors: [{ field, code, message }]`. Mã HTTP 400/401/403/404/409/429/500.
- 401 luôn là `MSG 10`; frontend tự hiện popup và chuyển về đăng nhập.
- Chuyến không thuộc người dùng trả 404 (CBR 8): dùng `getOwnedTripOrThrow` trong `src/services/tripAccess.service.js`.

## Frontend dùng chung

Trang mới chép từ `frontend/_mau-trang.html`:

```html
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/base.css">
<body data-page="myTrips">
  <div id="site-header"></div>
  <main>...</main>
  <div id="site-footer"></div>
  <script type="module" src="js/layout.js"></script>
  <script type="module" src="js/trang-cua-ban.js"></script>
```

| File | Dùng cho |
|---|---|
| `css/tokens.css` | Màu, font, bo góc, khoảng cách (Screen 13) |
| `css/base.css` | Nút, chip, ô nhập, thẻ, header/footer, toast, popup |
| `js/config.js` | `API_BASE`, tên file từng màn hình (`pageUrl('trip', { id })`) |
| `js/api.js` | `get/post/put/del` gắn JWT, lỗi thành `ApiError`, 401 → MSG 10 |
| `js/auth.js` | `saveSession`, `requireLogin`, `goAfterLogin`, `takePendingAction` (CBR 3) |
| `js/ui.js` | `toast`, `confirmDialog`, `bindForm`, `applyServerErrors` (CBR 1) |
| `js/format.js` | `formatMoney`, `formatMoneyShort`, `formatDate`, `formatTime`, `formatDuration` (CBR 9) |
| `js/messages.js` | Bảng MSG |

## Deploy (Render + Neon)

Xem [docs/DEPLOY.md](docs/DEPLOY.md).

## Cách đóng góp

Tóm tắt từ [CONTRIBUTING.md](CONTRIBUTING.md):

1. Nhận thẻ trên board, tạo nhánh từ `dev`: `feature/TP-xx-mo-ta-ngan`.
2. Commit dạng `TP-xx: mô tả ngắn`.
3. Mở PR vào `dev`, điền mẫu PR, ghi `Closes #<số issue>`. Cần CI xanh và 1 người duyệt.
