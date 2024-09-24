class DX3HUD extends Application {
    constructor() {
        super();
        this.currentOpenedButton = null;  // Track the currently open base-button
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "dx3-HUD",
            template: "modules/dx3rd-HUD/templates/button.hbs",  // Set the template path
            resizable: false,
            width: 200,
            height: 'auto',
            popOut: false,
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Show/hide sub buttons when Base button is clicked
        html.on("click", ".dx3-button-wrapper", (event) => {
            console.log("Base button clicked:", event.currentTarget);
            const buttonWrapper = event.currentTarget;
            const subButtonGroup = buttonWrapper.querySelector('.sub-buttons');

            // Close an existing open sub button
            if (this.currentOpenedButton && this.currentOpenedButton !== buttonWrapper) {
                const previousSubButtons = this.currentOpenedButton.querySelector('.sub-buttons');
                if (previousSubButtons) previousSubButtons.style.display = 'none';
            }

            // Open/Close subbuttons of a clicked button
            if (subButtonGroup) {
                const isOpen = subButtonGroup.style.display === 'flex';
                subButtonGroup.style.display = isOpen ? 'none' : 'flex';
                this.currentOpenedButton = isOpen ? null : buttonWrapper;
            }
        });

        // run function
        html.on("click", ".dx3-sub-button", async (event) => {
            const baseButtonKey = this.currentOpenedButton?.getAttribute('data-key');  // Get the data-key for the base button
            const subButtonKey = event.currentTarget.getAttribute('data-key');  // Get the data-key of a sub-button

            console.log("Sub button clicked:", subButtonKey);
            console.log("Base button key:", baseButtonKey);

            // Execute roll button's sub-button function
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

            // Execute combo button's sub-button function
            else if (baseButtonKey === "combo") {
                const timing = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.excuteComboAndEffect(agent, timing, "combo");
            }

            // Execute effect button's sub-button function
            else if (baseButtonKey === "effect") {
                const timing = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.excuteComboAndEffect(agent, timing, "effect");
            }

            // Execute psionics button's sub-button function
            else if (baseButtonKey === "psionics") {
                const timing = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.executePsionics(agent, timing);
            }

            // Execute spell button's sub-button function
            else if (baseButtonKey === "spell") {
            }

            // Execute item button's sub-button function
            else if (baseButtonKey === "item") {
            }

            // Execute rois button's sub-button function
            else if (baseButtonKey === "rois") {
            }

            // Execute backtrack button's sub-button function
            else {
            }
        });
    }

    // roll function
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
        let options = `<button class="attribute-btn ability" data-attribute="${attribute}">${game.i18n.localize(`DX3rd.${attribute.charAt(0).toUpperCase() + attribute.slice(1)}`)}</button><br/>`;
        options += `<hr>`;
        for (let [key, skill] of base) {
            const skillName = skill.name.startsWith("DX3rd.")
                ? game.i18n.localize(skill.name)
                : skill.name;
            options += `<button class="skill-btn skill" data-skill="${key}">${skillName}</button><br/>`;
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
                // Skill button click triggers _onRollSkill
                html.find('.skill-btn').click(async (event) => {
                    // closest() 메서드를 적용할 수 있는 구조를 생성
                    const li = document.createElement('li');
                    li.classList.add('skill');
                    li.dataset.skillId = $(event.currentTarget).data('skill');
                    const fakeEvent = {
                        currentTarget: li,
                        preventDefault: () => { }
                    };
                    await actor.sheet._onRollSkill(fakeEvent);

                    // close dialog
                    testDialog.close();
                });

                // Attribute button click triggers _onRollAbility
                html.find('.attribute-btn').click(async (event) => {
                    // closest() 메서드를 적용할 수 있는 구조를 생성
                    const li = document.createElement('li');
                    li.classList.add('ability');
                    li.dataset.abilityId = $(event.currentTarget).data('attribute');
                    const fakeEvent = {
                        currentTarget: li,
                        preventDefault: () => { }
                    };
                    await actor.sheet._onRollAbility(fakeEvent);

                    // close dialog
                    testDialog.close();
                });
            }
        }).render(true);
    }

    // excute combo dialog or effect dialog
    async excuteComboAndEffect(agent, timing, itemType) {
        let currentEP = Number(agent.system.attributes.encroachment.value);
        let targets = Array.from(game.user.targets || []);

        function parseDiceValue(value) {
            if (!value) return 0;

            // Treat 'd10' or 'D10' as 10
            const dicePattern = /(\d+)[dD]10/g;
            let totalValue = 0;

            // Process the dice part first and the rest separately
            let diceValue = value.replace(dicePattern, (match, diceCount) => {
                return diceCount * 10;
            });

            // Calculate the remaining digits with eval() (e.g., handle the +5 in '1d10+5')
            totalValue = eval(diceValue);

            return totalValue;
        }

        // Function for filtering items based on timing and item type(combo & effect)
        function getFilteredItems(agent, timing, currentEP, targets, itemType) {
            return agent.items
                .filter((item) => {
                    let limit = item.system.limit;
                    limit = Number(limit);
                    if (isNaN(limit)) {
                        limit = 0;
                    }
                    const matchesTiming = item.system.timing === timing || item.system.timing === "major-reaction" && (timing === "major" || timing === "reaction");
                    const matchesType = itemType === "combo" ? item.data.type === "combo" : (item.data.type === "effect" || item.data.type === "easy");

                    if (targets.length > 0) {
                        return matchesTiming && matchesType && limit <= currentEP && item.system.getTarget;
                    } else {
                        return matchesTiming && matchesType && limit <= currentEP && !item.system.getTarget;
                    }
                })
                .sort((a, b) => {
                    // Step 1: Sort by limit (lower limit first)
                    let limitA = Number(a.system.limit);
                    let limitB = Number(b.system.limit);
                    if (isNaN(limitA) || limitA === 0) limitA = -Infinity;
                    if (isNaN(limitB) || limitB === 0) limitB = -Infinity;
                    if (limitA !== limitB) return limitA - limitB;

                    // Step 2: Sort by encroach value
                    let encroachA = parseDiceValue(a.system.encroach.value);
                    let encroachB = parseDiceValue(b.system.encroach.value);
                    return encroachA - encroachB;
                });
        }

        // Generate dialog content
        let filteredItems = getFilteredItems(agent, timing, currentEP, targets, itemType);

        function createDialogContent(filteredItems) {
            let content = "";
            filteredItems.forEach((item) => {
                let limit = Number(item.system.limit);
                let encroach = item.system.encroach.value;
                if (isNaN(limit)) limit = 0;

                let itemName = item.name;
                let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";
                let limitText = limit !== 0 ? ` (${limit}%)` : "";
                content += `<button class="macro-button" data-item-id="${item.id}">${itemName}${encroachText}${limitText}</button>`;
            });
            return content;
        }

        let dialogContent = createDialogContent(filteredItems);
        if (!dialogContent) {
            let message = targets.length > 0 ? "There are no items with the selected timing and target." : "There are no items with the selected timing.";
            ui.notifications.info(message);
            return;
        }

        let reactivateButton = `<hr><button class="macro-button" id="reactivate-button">${game.i18n.localize("DX3HUD.Recall")}</button>`;

        let callDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.${timing.charAt(0).toUpperCase() + timing.slice(1)}`),
            content: dialogContent + reactivateButton,
            buttons: {},
            close: () => { },
            render: (html) => {
                html.find(".macro-button").click((ev) => {
                    let itemId = ev.currentTarget.dataset.itemId;
                    let item = agent.items.get(itemId);
                    if (ev.currentTarget.id === "reactivate-button") {
                        callDialog.close();
                        excuteComboAndEffect(agent, timing, itemType);  // Reopen the dialog
                    } else {
                        if (item) {
                            item.toMessage();
                            callDialog.close();
                        }
                    }
                });
            }
        });
        callDialog.render(true);
    }

    // excute psionic dialog
    async executePsionics(agent, timing) {
        let currentEP = Number(agent.system.attributes.encroachment.value);
        let targets = Array.from(game.user.targets || []);

        function parseDiceValue(value) {
            if (!value) return 0;

            // Treat 'd10' or 'D10' as 10
            const dicePattern = /(\d+)[dD]10/g;
            let totalValue = 0;

            // Process the dice part first and the rest separately
            let diceValue = value.replace(dicePattern, (match, diceCount) => {
                return diceCount * 10;
            });

            // Calculate the remaining digits with eval() (e.g., handle the +5 in '1d10+5')
            totalValue = eval(diceValue);

            return totalValue;
        }

        // Function for filtering items based on timing and item type(psionics)
        function getFilteredPsionicsItems(agent, timing, currentEP, targets) {
            return agent.items
                .filter((item) => {
                    let limit = item.system.limit;
                    limit = Number(limit);
                    if (isNaN(limit)) {
                        limit = 0;
                    }
                    const matchesTiming = item.system.timing === timing || item.system.timing === "major-reaction" && (timing === "major" || timing === "reaction");
                    const isPsionics = item.data.type === "psionic";

                    if (targets.length > 0) {
                        return matchesTiming && isPsionics && limit <= currentEP && item.system.getTarget;
                    } else {
                        return matchesTiming && isPsionics && limit <= currentEP && !item.system.getTarget;
                    }
                })
                .sort((a, b) => {
                    // Step 1: Sort by limit (lower limit first)
                    let limitA = Number(a.system.limit);
                    let limitB = Number(b.system.limit);
                    if (isNaN(limitA) || limitA === 0) limitA = -Infinity;
                    if (isNaN(limitB) || limitB === 0) limitB = -Infinity;
                    if (limitA !== limitB) return limitA - limitB;

                    // Step 2: Sort by hp value
                    let hpA = parseDiceValue(a.system.hp.value);
                    let hpB = parseDiceValue(b.system.hp.value);
                    return hpA - hpB;
                });
        }

        // Generate dialog content for psionics
        let filteredItems = getFilteredPsionicsItems(agent, timing, currentEP, targets);

        function createDialogContent(filteredItems) {
            let content = "";
            filteredItems.forEach((item) => {
                let limit = Number(item.system.limit);
                let hp = item.system.hp.value;
                if (isNaN(limit)) limit = 0;

                let itemName = item.name;
                let hpText = hp ? ` (${game.i18n.localize("DX3rd.HP")}: ${hp})` : "";
                let limitText = limit !== 0 ? ` (${limit}%)` : "";
                content += `<button class="macro-button" data-item-id="${item.id}">${itemName}${hpText}${limitText}</button>`;
            });
            return content;
        }

        let dialogContent = createDialogContent(filteredItems);
        if (!dialogContent) {
            let message = targets.length > 0 ? "There are no psionics items with the selected timing and target." : "There are no psionics items with the selected timing.";
            ui.notifications.info(message);
            return;
        }

        let reactivateButton = `<hr><button class="macro-button" id="reactivate-button">${game.i18n.localize("DX3HUD.Recall")}</button>`;

        let callDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.${timing.charAt(0).toUpperCase() + timing.slice(1)}`),
            content: dialogContent + reactivateButton,
            buttons: {},
            close: () => { },
            render: (html) => {
                html.find(".macro-button").click((ev) => {
                    let itemId = ev.currentTarget.dataset.itemId;
                    let item = agent.items.get(itemId);
                    if (ev.currentTarget.id === "reactivate-button") {
                        callDialog.close();
                        executePsionics(agent, timing);  // Reopen the dialog
                    } else {
                        if (item) {
                            item.toMessage();
                            callDialog.close();
                        }
                    }
                });
            }
        });
        callDialog.render(true);
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
                { name: `${game.i18n.localize("DX3rd.BackTrack")}`, key: "backtrack" } // This button has no subbuttons
            ]

        }
    }

    setPosition() {
        this.element[0].style.left = "60px";
        this.element[0].style.top = "80px";
    }
}
