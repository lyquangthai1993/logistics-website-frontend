# Logistics TMS — Frontend Deployment Guide

Tài liệu hướng dẫn triển khai ứng dụng Frontend Next.js 15+ (App Router) cho hệ thống Quản lý Vận tải & Kho bãi (Logistics TMS).

---

## 1. Môi trường Triển khai (Hosting & Domains)

Frontend được triển khai tự động qua **Vercel** tích hợp trực tiếp với GitHub repository `logistics-website-frontend`:

| Môi trường | Nhánh Git | Target Vercel | URL Triển Khai | Backend API Tương Ứng |
|---|---|---|---|---|
| **Production** | `master` | `production` | [logistics-website-frontend-kappa.vercel.app](https://logistics-website-frontend-kappa.vercel.app) | `https://logistics-website-backend-1.onrender.com` |
| **Dev / Preview** | `dev` | `preview` | [logistics-website-frontend-git-dev-thai-lys-projects.vercel.app](https://logistics-website-frontend-git-dev-thai-lys-projects.vercel.app) | `https://logistics-website-backend-1jho.onrender.com` |
| **Local Dev** | `feature/*` | Localhost | `http://localhost:3000` | `http://localhost:3001` |

---

## 2. Cấu hình Biến Môi Trường (Environment Variables)

Thiết lập trên Vercel Dashboard (**Project Settings** → **Environment Variables**):

| Tên biến | Môi trường `development` | Môi trường `preview` | Môi trường `production` | Mô tả |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | `https://logistics-website-backend-1jho.onrender.com` | `https://logistics-website-backend-1.onrender.com` | URL trỏ tới NestJS Backend API trên Render |

> ⚠️ **Lưu ý**: Hệ thống sử dụng kiến trúc Custom JWT Auth với HTTP-only Cookie (`refreshToken`) và `TokenManager` đồng bộ đa tab qua `BroadcastChannel`. Không cần cấu hình Clerk hay các third-party auth providers bên ngoài.

---

## 3. Kiến trúc Edge Proxy & Điều hướng API (`src/proxy.ts`)

- **Bảo mật Cookie**: Trình duyệt gọi `/api/proxy/*`, Edge Proxy chuyển tiếp request đến Render backend kèm HTTP-only cookie `refreshToken`.
- **Resilient Fallback**: Trong trường hợp biến môi trường chưa kịp nạp, Edge Proxy tự động fallback về domain Production `https://logistics-website-backend-1.onrender.com` và không bao giờ tự ý xóa cookie phiên đăng nhập khi backend đang khởi động.

---

## 4. Quy trình CI/CD & Auto Deploy

1. Mọi commit được push vào nhánh `dev` sẽ tự động trigger bản build **Vercel Preview**.
2. Mọi pull request hoặc merge vào nhánh `master` sẽ tự động trigger bản build **Vercel Production**.
3. Trước khi commit, cần đảm bảo:
   ```bash
   npm run typecheck   # 0 lỗi TypeScript
   npm run build       # Biên dịch thành công Turbopack / Next.js
   ```

---

## 5. Docker Standalone (Tùy chọn Self-Hosting)

`next.config.ts` đã bật `output: 'standalone'` tối ưu hóa cho Docker container:

```bash
# Build Docker Image
docker build -t logistics-frontend:latest .

# Run Container
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=https://logistics-website-backend-1.onrender.com \
  --name logistics-frontend \
  logistics-frontend:latest
```
