let dx3HUDInstance = null;

Hooks.on("controlToken", (token, controlled) => {
    const tokensControlled = canvas.tokens.controlled.length > 0;

    // render the UI when the token is selected and close the UI when it is deselected
    if (tokensControlled && !dx3HUDInstance) {
        dx3HUDInstance = new DX3HUD();
        dx3HUDInstance.token = token;
        dx3HUDInstance.render(true);
    } else if (!tokensControlled && dx3HUDInstance) {
        dx3HUDInstance.close();
        dx3HUDInstance = null;
    }
});
