package service

import (
	"context"
	"database/sql"

	"gin_ocrimg/backend/internal/model"
)

const maxHistoryPerUser = 20

func SaveOCRRecord(ctx context.Context, db *sql.DB, userID int64, text string) error {
	if text == "" {
		return nil
	}
	_, err := db.ExecContext(ctx,
		"INSERT INTO ocr_records(user_id, text, created_at) VALUES(?,?,?)",
		userID, text, Now())
	if err != nil {
		return err
	}
	// 保留最近 20 条，删除更早的
	_, _ = db.ExecContext(ctx, `
DELETE FROM ocr_records
WHERE user_id = ?
  AND id NOT IN (
    SELECT id FROM ocr_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  )`, userID, userID, maxHistoryPerUser)
	return nil
}

func GetRecentOCRRecords(ctx context.Context, db *sql.DB, userID int64, limit int) ([]model.OCRRecord, error) {
	if limit <= 0 || limit > maxHistoryPerUser {
		limit = maxHistoryPerUser
	}
	rows, err := db.QueryContext(ctx, `
SELECT id, user_id, text, created_at
FROM ocr_records
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []model.OCRRecord
	for rows.Next() {
		var r model.OCRRecord
		if err := rows.Scan(&r.ID, &r.UserID, &r.Text, &r.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

// ClearOCRRecords 清空某个用户的所有 OCR 识别记录
func ClearOCRRecords(ctx context.Context, db *sql.DB, userID int64) error {
	_, err := db.ExecContext(ctx, "DELETE FROM ocr_records WHERE user_id = ?", userID)
	return err
}
