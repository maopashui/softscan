package main

import (
	"embed"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/router"
	"gin_ocrimg/backend/internal/service"
)

//go:embed dist/*
var embeddedDist embed.FS

func main() {
	// 复古机械风启动日志
	log.Println(`[⚙️] SoftScan | 齿轮开始转动，蒸汽锅炉点火，系统即将启动`)

	// 初始化数据库
	db, err := service.InitDB("steamocr.db")
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}
	defer db.Close()

	// 自动迁移/建表
	if err := service.AutoMigrate(db); err != nil {
		log.Fatalf("数据库迁移失败: %v", err)
	}

	// 初始化 Gin
	r := gin.New()
	r.RedirectTrailingSlash = false
	r.RedirectFixedPath = false
	r.Use(gin.Logger(), gin.Recovery())

	// 注册路由与静态资源
	router.Register(r, db, embeddedDist)

	// 优雅退出 & 临时文件清理
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-quit
		log.Println(`[⚙️] SoftScan | 收到停机信号，开始冷却齿轮与蒸汽管路，清理临时文件`)
		service.CleanupTempDir()
		os.Exit(0)
	}()

	// 启动服务
	if err := r.Run(":5001"); err != nil {
		log.Fatalf("Gin 启动失败: %v", err)
	}
}
