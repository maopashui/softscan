package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/service"
)

type setOCRTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

type setOCREngineURLRequest struct {
	URL string `json:"url" binding:"required"`
}

// SetOCREngineTokenHandler 设置 OCR 引擎 token（仅管理员）
func SetOCREngineTokenHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		v, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "未找到用户信息"})
			return
		}
		uid, ok := v.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "用户信息类型错误"})
			return
		}

		// 检查是否为管理员
		isAdmin, err := service.IsAdmin(c.Request.Context(), db, uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "检查管理员权限失败"})
			return
		}
		if !isAdmin {
			c.JSON(http.StatusForbidden, gin.H{"errcode": 7, "msg": "仅管理员可操作"})
			return
		}

		var req setOCRTokenRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}

		if err := service.SetConfig(c.Request.Context(), db, "ocr_engine_token", req.Token); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "保存 token 失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "设置成功",
		})
	}
}

// GetOCREngineConfigHandler 获取 OCR 引擎配置（仅管理员，一次返回 URL 和 Token 状态）
func GetOCREngineConfigHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		v, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "未找到用户信息"})
			return
		}
		uid, ok := v.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "用户信息类型错误"})
			return
		}

		// 检查是否为管理员
		isAdmin, err := service.IsAdmin(c.Request.Context(), db, uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "检查管理员权限失败"})
			return
		}
		if !isAdmin {
			c.JSON(http.StatusForbidden, gin.H{"errcode": 7, "msg": "仅管理员可操作"})
			return
		}

		// 一次查询获取配置
		config := service.GetOCREngineConfig(c.Request.Context(), db)

		// 检查数据库中是否已设置
		token, _ := service.GetConfig(c.Request.Context(), db, "ocr_engine_token")
		url, _ := service.GetConfig(c.Request.Context(), db, "ocr_engine_url")
		hasToken := token != ""
		hasURL := url != ""

		c.JSON(http.StatusOK, gin.H{
			"errcode":    0,
			"msg":        "success",
			"hasToken":   hasToken,
			"hasURL":     hasURL,
			"currentURL": config.URL,
			// 不返回实际 token 值，只返回是否已设置
		})
	}
}

// GetOCREngineTokenHandler 获取 OCR 引擎 token 状态（仅管理员，向后兼容）
func GetOCREngineTokenHandler(db *sql.DB) gin.HandlerFunc {
	return GetOCREngineConfigHandler(db)
}

// SetOCREngineURLHandler 设置 OCR 引擎 URL（仅管理员）
func SetOCREngineURLHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID
		v, ok := c.Get("userID")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "未找到用户信息"})
			return
		}
		uid, ok := v.(int64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"errcode": 4, "msg": "用户信息类型错误"})
			return
		}

		// 检查是否为管理员
		isAdmin, err := service.IsAdmin(c.Request.Context(), db, uid)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "检查管理员权限失败"})
			return
		}
		if !isAdmin {
			c.JSON(http.StatusForbidden, gin.H{"errcode": 7, "msg": "仅管理员可操作"})
			return
		}

		var req setOCREngineURLRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}

		if err := service.SetConfig(c.Request.Context(), db, "ocr_engine_url", req.URL); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "保存 URL 失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "设置成功",
		})
	}
}

// GetOCREngineURLHandler 获取 OCR 引擎 URL（仅管理员，向后兼容）
func GetOCREngineURLHandler(db *sql.DB) gin.HandlerFunc {
	return GetOCREngineConfigHandler(db)
}
