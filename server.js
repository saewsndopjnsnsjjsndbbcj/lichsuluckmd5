const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
// Thời gian chờ giữa các lần gọi API (miligiây)
const FETCH_INTERVAL_MS = 3000; 

// URL API gốc
const API_URL = "https://1.bot/GetNewLottery/LT_TaixiuMD5"; // Giữ nguyên link của bạn

// Biến lưu phiên mới nhất
let latestResult = null;

// Hàm fetch API định kỳ an toàn hơn
async function fetchResult() {
    try {
        const response = await axios.get(API_URL);
        const json = response.data;

        if (json.state === 1 && json.data && json.data.OpenCode) {
            const openCodeStr = json.data.OpenCode;
            const openCode = openCodeStr.split(',').map(Number);
            
            // 💡 Cải tiến: Kiểm tra độ dài mảng (Đảm bảo có đủ 3 xúc xắc)
            if (openCode.length !== 3 || openCode.some(isNaN)) {
                 console.error("❌ Lỗi dữ liệu OpenCode:", openCodeStr, "Không đúng định dạng 3 số.");
                 return; // Dừng lại nếu dữ liệu không hợp lệ
            }

            const tong = openCode.reduce((a, b) => a + b, 0);
            
            // 💡 Cải tiến: Logic Tài/Xỉu
            // Tài (>= 11) hoặc Xỉu (< 11)
            const ketQua = (tong >= 11) ? "Tài" : "Xỉu"; 

            latestResult = {
                Phien: json.data.Expect,
                Xuc_xac_1: openCode[0],
                Xuc_xac_2: openCode[1],
                Xuc_xac_3: openCode[2],
                Tong: tong,
                Ket_qua: ketQua,
                OpenTime: json.data.OpenTime
            };

            console.log("🎲 Phiên mới nhất đã cập nhật:", latestResult.Phien, "-", latestResult.Ket_qua);
        }
    } catch (err) {
        // Log lỗi chi tiết hơn, ví dụ: trạng thái HTTP
        console.error("❌ Lỗi fetch API:", err.message, err.response ? `(HTTP Status: ${err.response.status})` : '');
    } finally {
        // 💡 Cải tiến: Gọi lại sau khi hoàn thành (thành công hay thất bại)
        // Đảm bảo không bị chồng chéo
        setTimeout(fetchResult, FETCH_INTERVAL_MS);
    }
}

// 💡 Cải tiến: Khởi chạy fetch lần đầu, sau đó nó sẽ tự lặp lại
fetchResult(); 

// --- REST API ---
app.get('/api/taixiu/ws', (req, res) => {
    if (!latestResult) {
        // 💡 Cải tiến: Sử dụng HTTP 202 Accepted (Đang chờ xử lý) hoặc 503 (Dịch vụ không sẵn sàng)
        // 503 là hợp lý vì dữ liệu chưa được nạp.
        return res.status(503).json({
            error: "Dữ liệu chưa được nạp lần đầu.",
            details: "Vui lòng đợi vài giây để hệ thống kết nối với API nguồn."
        });
    }
    // Trả về dữ liệu phiên mới nhất
    res.json(latestResult);
});

// Endpoint mặc định
app.get('/', (req, res) => {
    res.send('API HTTP Tài Xỉu. Truy cập <a href="/api/taixiu/ws">/api/taixiu/ws</a> để xem phiên mới nhất.');
});

// Khởi chạy server
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng http://localhost:${PORT}`);
});
