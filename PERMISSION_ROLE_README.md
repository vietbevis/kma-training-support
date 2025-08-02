# Permission và Role Management

## Tổng quan

Hệ thống quản lý quyền và vai trò đã được hoàn thiện với các chức năng sau:

### Permission Module

- **GET** `/permissions` - Lấy danh sách permissions với phân trang
- **GET** `/permissions/:id` - Lấy chi tiết permission theo ID
- **GET** `/permissions/role/:roleId` - Lấy permissions theo role ID
- **PUT** `/permissions/:id` - Cập nhật name và description của permission

**Lưu ý**: Chỉ có thể cập nhật `name` và `description`. Các trường `path`, `method`, `module` không thể thay đổi.

### Role Module

- **POST** `/roles` - Tạo role mới
- **GET** `/roles` - Lấy danh sách roles với phân trang và filters
- **GET** `/roles/:id` - Lấy chi tiết role theo ID
- **PUT** `/roles/:id` - Cập nhật role
- **DELETE** `/roles/:id` - Xóa role
- **POST** `/roles/:id/permissions` - Gán permissions cho role
- **DELETE** `/roles/:id/permissions` - Xóa permissions khỏi role

**Lưu ý**: System roles chỉ có thể được chỉnh sửa bởi admin.

## Cách sử dụng

### 1. Chạy script tạo permissions tự động

```bash
npm run generate:permissions
```

Script này sẽ:

- Quét tất cả các route API hiện có
- Tạo permissions cho mỗi route
- Tạo role "admin" nếu chưa có
- Gán tất cả permissions cho role admin

### 2. API Endpoints

#### Permission Endpoints

```bash
# Lấy danh sách permissions
GET /permissions?page=1&limit=10

# Lấy chi tiết permission
GET /permissions/:id

# Lấy permissions theo role
GET /permissions/role/:roleId

# Cập nhật permission
PUT /permissions/:id
{
  "name": "New Permission Name",
  "description": "New description"
}
```

#### Role Endpoints

```bash
# Tạo role mới
POST /roles
{
  "name": "teacher",
  "description": "Teacher role",
  "isActive": true,
  "scopeFacultyDepartmentId": "faculty-id",
  "permissionIds": ["permission-id-1", "permission-id-2"]
}

# Lấy danh sách roles với filters
GET /roles?page=1&limit=10&search=admin&isSystemRole=true&isActive=true

# Các query params có sẵn:
# - page: Số trang (mặc định: 1)
# - limit: Số lượng items mỗi trang (mặc định: 10)
# - search: Tìm kiếm theo name hoặc description
# - isSystemRole: Lọc theo system role (true/false)
# - isActive: Lọc theo trạng thái active (true/false)

# Ví dụ:
# GET /roles - Lấy tất cả roles
# GET /roles?search=admin - Tìm roles có chứa "admin"
# GET /roles?isSystemRole=true - Chỉ lấy system roles
# GET /roles?isActive=true - Chỉ lấy active roles
# GET /roles?search=teacher&isActive=true - Tìm active roles có chứa "teacher"

# Lấy chi tiết role
GET /roles/:id

# Cập nhật role
PUT /roles/:id
{
  "name": "Updated Role Name",
  "description": "Updated description",
  "isActive": true,
  "permissionIds": ["new-permission-id"]
}

# Xóa role
DELETE /roles/:id

# Gán permissions cho role
POST /roles/:id/permissions
{
  "permissionIds": ["permission-id-1", "permission-id-2"]
}

# Xóa permissions khỏi role
DELETE /roles/:id/permissions
{
  "permissionIds": ["permission-id-1", "permission-id-2"]
}
```

## Cấu trúc Database

### Permission Entity

```typescript
{
  id: string;
  name: string;
  description: string;
  path: string;
  method: HttpMethod;
  module: string;
  roles: RoleEntity[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Role Entity

```typescript
{
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isSystemRole: boolean;
  scopeFacultyDepartmentId: string;
  scopeFacultyDepartment: FacultyDepartmentEntity;
  permissions: PermissionEntity[];
  createdAt: Date;
  updatedAt: Date;
}
```

## Bảo mật

### System Roles

- System roles (`isSystemRole: true`) chỉ có thể được chỉnh sửa bởi admin
- Cần implement logic kiểm tra quyền admin trong controller

### Permission Validation

- Chỉ cho phép cập nhật `name` và `description` của permission
- Các trường `path`, `method`, `module` được bảo vệ không cho phép thay đổi

## Script tự động

### generate-permissions-simple.script.ts

Script này sẽ:

1. Quét tất cả các route API đã định nghĩa
2. Tạo permissions cho mỗi route
3. Tạo role "admin" nếu chưa có
4. Gán tất cả permissions cho role admin

### Cách chạy

```bash
npm run generate:permissions
```

## Lưu ý quan trọng

1. **System Roles**: Chỉ admin mới có thể chỉnh sửa system roles
2. **Permission Protection**: Path, method, module không thể thay đổi
3. **Admin Role**: Script sẽ tự động tạo role admin với tất cả permissions
4. **Validation**: Tất cả input đều được validate bằng class-validator
5. **Pagination**: Hỗ trợ phân trang cho các endpoint list
6. **Relations**: Tự động load relations khi cần thiết

## TODO

- [ ] Implement admin check logic trong controllers
- [ ] Thêm authentication middleware
- [ ] Thêm authorization guard
- [ ] Implement role-based access control
- [ ] Thêm audit logging cho permission/role changes
