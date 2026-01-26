// 앱 설정
// 개발 환경에서는 로컬 IP로, 배포 환경에서는 실제 URL로 설정

export const CONFIG = {
    // 배포된 URL
    WEB_URL: 'https://teburn-client.vercel.app',
    API_URL: 'https://server-production-68df.up.railway.app/api',
};

// 개발 시 IP 확인 방법:
// 1. 터미널에서: ipconfig getifaddr en0 (또는 en1)
// 2. 또는: ifconfig | grep "inet " | grep -v 127.0.0.1
