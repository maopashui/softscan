package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/service"
)

type updateUserLimitRequest struct {
	UserID int64 `json:"user_id" binding:"required"`
	Limit  int   `json:"limit" binding:"required,min=1"`
}

// GetUserListHandler 获取用户列表（仅管理员）
func GetUserListHandler(db *sql.DB) gin.HandlerFunc {
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

		users, err := service.GetUserList(c.Request.Context(), db)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "获取用户列表失败"})
			return
		}

		// 获取每个用户今日使用次数
		type UserWithUsage struct {
			ID         int64  `json:"id"`
			Username   string `json:"username"`
			DailyLimit int    `json:"daily_limit"`
			UsedToday  int    `json:"used_today"`
			CreatedAt  string `json:"created_at"`
		}

		result := make([]UserWithUsage, 0, len(users))
		for _, u := range users {
			used, _ := service.GetUserDailyLimitUsage(c.Request.Context(), db, u.ID)
			result = append(result, UserWithUsage{
				ID:         u.ID,
				Username:   u.Username,
				DailyLimit: u.DailyLimit,
				UsedToday:  used,
				CreatedAt:  u.CreatedAt.Format("2006-01-02 15:04:05"),
			})
		}

		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "success",
			"data":    result,
		})
	}
}

// UpdateUserLimitHandler 更新用户限制次数（仅管理员）
func UpdateUserLimitHandler(db *sql.DB) gin.HandlerFunc {
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

		var req updateUserLimitRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}

		if err := service.UpdateUserDailyLimit(c.Request.Context(), db, req.UserID, req.Limit); err != nil {
			if err == service.ErrUserNotFound {
				c.JSON(http.StatusNotFound, gin.H{"errcode": 5, "msg": "用户不存在"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "更新失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "更新成功",
		})
	}
}
