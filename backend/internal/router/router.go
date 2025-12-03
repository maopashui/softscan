package router

import (
	"database/sql"
	"io/fs"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/handler"
	"gin_ocrimg/backend/internal/middleware"
)

func Register(r *gin.Engine, db *sql.DB, staticFS fs.FS) {
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "OPTIONS", "DELETE"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	api := r.Group("/")
	{
		api.POST("/register", handler.RegisterHandler(db))
		api.POST("/login", handler.LoginHandler(db))
		api.POST("/ocr", middleware.AuthMiddleware(db), handler.OCRHandler(db))
		api.GET("/ocr/history", middleware.AuthMiddleware(db), handler.OCRHistoryHandler(db))
		api.DELETE("/ocr/history", middleware.AuthMiddleware(db), handler.OCRHistoryClearHandler(db))

		// 配置管理接口（需要认证）
		api.GET("/admin/ocr-config", middleware.AuthMiddleware(db), handler.GetOCREngineConfigHandler(db))
		api.POST("/admin/ocr-token", middleware.AuthMiddleware(db), handler.SetOCREngineTokenHandler(db))
		api.GET("/admin/ocr-token", middleware.AuthMiddleware(db), handler.GetOCREngineTokenHandler(db)) // 向后兼容
		api.POST("/admin/ocr-url", middleware.AuthMiddleware(db), handler.SetOCREngineURLHandler(db))
		api.GET("/admin/ocr-url", middleware.AuthMiddleware(db), handler.GetOCREngineURLHandler(db)) // 向后兼容

		// 用户管理接口（需要认证，仅管理员）
		api.GET("/admin/users", middleware.AuthMiddleware(db), handler.GetUserListHandler(db))
		api.PUT("/admin/users/limit", middleware.AuthMiddleware(db), handler.UpdateUserLimitHandler(db))
	}

	mountFrontend(r, staticFS)
}
