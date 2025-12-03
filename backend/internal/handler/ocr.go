package handler

import (
	"database/sql"
	"net/http"

	"github.com/gin-gonic/gin"

	"gin_ocrimg/backend/internal/service"
	"gin_ocrimg/backend/internal/utils"
)

type ocrRequest struct {
	Image string `json:"image" binding:"required"`
}

func OCRHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取用户ID和IP地址
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

		// 获取客户端IP
		ip := c.ClientIP()
		if ip == "" {
			ip = c.RemoteIP()
		}

		// 检查限流
		allowed, used, limit, err := service.CheckOCRRateLimit(c.Request.Context(), db, uid, ip)
		if err != nil {
			// 如果是限流错误，返回 429 状态码
			if !allowed {
				c.JSON(http.StatusTooManyRequests, gin.H{
					"errcode": 6,
					"msg":     err.Error(),
					"used":    used,
					"limit":   limit,
				})
				return
			}
			// 其他错误返回 500
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "检查调用限制失败"})
			return
		}

		var req ocrRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"errcode": 5, "msg": "参数错误"})
			return
		}

		comp, errCode, err := service.PrepareImageForOCR(req.Image)
		if err != nil {
			switch errCode {
			case 1:
				c.JSON(http.StatusBadRequest, gin.H{"errcode": 1, "msg": utils.ErrDecodeBase64.Error()})
			case 2:
				c.JSON(http.StatusBadRequest, gin.H{"errcode": 2, "msg": utils.ErrCompressLimit.Error()})
			default:
				c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "图片处理失败"})
			}
			return
		}

		result, err := service.CallOCREngine(c.Request.Context(), db, comp.Base64)
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"errcode": 3, "msg": result.Msg})
			return
		}

		// 记录本次OCR调用（限流）
		_ = service.RecordOCRRequest(c.Request.Context(), db, uid, ip)

		// 记录本次识别结果（仅文本），每用户保留最近 20 条
		_ = service.SaveOCRRecord(c.Request.Context(), db, uid, result.Text)

		c.JSON(http.StatusOK, gin.H{
			"errcode": result.ErrCode,
			"msg":     result.Msg,
			"text":    result.Text,
			"boxes":   result.Boxes,
			"width":   result.Width,
			"height":  result.Height,
		})
	}
}

func OCRHistoryHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		list, err := service.GetRecentOCRRecords(c.Request.Context(), db, uid, 20)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "获取识别记录失败"})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "success",
			"data":    list,
		})
	}
}

// OCRHistoryClearHandler 清空当前用户的 OCR 历史记录
func OCRHistoryClearHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
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

		if err := service.ClearOCRRecords(c.Request.Context(), db, uid); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"errcode": 5, "msg": "清空识别记录失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"errcode": 0,
			"msg":     "清空成功",
		})
	}
}
