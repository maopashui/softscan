package service

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"gin_ocrimg/backend/internal/model"
)

var (
	ErrUserNotFound = errors.New("用户不存在")
)

// GetUserList 获取用户列表（仅管理员）
func GetUserList(ctx context.Context, db *sql.DB) ([]model.User, error) {
	rows, err := db.QueryContext(ctx, `
		SELECT id, username, COALESCE(daily_limit, 3) as daily_limit, created_at
		FROM users
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []model.User
	for rows.Next() {
		var u model.User
		if err := rows.Scan(&u.ID, &u.Username, &u.DailyLimit, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

// UpdateUserDailyLimit 更新用户的每日限制次数
func UpdateUserDailyLimit(ctx context.Context, db *sql.DB, userID int64, limit int) error {
	if limit <= 0 {
		limit = 3 // 默认值
	}

	// 检查用户是否存在
	var exists int
	err := db.QueryRowContext(ctx, "SELECT COUNT(1) FROM users WHERE id = ?", userID).Scan(&exists)
	if err != nil {
		return err
	}
	if exists == 0 {
		return ErrUserNotFound
	}

	_, err = db.ExecContext(ctx, "UPDATE users SET daily_limit = ? WHERE id = ?", limit, userID)
	return err
}

// GetUserDailyLimitUsage 获取用户今日使用情况
func GetUserDailyLimitUsage(ctx context.Context, db *sql.DB, userID int64) (int, error) {
	today := time.Now().Format("2006-01-02")
	var count int
	err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) 
		FROM ocr_rate_limits 
		WHERE user_id = ? AND date = ?`,
		userID, today).Scan(&count)
	if err != nil && err != sql.ErrNoRows {
		return 0, err
	}
	return count, nil
}
