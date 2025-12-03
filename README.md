# SoftScan 演示程序（Gin + React ）

## 后端启动

```bash
cd backend
go mod tidy
go run main.go
```

首次运行会自动在 `backend/steamocr.db` 中创建 `users` 与 `sessions` 表，相当于完成 SQLite 初次迁移。

## 前端启动

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认端口：5173  
后端默认端口：5001  
已在后端开启 CORS（允许 `http://localhost:5173` 调用）。

## SQLite 初次迁移命令

本项目通过 Go 代码自动迁移，只需运行：

```bash
cd backend
go run main.go
```

程序会自动创建所需数据表。

## 接口自测 curl 示例

### 1）注册

```bash
curl -X POST http://localhost:5001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### 2）登录（获取 Token）

```bash
curl -X POST http://localhost:5001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

成功后会返回形如：

```json
{
  "errcode": 0,
  "msg": "登录成功",
  "token": "xxx.yyy.zzz"
}
```

### 3）OCR 调用

下面示例使用 1×1 白色 PNG 图片的 base64 内容（无 data URI 头）：

```bash
TOKEN="上一步登录返回的 token 值"
BASE64_IMG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="

curl -X POST http://localhost:5001/ocr \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"image\":\"$BASE64_IMG\"}"
```

返回示例结构：

```json
{
  "errcode": 0,
  "msg": "success",
  "text": "...",
  "boxes": [
    {
      "text": "...",
      "left": 0,
      "top": 0,
      "right": 100,
      "bottom": 20,
      "confidence": 0.99
    }
  ]
}
```

## 端口说明

- 前端：5173（Vite 开发服务器）
- 后端：5001（Gin + SQLite + JWT）

登录成功后，前端会将 token 写入 `localStorage`，并通过 axios 拦截器自动携带 `Authorization: Bearer <token>` 访问 `/ocr` 接口。  
单张图片大于 8 MB 时，后端会自动进行最多 3 次压缩，前端会提示「图纸超重，即将自动压缩」。***

当前已将前端代码打包到backend下dist路径下，直接打包为go二进制文件。

～～～shell
cd backend
docker build -t softscan .
touch steamocr.db
chmod 666 steamocr.db
docker run -d \
  -p 5001:5001 \
  -v $(pwd)/steamocr.db:/app/steamocr.db \
  --name softscan \
  softscan
~~~