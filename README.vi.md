# Heartfelt

[English](README.md) · **Tiếng Việt**

Viết tặng ai đó một tấm thiệp — người yêu, bố mẹ, bạn bè hay đồng nghiệp — rồi gửi đi bằng một đường link. Người nhận mở một phong bì được niêm phong và thấy lời nhắn, ảnh hoặc video, lời nhắn thoại và chữ ký của bạn bên trong.

Hỗ trợ tiếng Việt và tiếng Anh.

## Bạn có thể làm gì

- **Viết** lời nhắn, hoặc bắt đầu từ một câu gợi ý theo dịp
- **Thêm** ảnh hoặc video, ghi âm ngay trên trình duyệt, và chữ ký vẽ tay
- **Trang trí**: 8 dịp, 6 kiểu thiệp, và pháo giấy, pháo hoa hoặc không gì cả khi mở thiệp
- **Chia sẻ** bằng link riêng tư, hoặc ghim thêm lên **Bức tường yêu thương** công khai
- **Nhận thiệp**: người nhận mở phong bì và có thể gửi lại trái tim

Bản nháp được tự động lưu trên máy bạn, và người gửi có thể xóa thiệp sau này từ chính trình duyệt đó.

## Bắt đầu nhanh

```bash
git clone https://github.com/Thinhlegit/heartfelt.git
cd heartfelt
./setup.sh
```

Mở http://localhost:3000. Vậy là xong.

Trên Windows, hãy chạy các lệnh này trong WSL (Ubuntu).

Script sẽ tạo tệp cài đặt (`.env`), tạo mã quản trị, rồi chạy Heartfelt bằng Docker, hoặc bằng Node.js 22+ nếu máy chưa có Docker. Chạy lại bao nhiêu lần cũng được; cài đặt và thiệp của bạn vẫn được giữ nguyên.

## Đưa lên mạng với HTTPS

1. Trỏ tên miền về máy chủ của bạn (bản ghi DNS `A`) và mở cổng 80 và 443.
2. Chạy:

```bash
./setup.sh --domain thiep.example.com
```

Heartfelt sẽ chạy tại `https://thiep.example.com`, với chứng chỉ miễn phí tự gia hạn.

## Lệnh thường dùng

| Để | Chạy |
| --- | --- |
| Cập nhật | `git pull && ./setup.sh` |
| Xem log | `docker compose logs -f` |
| Dừng | `docker compose --profile https down` |
| Sửa code | `npm install && npm run dev` |

## Cài đặt

Mọi cài đặt nằm trong `.env`. Sửa giá trị, rồi chạy lại `./setup.sh`.

| Cài đặt | Mặc định | Công dụng |
| --- | --- | --- |
| `DOMAIN` | trống | Tên miền công khai. Để trống là chỉ chạy trên máy này |
| `ADMIN_TOKEN` | tự tạo | Mã bí mật để kiểm duyệt thiệp. Giữ kín |
| `CREATE_LIMIT` | `10` | Số thiệp mỗi người được tạo trong 15 phút |
| `MAX_STORAGE_MB` | `2048` | Tạm ngừng nhận tệp khi đã dùng chừng này dung lượng |
| `REPORT_HIDE_AT` | `3` | Số lượt báo cáo để ẩn thiệp khỏi Bức tường yêu thương |

Chạy bằng Node sau proxy của riêng bạn thay vì Docker? Thêm cả `NODE_ENV=production` và `TRUST_PROXY=1`.

## Kiểm duyệt

Người xem có thể báo cáo thiệp trên Bức tường yêu thương; khi đủ số lượt báo cáo, thiệp bị ẩn khỏi bức tường (link riêng vẫn mở được). Xem và xóa thiệp bằng mã quản trị:

```bash
curl -H "x-admin-token: MA_QUAN_TRI" https://thiep.example.com/api/admin/reported
```

```bash
curl -X DELETE -H "x-admin-token: MA_QUAN_TRI" https://thiep.example.com/api/cards/MA_THIEP
```

## Sao lưu

Thiệp và tệp tải lên được lưu trong hai volume Docker. Để lưu chúng vào `backup.tgz`:

```bash
docker run --rm -v heartfelt_heartfelt-data:/d -v heartfelt_heartfelt-uploads:/u -v "$PWD":/out busybox tar czf /out/backup.tgz -C / d u
```

Nếu không dùng Docker, hãy sao lưu hai thư mục `data/` và `uploads/`.

## Bảo mật

- Header bảo mật chặt chẽ: không có script nội tuyến, không cho nhúng khung, link thiệp không bị lộ sang trang khác
- Tệp tải lên được kiểm tra đúng định dạng thật, đổi tên, và phục vụ theo cách không bao giờ chạy được như một trang web
- Giới hạn truy cập, giới hạn dung lượng, chặn yêu cầu từ trang khác, và làm sạch dữ liệu nhập
- Link thiệp khó đoán; thiệp riêng tư không xuất hiện trên công cụ tìm kiếm
- Image Docker: distroless (không có shell), không chạy bằng root, hệ thống tệp chỉ đọc, không có quyền Linux đặc biệt, khoảng 50 MB

Build sau một proxy có kiểm tra HTTPS? Truyền chứng chỉ của proxy dưới dạng build secret (không lưu lại trong image): `docker build --secret id=ca,src=proxy-ca.crt -t heartfelt .`

## Cấu trúc dự án

```
setup.sh            Cài đặt một bước
server.js           API, tải tệp, bảo mật
public/index.html   Tạo thiệp            (create.js)
public/card.html    Mở thiệp             (card.js)
public/wall.html    Bức tường yêu thương (wall.js)
public/themes.js    Kiểu thiệp, hiệu ứng, phần hiển thị dùng chung
public/i18n.js      Nội dung tiếng Việt và tiếng Anh
public/style.css    Toàn bộ giao diện
```

## Bước tiếp theo khi mở rộng

- Chuyển sang cơ sở dữ liệu và lưu trữ đối tượng (S3, R2), sao lưu định kỳ
- Xóa thông tin vị trí khỏi ảnh khi tải lên
- Thêm CAPTCHA nếu thư rác vượt qua được giới hạn truy cập
