const express = require('express');
const axios = require('axios');
const app = express();

const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL_MS = 3000; // Gọi API mỗi 3 giây
const API_URL = "https://1.bot/GetNewLottery/LT_TaixiuMD5"; // API gốc

let latestResult = null;
let lastPhien = null; // 🔹 Lưu phiên trước đó để so sánh

async function fetchResult() {
    try {
        const response = await axios.get(API_URL);
        const json = response.data;

        if (json.state === 1 && json.data && json.data.OpenCode) {
            const openCodeStr = json.data.OpenCode;
            const openCode = openCodeStr.split(',').map(Number);

            if (openCode.length !== 3 || openCode.some(isNaN)) {
                console.error("❌ Lỗi dữ liệu OpenCode:", openCodeStr);
                return;
            }

            const tong = openCode.reduce((a, b) => a + b, 0);
            const ketQua = (tong >= 11) ? "Tài" : "Xỉu";

            // 🔹 Chỉ cập nhật nếu có phiên mới
            if (json.data.Expect !== lastPhien) {
                lastPhien = json.data.Expect;
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
            // Nếu trùng phiên => không log
        }
    } catch (err) {
        console.error("❌ Lỗi fetch API:", err.message, err.response ? `(HTTP ${err.response.status})` : '');
    } finally {
        setTimeout(fetchResult, FETCH_INTERVAL_MS); // Lặp lại an toàn
    }
}

// Khởi chạy vòng lặp fetch
fetchResult();

// --- REST API ---
app.get('/api/taixiu/ws', (req, res) => {
    if (!latestResult) {
        return res.status(503).json({
            error: "Dữ liệu chưa sẵn sàng",
            details: "Vui lòng đợi vài giây để tải phiên đầu tiên."
        });
    }
    res.json(latestResult);
});

// Endpoint mặc định
app.get('/', (req, res) => {
    res.send('API HTTP Tài Xỉu. Truy cập <a href="/api/taixiu/ws">/api/taixiu/ws</a> để xem phiên mới nhất.');
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng http://localhost:${PORT}`);
});
