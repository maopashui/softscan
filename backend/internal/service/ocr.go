package service

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ocrEngineURL 已改为从配置读取，默认值在 GetOCREngineURL 中定义

type OCRBox struct {
	Text       string  `json:"text"`
	Left       int     `json:"left"`
	Top        int     `json:"top"`
	Right      int     `json:"right"`
	Bottom     int     `json:"bottom"`
	Confidence float64 `json:"confidence"`
}

type ocrEngineRequest struct {
	Image    string `json:"image"`
	Compress bool   `json:"compress"`
}

// 实际 OCR 引擎返回结构：
//
//	{
//	  "result": {
//	    "imgpath": "...",
//	    "errcode": 0,
//	    "width": 710,
//	    "height": 72,
//	    "ocr_response": [
//	      {"text":"...", "left":5.5, "top":13.2, "right":696.7, "bottom":45.5, "rate":0.98}
//	    ]
//	  }
//	}
type ocrEngineBox struct {
	Text   string  `json:"text"`
	Left   float64 `json:"left"`
	Top    float64 `json:"top"`
	Right  float64 `json:"right"`
	Bottom float64 `json:"bottom"`
	Rate   float64 `json:"rate"`
}

type ocrEngineResponse struct {
	Result struct {
		ImgPath     string         `json:"imgpath"`
		ErrCode     int            `json:"errcode"`
		Width       int            `json:"width"`
		Height      int            `json:"height"`
		OCRResponse []ocrEngineBox `json:"ocr_response"`
	} `json:"result"`
}

type OCRResult struct {
	ErrCode int       `json:"errcode"`
	Msg     string    `json:"msg"`
	Text    string    `json:"text"`
	Boxes   []OCRBox  `json:"boxes"`
	Width   int       `json:"width"`
	Height  int       `json:"height"`
	Time    time.Time `json:"time"`
}

func CallOCREngine(ctx context.Context, db *sql.DB, base64Img string) (*OCRResult, error) {
	payload := ocrEngineRequest{
		Image:    base64Img,
		Compress: true,
	}
	// fmt.Println(payload)
	body, _ := json.Marshal(payload)

	// 一次查询获取 OCR 引擎配置（URL 和 Token）
	config := GetOCREngineConfig(ctx, db)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, config.URL, bytes.NewReader(body))
	if err != nil {
		return &OCRResult{ErrCode: 3, Msg: "创建 OCR 请求失败"}, err
	}
	req.Header.Set("Content-Type", "application/json")

	// 设置 Authorization header
	if config.Token != "" {
		req.Header.Set("Authorization", "Bearer "+config.Token)
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		return &OCRResult{ErrCode: 3, Msg: "调用 OCR 引擎失败"}, err
	}
	defer resp.Body.Close()
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &OCRResult{ErrCode: 3, Msg: "读取 OCR 响应失败"}, err
	}
	if resp.StatusCode != http.StatusOK {
		return &OCRResult{ErrCode: 3, Msg: fmt.Sprintf("OCR 引擎返回状态码 %d", resp.StatusCode)}, errors.New("ocr engine error")
	}

	var engineResp ocrEngineResponse
	if err := json.Unmarshal(respBody, &engineResp); err != nil {
		return &OCRResult{ErrCode: 3, Msg: "解析 OCR 响应失败"}, err
	}

	// 引擎内部错误码非 0
	if engineResp.Result.ErrCode != 0 {
		return &OCRResult{ErrCode: 3, Msg: fmt.Sprintf("OCR 引擎错误码 %d", engineResp.Result.ErrCode)}, errors.New("ocr engine inner error")
	}

	// 映射字段到统一 Box 结构，并拼接 text
	boxes := make([]OCRBox, 0, len(engineResp.Result.OCRResponse))
	var texts []string
	for _, b := range engineResp.Result.OCRResponse {
		boxes = append(boxes, OCRBox{
			Text:       b.Text,
			Left:       int(b.Left),
			Top:        int(b.Top),
			Right:      int(b.Right),
			Bottom:     int(b.Bottom),
			Confidence: b.Rate,
		})
		if b.Text != "" {
			texts = append(texts, b.Text)
		}
	}

	return &OCRResult{
		ErrCode: 0,
		Msg:     "success",
		Text:    strings.Join(texts, "\n"),
		Boxes:   boxes,
		Width:   engineResp.Result.Width,
		Height:  engineResp.Result.Height,
		Time:    time.Now(),
	}, nil
}
