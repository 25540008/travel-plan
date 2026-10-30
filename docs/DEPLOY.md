# Deploy Travelplan lên Render + Neon

Backend chạy dạng Node web service, frontend dạng Static Site, database PostgreSQL trên Neon. Cấu hình nằm trong `render.yaml` ở gốc repo. Merge vào `main` là Render tự deploy lại cả hai.

## 1. Tạo database trên Neon

1. Vào https://neon.tech, đăng nhập bằng GitHub, **New Project** tên `travelplan`, region Singapore.
2. Nếu đã có project của bản Java: tạo **branch mới** cho bản Node, không dùng chung dữ liệu cũ (TP-03).
3. Bấm **Connect**, chọn **Prisma**, chép chuỗi `postgresql://...?sslmode=require`. Đây là `DATABASE_URL`.

## 2. Tạo service trên Render

1. Vào https://dashboard.render.com, **New > Blueprint**, chọn repo `25540008/travel-plan`, nhánh `main`. Render đọc `render.yaml` và tạo 2 service: `travelplan-api` và `travelplan-web`.
2. Render hỏi các biến `sync: false`, điền:
   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | Chuỗi Neon ở bước 1 |
   | `CORS_ORIGINS` | Địa chỉ frontend, ví dụ `https://travelplan-web.onrender.com` |
   | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Để trống tới Sprint 4 (quên mật khẩu). Gmail: `smtp.gmail.com` + App Password |
   | `GEMINI_API_KEY` | Không bắt buộc |
   `JWT_SECRET` do Render tự sinh.
3. Bấm **Apply**. Lần build đầu chạy `npm ci && npx prisma migrate deploy` nên tạo đủ bảng trên Neon.
4. Mở `https://travelplan-api.onrender.com/api/health` phải thấy `{"status":"ok"}`.
5. Nếu tên service khác `travelplan-api`, sửa `API_PROD` trong `frontend/js/config.js` cho đúng địa chỉ backend rồi commit.

Nếu đã có sẵn service backend Java trên Render: vào service đó **Settings**, đổi Runtime sang Node, Root Directory `Backend`, Build Command `npm ci && npx prisma migrate deploy`, Start Command `node src/server.js`, Health Check Path `/api/health`, Auto-Deploy `On Commit`, nhánh `main`; rồi thêm các biến ở bảng trên trong **Environment**.

## 3. Dữ liệu mẫu trên production (tuỳ chọn)

Trên máy cá nhân: `cd Backend && DATABASE_URL="<chuỗi Neon>" npm run db:seed`. Lưu ý seed tạo tài khoản demo với mật khẩu công khai trong README.

## Ghi chú

- Gói free của Render ngủ sau 15 phút không có request, lần gọi đầu mất khoảng 30–50 giây.
- Không commit `.env` hay secret. Muốn đổi secret thì sửa trong **Environment** của service trên Render.
