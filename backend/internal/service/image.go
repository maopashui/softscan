package service

import (
	"log"

	"gin_ocrimg/backend/internal/utils"
)

type CompressResult struct {
	Base64      string
	OriginalLen int
	FinalLen    int
}

func PrepareImageForOCR(b64 string) (*CompressResult, int, error) {
	raw, err := utils.DecodeBase64Image(b64)
	if err != nil {
		return nil, 1, err
	}
	originalSize := len(raw)
	if originalSize <= 8*1024*1024 {
		return &CompressResult{
			Base64:      b64,
			OriginalLen: originalSize,
			FinalLen:    originalSize,
		}, 0, nil
	}

	compressed, err := utils.CompressToLimit(raw)
	if err != nil {
		if err == utils.ErrCompressLimit {
			return nil, 2, err
		}
		return nil, 5, err
	}
	log.Printf("[⚙️] SteamOCR | 齿轮压缩机工作中：原始大小 %.2f MB → %.2f MB",
		float64(originalSize)/1024.0/1024.0,
		float64(len(compressed))/1024.0/1024.0,
	)

	return &CompressResult{
		Base64:      utils.EncodeToBase64(compressed),
		OriginalLen: originalSize,
		FinalLen:    len(compressed),
	}, 0, nil
}
