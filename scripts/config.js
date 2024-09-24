let dx3HUDInstance = null;  // 전역 변수로 인스턴스를 추적

Hooks.on("controlToken", (token, controlled) => {
    const tokensControlled = canvas.tokens.controlled.length > 0;

    // 토큰이 선택되면 UI를 렌더링하고 선택이 해제되면 UI를 닫음
    if (tokensControlled && !dx3HUDInstance) {
        dx3HUDInstance = new DX3HUD();
        dx3HUDInstance.token = token;  // 토큰 정보 저장
        dx3HUDInstance.render(true);   // 버튼 UI 렌더링
    } else if (!tokensControlled && dx3HUDInstance) {
        dx3HUDInstance.close();  // UI 닫기
        dx3HUDInstance = null;   // 인스턴스 초기화
    }
});
