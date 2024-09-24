class DX3HUD extends Application {
    constructor() {
        super();
        this.currentOpenedButton = null;  // 현재 열려 있는 base-button 추적
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "dx3-HUD",
            template: "modules/dx3rd-HUD/templates/button.hbs",  // 템플릿 경로 설정
            resizable: false,
            width: 200,
            height: 'auto',
            popOut: false,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Base 버튼 클릭 시 서브 버튼 표시/숨기기
        html.on("click", ".dx3-button-wrapper", (event) => {
            console.log("Base button clicked:", event.currentTarget);
            const buttonWrapper = event.currentTarget;
            const subButtonGroup = buttonWrapper.querySelector('.sub-buttons');

            // 기존에 열린 서브 버튼 닫기
            if (this.currentOpenedButton && this.currentOpenedButton !== buttonWrapper) {
                const previousSubButtons = this.currentOpenedButton.querySelector('.sub-buttons');
                if (previousSubButtons) previousSubButtons.style.display = 'none';
            }

            // 클릭된 버튼의 서브 버튼 열기/닫기
            if (subButtonGroup) {
                const isOpen = subButtonGroup.style.display === 'flex';
                subButtonGroup.style.display = isOpen ? 'none' : 'flex';
                this.currentOpenedButton = isOpen ? null : buttonWrapper;  // 열리면 저장, 닫히면 초기화
            }
        });

        // 각 베이스 버튼에 따라 다른 서브 버튼 기능을 수행
        html.on("click", ".dx3-sub-button", async (event) => {
            const subButtonKey = event.currentTarget.getAttribute('data-key');  // 서브 버튼의 data-key 가져오기
            const baseButtonKey = this.currentOpenedButton?.querySelector('.dx3-button')?.getAttribute('data-key');  // 베이스 버튼의 data-key 가져오기

            console.log("Sub button clicked:", subButtonKey);
            console.log("Base button key:", baseButtonKey);

            // Roll 버튼의 서브 버튼 기능 처리
            if (baseButtonKey === "roll") {
                const rollAttributeMap = {
                    "body": "body",
                    "sense": "sense",
                    "mind": "mind",
                    "social": "social"
                };
                const selectedAttribute = rollAttributeMap[subButtonKey];
                if (selectedAttribute) {
                    console.log("Executing roll for:", selectedAttribute);
                    await this.executeRoll(selectedAttribute);
                }
            }
            
            // Combo 버튼의 서브 버튼 기능 처리
            else if (baseButtonKey === "combo") {
                const comboFunctionMap = {
                    "setup": () => console.log("Setup 기능 실행"),
                    "initiative": () => console.log("Initiative 기능 실행"),
                    "minor": () => console.log("Minor 기능 실행"),
                    "major": () => console.log("Major 기능 실행"),
                    "reaction": () => console.log("Reaction 기능 실행"),
                    "auto": () => console.log("Auto 기능 실행"),
                    "cleanup": () => console.log("Cleanup 기능 실행"),
                    "always": () => console.log("Always 기능 실행"),
                    "extradata": () => console.log("ExtraData 기능 실행")
                };
                const selectedComboFunction = comboFunctionMap[subButtonKey];
                if (selectedComboFunction) {
                    console.log("Executing Combo function for:", subButtonKey);
                    selectedComboFunction();
                }
            }

            // 다른 베이스 버튼의 서브 버튼 기능 처리
            else {
                console.log(`${baseButtonKey}의 서브 버튼 기능 실행`);
                // 다른 베이스 버튼의 서브 버튼에 대한 기능 추가 가능
            }
        });
    }

    // 공통적인 롤 기능을 함수로 분리
    async executeRoll(attribute) {
        const selectedTokens = canvas.tokens.controlled;

        if (selectedTokens.length !== 1) {
            ui.notifications.info("select a token");
            return;
        }

        const token = selectedTokens[0];
        const actor = token.actor;

        // Get a list of skills
        const skills = actor.system.attributes.skills;

        // Filter only skills associated with the selected attribute
        let base = Object.entries(skills).filter(([key, skill]) => skill.base === attribute);

        // Configuring dialog options
        let options = `<button class="attribute-btn" data-attribute="${attribute}">${game.i18n.localize(`DX3rd.${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`)}</button><br/>`;
        options += `<hr>`;
        for (let [key, skill] of base) {
            const skillName = skill.name.startsWith("DX3rd.") 
                ? game.i18n.localize(skill.name)
                : skill.name;
            options += `<button class="skill-btn" data-skill="${key}">${skillName}</button><br/>`;
        }

        // Generating Dialog HTML
        let content = `
            <div style="text-align: center;">
                ${options}
            </div>
        `;

        // Show dialog
        let testDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`),
            content: content,
            buttons: {},
            render: (html) => {
                // Run roll on skill button clicks
                html.find('.skill-btn').click(async (event) => {
                    const selectedSkillKey = $(event.currentTarget).data('skill');
                    const selectedSkill = skills[selectedSkillKey];
                    const title = selectedSkill.name.startsWith("DX3rd.") 
                        ? game.i18n.localize(selectedSkill.name)
                        : selectedSkill.name;

                    const diceOptions = {
                        base: selectedSkill.base,
                        skill: selectedSkillKey
                    };

                    await actor.rollDice(title, diceOptions, false);

                    // close dialog
                    testDialog.close();
                });

                // Run roll on attribute button clicks
                html.find('.attribute-btn').click(async (event) => {
                    const selectedAttributeKey = $(event.currentTarget).data('attribute');
                    const title = game.i18n.localize(`DX3rd.${selectedAttributeKey.charAt(0).toUpperCase() + selectedAttributeKey.slice(1)}`);

                    const diceOptions = {
                        base: selectedAttributeKey,
                        skill: null
                    };

                    await actor.rollDice(title, diceOptions, false);

                    // close dialog
                    testDialog.close();
                });
            }
        }).render(true);
    }

    getData() {
        return {
            buttons: [
                {
                    name: `${game.i18n.localize("DX3HUD.Roll")}`,
                    key: "roll",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Body")}`, key: "body" },
                        { name: `${game.i18n.localize("DX3rd.Sense")}`, key: "sense" },
                        { name: `${game.i18n.localize("DX3rd.Mind")}`, key: "mind" },
                        { name: `${game.i18n.localize("DX3rd.Social")}`, key: "social" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Combo")}`,
                    key: "combo",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Setup")}`, key: "setup" },
                        { name: `${game.i18n.localize("DX3rd.Initiative")}`, key: "initiative" },
                        { name: `${game.i18n.localize("DX3rd.Minor")}`, key: "minor" },
                        { name: `${game.i18n.localize("DX3rd.Major")}`, key: "major" },
                        { name: `${game.i18n.localize("DX3rd.Reaction")}`, key: "reaction" },
                        { name: `${game.i18n.localize("DX3rd.Auto")}`, key: "auto" },
                        { name: `${game.i18n.localize("DX3rd.Cleanup")}`, key: "cleanup" },
                        { name: `${game.i18n.localize("DX3rd.Always")}`, key: "always" },
                        { name: `${game.i18n.localize("DX3rd.ExtraData")}`, key: "extradata" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Effect")}`,
                    key: "effect",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Setup")}`, key: "setup" },
                        { name: `${game.i18n.localize("DX3rd.Initiative")}`, key: "initiative" },
                        { name: `${game.i18n.localize("DX3rd.Minor")}`, key: "minor" },
                        { name: `${game.i18n.localize("DX3rd.Major")}`, key: "major" },
                        { name: `${game.i18n.localize("DX3rd.Reaction")}`, key: "reaction" },
                        { name: `${game.i18n.localize("DX3rd.Auto")}`, key: "auto" },
                        { name: `${game.i18n.localize("DX3rd.Cleanup")}`, key: "cleanup" },
                        { name: `${game.i18n.localize("DX3rd.Always")}`, key: "always" },
                        { name: `${game.i18n.localize("DX3rd.ExtraData")}`, key: "extradata" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Psionics")}`,
                    key: "psionics",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Setup")}`, key: "setup" },
                        { name: `${game.i18n.localize("DX3rd.Initiative")}`, key: "initiative" },
                        { name: `${game.i18n.localize("DX3rd.Minor")}`, key: "minor" },
                        { name: `${game.i18n.localize("DX3rd.Major")}`, key: "major" },
                        { name: `${game.i18n.localize("DX3rd.Reaction")}`, key: "reaction" },
                        { name: `${game.i18n.localize("DX3rd.Auto")}`, key: "auto" },
                        { name: `${game.i18n.localize("DX3rd.Cleanup")}`, key: "cleanup" },
                        { name: `${game.i18n.localize("DX3rd.Always")}`, key: "always" },
                        { name: `${game.i18n.localize("DX3rd.ExtraData")}`, key: "extradata" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Spell")}`,
                    key: "spell",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.NormalSpell")}`, key: "normalspell" },
                        { name: `${game.i18n.localize("DX3rd.SignSpell")}`, key: "signspell" },
                        { name: `${game.i18n.localize("DX3rd.Summon")}`, key: "summon" },
                        { name: `${game.i18n.localize("DX3rd.Evocation")}`, key: "evocation" },
                        { name: `${game.i18n.localize("DX3rd.Ritual")}`, key: "ritual" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Item")}`,
                    key: "item",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Weapon")}`, key: "weapon" },
                        { name: `${game.i18n.localize("DX3rd.Protect")}`, key: "protect" },
                        { name: `${game.i18n.localize("DX3rd.Vehicle")}`, key: "vehicle" },
                        { name: `${game.i18n.localize("DX3rd.Connection")}`, key: "connection" },
                        { name: `${game.i18n.localize("DX3rd.Book")}`, key: "book" },
                        { name: `${game.i18n.localize("DX3rd.Etc")}`, key: "etc" },
                        { name: `${game.i18n.localize("DX3rd.Once")}`, key: "once" }
                    ]
                },
                {
                    name: `${game.i18n.localize("DX3rd.Rois")}`,
                    key: "rois",
                    subButtons: [
                        { name: `${game.i18n.localize("DX3rd.Rois")}`, key: "rois" },
                        { name: `${game.i18n.localize("DX3rd.Memory")}`, key: "memory" }
                    ]
                },
                { name: `${game.i18n.localize("DX3rd.BackTrack")}`, key: "backtrack" } // 이 버튼은 서브 버튼이 없음
            ]
        }
    }
    setPosition() {
        this.element[0].style.left = "100px";
        this.element[0].style.top = "100px";
    }
}