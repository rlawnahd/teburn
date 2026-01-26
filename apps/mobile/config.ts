// 앱 설정
// 개발 환경에서는 로컬 IP로, 배포 환경에서는 실제 URL로 설정

export const CONFIG = {
    // 개발 환경에서는 로컬 네트워크 IP 사용
    // 맥에서 IP 확인: ifconfig | grep "inet " | grep -v 127.0.0.1
    // 또는 시스템 환경설정 > 네트워크 > Wi-Fi > IP 주소
    WEB_URL: __DEV__
        ? 'http://10.10.41.205:3000' // 현재 IP (Wi-Fi 변경 시 업데이트 필요)
        : 'https://teburn.com', // 배포 URL

    // API 서버 URL (필요시)
    API_URL: __DEV__
        ? 'http://10.10.41.205:4000'
        : 'https://api.teburn.com',
};

// 개발 시 IP 확인 방법:
// 1. 터미널에서: ipconfig getifaddr en0 (또는 en1)
// 2. 또는: ifconfig | grep "inet " | grep -v 127.0.0.1
