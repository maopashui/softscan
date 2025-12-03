package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

var (
	ErrRateLimitExceeded = errors.New("今日识别次数已达上限，请明天再试")
)

const (
	maxDailyOCRRequests = 3 // 默认限制
)

// GetUserDailyLimit 获取用户的每日限制次数
func GetUserDailyLimit(ctx context.Context, db *sql.DB, userID int64) (int, error) {
	var limit int
	err := db.QueryRowContext(ctx, "SELECT COALESCE(daily_limit, ?) FROM users WHERE id = ?", maxDailyOCRRequests, userID).Scan(&limit)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return maxDailyOCRRequests, nil
		}
		return maxDailyOCRRequests, err
	}
	if limit <= 0 {
		return maxDailyOCRRequests, nil
	}
	return limit, nil
}

// CheckOCRRateLimit 检查用户/IP的OCR调用次数限制
// 返回 (是否允许, 今日已用次数, 限制次数, 错误)
func CheckOCRRateLimit(ctx context.Context, db *sql.DB, userID int64, ip string) (bool, int, int, error) {
	today := time.Now().Format("2006-01-02")

	// 获取用户的限制次数
	limit, err := GetUserDailyLimit(ctx, db, userID)
	if err != nil {
		return false, 0, limit, err
	}

	// 查询今日该用户的调用次数
	var count int
	err = db.QueryRowContext(ctx, `
		SELECT COUNT(*) 
		FROM ocr_rate_limits 
		WHERE user_id = ? AND date = ?`,
		userID, today).Scan(&count)
	if err != nil && err != sql.ErrNoRows {
		return false, 0, limit, err
	}

	if count >= limit {
		return false, count, limit, fmt.Errorf("今日识别次数已达上限（%d次/天），请明天再试", limit)
	}

	return true, count, limit, nil
}

// RecordOCRRequest 记录一次OCR调用
func RecordOCRRequest(ctx context.Context, db *sql.DB, userID int64, ip string) error {
	today := time.Now().Format("2006-01-02")
	_, err := db.ExecContext(ctx, `
		INSERT INTO ocr_rate_limits(user_id, ip, date, created_at) 
		VALUES(?, ?, ?, ?)`,
		userID, ip, today, Now())
	return err
}
