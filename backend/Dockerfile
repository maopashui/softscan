###### 构建阶段：在容器内编译带 CGO 的 go-sqlite3 ######
FROM golang:1.22-alpine AS builder

# 替换 Alpine 源为国内镜像，加速 apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache build-base tzdata

WORKDIR /app

# 使用国内 Go proxy，加速拉取依赖
ENV GOPROXY=https://goproxy.cn,direct \
    GOSUMDB=sum.golang.org

# 只拷贝 go.mod/go.sum 先拉依赖，提高缓存命中
COPY go.mod go.sum ./
RUN go mod download

# 再拷贝剩余代码
COPY . .

# 使用 CGO 编译 Linux amd64 可执行文件，开启 release 优化
ENV CGO_ENABLED=1 GOOS=linux GOARCH=amd64
RUN go build -ldflags="-s -w" -o app .


###### 运行阶段：精简镜像，仅带运行所需依赖 ######
FROM alpine:3.20

LABEL maintainer="you" \
      description="SteamOCR backend with embedded frontend (sqlite3)"

# 替换 Alpine 源为国内镜像，加速 apk
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories && \
    apk add --no-cache ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# 从构建阶段复制编译好的二进制
COPY --from=builder /app/app /app/app

# 如需预置数据库，可在宿主挂载卷：
#   docker run -v $(pwd)/steamocr.db:/app/steamocr.db ...

EXPOSE 5001

# Gin 使用 release 模式运行
ENV GIN_MODE=release

USER nobody

ENTRYPOINT ["/app/app"]

