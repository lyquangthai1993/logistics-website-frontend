# FRONTEND AI AGENT INSTRUCTIONS (Next.js 14+ TMS)

## 1. BASE REPO & MODIFICATIONS
- Base: `Kiranism/next-shadcn-dashboard-starter` (Next.js App Router, Tailwind, Shadcn UI).
- REMOVAL: Xóa bỏ hoàn toàn Clerk Auth dependencies (`@clerk/nextjs`, Clerk Middleware, Clerk Components).
- ADDITION: Tự dựng JWT Auth Flow:
  - `src/proxy.ts`: Chặn route theo Token & Role trong Cookie/Session (Next.js 16+ proxy convention).
  - `src/lib/api-client.ts`: Axios / Fetch instance tự động attach `Authorization: Bearer <token>` và xử lý Refresh Token interceptor.
  - State: `useAuthStore` (Zustand) lưu User profile & Roles.

## 2. NAVIGATION & RBAC ROUTING
- `/dashboard/overview`: Dashboard số liệu theo Role.
- `/dashboard/orders`: (Dispatcher/Super Admin) Lập đơn, import đơn từ Excel/CSV mẫu phiếu yêu cầu, phân loại hàng.
- `/dashboard/trips`: (Dispatcher/Fleet) Gom đơn thành chuyến, gán biển số xe, tài xế, tính toán khối lượng/m3 tải.
- `/dashboard/warehouse`: (Warehouse Manager) Check-in nhận hàng từ xe gom, check-out xuất hàng lên xe đường dài.
- `/dashboard/fleet`: (Fleet Manager) Danh mục xe, bảo dưỡng, trạng thái xe rảnh/bận.
- `/dashboard/admin`: (Super Admin) Quản lý User, phân quyền chi nhánh/kho, cấu hình đơn giá chuyến.

## 3. UI/UX GUIDELINES (SHADCN UI)
- Data Table: Sử dụng `@tanstack/react-table` hỗ trợ: Filter đa điều kiện (Kho, Xe, Trạng thái), Pagination, Bulk Action (Gom nhiều đơn vào 1 chuyến xe).
- Forms: `react-hook-form` + `zod`. Hỗ trợ nhập nhanh thông tin lấy/giao hàng, tự động tính tổng Kg và $m^3$.
- Layout: Responsive, Sidebar collapse, Theme Dark/Light chuẩn Shadcn.
- Feedback: Toast notification khi có thông báo đơn mới từ WebSocket / SSE.