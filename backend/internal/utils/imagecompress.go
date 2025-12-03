package utils

import (
	"bytes"
	"encoding/base64"
	"errors"
	"image"
	"image/jpeg"
	_ "image/png"
	"math"

	"github.com/disintegration/imaging"
)

const (
	maxImageSize     = 8 * 1024 * 1024 // 8 MB
	maxCompressTimes = 3
)

var (
	ErrDecodeBase64  = errors.New("base64 解码失败")
	ErrCompressLimit = errors.New("图片压缩后仍大于 8MB")
)

// DecodeBase64Image 解码 base64 图片
func DecodeBase64Image(b64 string) ([]byte, error) {
	data, err := base64.StdEncoding.DecodeString(b64)
	if err != nil {
		return nil, ErrDecodeBase64
	}
	return data, nil
}

// CompressToLimit 尝试将图片压缩到不超过 8MB
func CompressToLimit(src []byte) ([]byte, error) {
	if len(src) <= maxImageSize {
		return src, nil
	}

	img, _, err := image.Decode(bytes.NewReader(src))
	if err != nil {
		return nil, err
	}

	current := img
	quality := 90

	for i := 0; i < maxCompressTimes; i++ {
		var buf bytes.Buffer
		if err := jpeg.Encode(&buf, current, &jpeg.Options{Quality: quality}); err != nil {
			return nil, err
		}
		if buf.Len() <= maxImageSize {
			return buf.Bytes(), nil
		}

		// 按比例缩小长边
		scale := math.Sqrt(float64(maxImageSize) / float64(buf.Len()))
		if scale < 0.5 {
			scale = 0.5
		}
		newW := int(float64(current.Bounds().Dx()) * scale)
		newH := int(float64(current.Bounds().Dy()) * scale)
		if newW < 1 {
			newW = 1
		}
		if newH < 1 {
			newH = 1
		}
		current = imaging.Resize(current, newW, newH, imaging.Lanczos)
		quality -= 10
		if quality < 40 {
			quality = 40
		}
	}

	return nil, ErrCompressLimit
}

// EncodeToBase64 将二进制图片转为 base64
func EncodeToBase64(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
