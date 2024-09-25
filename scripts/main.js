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

        // Checks each base button, hiding the sub buttons if they are empty, and hiding the base button as well if all sub buttons are empty.
        html.find('.dx3-button-wrapper').each((index, element) => {
            const baseButtonKey = $(element).attr('data-key');
            
            // Exception handling: do not hide roll, rois, and backtrack buttons
            if (baseButtonKey === "roll" || baseButtonKey === "rois" || baseButtonKey === "backtrack") {
                $(element).show();
                return;
            }
        
            const subButtons = $(element).find('.sub-buttons .dx3-sub-button');
        
            let hasVisibleSubButtons = false;
        
            subButtons.each((subIndex, subElement) => {
                const subButtonKey = $(subElement).attr('data-key');
        
                // Check the sub-button has a corresponding item
                const itemsForSubButton = this.getItemsForSubButton(baseButtonKey, subButtonKey);
        
                if (itemsForSubButton.length > 0) {
                    $(subElement).show();
                    hasVisibleSubButtons = true;
                } else {
                    $(subElement).hide();
                }
            });
        
            // If all sub buttons are hidden, the base button is also hidden
            if (!hasVisibleSubButtons) {
                $(element).hide();
            } else {
                $(element).show();
            }
        });

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

        // run sub-button's function
        html.on("click", ".dx3-sub-button", async (event) => {
            const baseButtonKey = this.currentOpenedButton?.getAttribute('data-key');  // Get the data-key for the base button
            const subButtonKey = event.currentTarget.getAttribute('data-key');  // Get the data-key of a sub-button

            console.log("Sub button clicked:", subButtonKey);
            console.log("Base button key:", baseButtonKey);

            // Execute roll button's sub-button function
            if (baseButtonKey === "roll") {
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                const rollAttributeMap = {
                    "body": "body",
                    "sense": "sense",
                    "mind": "mind",
                    "social": "social"
                };
                const selectedAttribute = rollAttributeMap[subButtonKey];
                if (selectedAttribute) {
                    console.log("Executing roll for:", selectedAttribute);
                    await this.executeRoll(agent, selectedAttribute);
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

                await this.excuteCombosOrEffects(agent, timing, "combo");
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

                await this.excuteCombosOrEffects(agent, timing, "effect");
            }

            // Execute psionics button's sub-button function
            else if (baseButtonKey === "psionic") {
                const timing = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.excutePsionics(agent, timing);
            }

            // Execute spell button's sub-button function
            else if (baseButtonKey === "spell") {
                const type = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.excuteSpells(agent, type);
            }

            // Execute item button's sub-button function
            else if (baseButtonKey === "item") {
                const type = subButtonKey;
                let selectedTokens = canvas.tokens.controlled;
                if (selectedTokens.length !== 1) {
                    ui.notifications.info("select a token");
                    return;
                }

                let token = selectedTokens[0];
                let agent = token.actor;

                await this.excuteItems(agent, type);
            }
        });

        // Add a single event handler for both rois and backtrack buttons
        html.on("click", ".dx3-button-wrapper[data-key='rois'], .dx3-button-wrapper[data-key='backtrack']", async (event) => {
            let selectedTokens = canvas.tokens.controlled;
            if (selectedTokens.length !== 1) {
                ui.notifications.info("select a token");
                return;
            }

            let token = selectedTokens[0];
            let agent = token.actor;
            const baseButtonKey = event.currentTarget.getAttribute('data-key'); // Get the data-key of the clicked button

            if (baseButtonKey === 'rois') {
                console.log("Executing rois function");
                await this.excuteRois(agent);
            } else if (baseButtonKey === 'backtrack') {
                console.log("Executing backtrack function");
                await this.excuteBackTrack(agent);
            }
        });
    }

    // roll function
    async executeRoll(agent, attribute) {

        // Get a list of skills
        const skills = agent.system.attributes.skills;

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
                    const li = document.createElement('li');
                    li.classList.add('skill');
                    li.dataset.skillId = $(event.currentTarget).data('skill');
                    const fakeEvent = {
                        currentTarget: li,
                        preventDefault: () => { }
                    };
                    await agent.sheet._onRollSkill(fakeEvent);

                    // close dialog
                    testDialog.close();
                });

                // Attribute button click triggers _onRollAbility
                html.find('.attribute-btn').click(async (event) => {
                    const li = document.createElement('li');
                    li.classList.add('ability');
                    li.dataset.abilityId = $(event.currentTarget).data('attribute');
                    const fakeEvent = {
                        currentTarget: li,
                        preventDefault: () => { }
                    };
                    await agent.sheet._onRollAbility(fakeEvent);

                    // close dialog
                    testDialog.close();
                });
            }
        }).render(true);
    }

    // excute combo dialog or effect dialog
    async excuteCombosOrEffects(agent, timing, itemType) {
        let currentEP = Number(agent.system.attributes.encroachment.value);
        let targets = Array.from(game.user.targets || []);

        function parseDiceValue(value) {
            // Check if the value is undefined or null and return 0
            if (!value || typeof value !== "string") return 0;

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
                    let limit = Number(item.system.limit);
                    if (isNaN(limit)) limit = 0;

                    const matchesTiming = item.system.timing === timing || item.system.timing === "major-reaction" && (timing === "major" || timing === "reaction");
                    const matchesType = itemType === "combo" ? item.data.type === "combo" : item.data.type === "effect";

                    if (targets.length > 0) {
                        return matchesTiming && matchesType && limit <= currentEP && item.system.getTarget;
                    } else {
                        return matchesTiming && matchesType && limit <= currentEP && !item.system.getTarget;
                    }
                })
                .sort((a, b) => {
                    let limitA = Number(a.system.limit);
                    let limitB = Number(b.system.limit);
                    if (isNaN(limitA) || limitA === 0) limitA = -Infinity;
                    if (isNaN(limitB) || limitB === 0) limitB = -Infinity;
                    if (limitA !== limitB) return limitA - limitB;

                    let encroachA = parseDiceValue(a.system.encroach.value);
                    let encroachB = parseDiceValue(b.system.encroach.value);
                    return encroachA - encroachB;
                });
        }

        // Logic to check if the item is fully used (based on usedFull logic)
        function isItemFullyUsed(used, level) {
            let max = used.max + (used.level ? level : 0);
            return (used.disable != 'notCheck' && used.state >= max);
        }

        // Logic to check if a combo is fully used (based on usedFullForCombo logic)
        function isComboFullyUsed(agent, combo) {
            const effectItems = combo.system.effect;
            for (let e of effectItems) {
                if (e == "-") continue;
                let effect = agent.items.find(element => element._id == e);
                let used = effect.system.used;
                if (isItemFullyUsed(used, effect.system.level.value)) {
                    return true; // Combo is fully used
                }
            }
            return false; // Combo is not fully used
        }

        // Generate dialog content
        let filteredItems = getFilteredItems(agent, timing, currentEP, targets, itemType);

        function createDialogContent(filteredItems) {
            let content = "";

            filteredItems.forEach((item) => {
                let limit = Number(item.system.limit);
                if (isNaN(limit) || item.system.limit === "-") {
                    limit = 0;
                }
                let encroach = item.system.encroach.value;

                let isDisabled = false;
                let style = "";

                // Apply usedFull logic for effect items
                if (item.data.type === "effect" && isItemFullyUsed(item.system.used, item.system.level.value)) {
                    isDisabled = true;
                }

                // Apply usedFullForCombo logic for combo items
                if (item.data.type === "combo" && isComboFullyUsed(agent, item)) {
                    isDisabled = true;
                }

                if (isDisabled) {
                    style = 'style="background-color: black; color: white;"';  // 사용 불가 상태일 경우 검은색 배경, 흰색 글씨
                }

                let itemName = item.name;
                let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";
                let limitText = limit !== 0 ? ` (${limit}%)` : "";
                content += `<button class="macro-button" data-item-id="${item.id}" ${style}>${itemName}${encroachText}${limitText}</button>`;
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

                    // Disable button click for fully used items
                    if (ev.currentTarget.style.backgroundColor === "black") {
                        ev.preventDefault(); // Do nothing if the item is fully used
                        return;
                    }

                    if (ev.currentTarget.id === "reactivate-button") {
                        callDialog.close();
                        this.excuteCombosOrEffects(agent, timing, itemType);  // Reopen the dialog
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
    async excutePsionics(agent, timing) {
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

        // Logic to check if the item is fully used (based on usedFull logic)
        function isItemFullyUsed(used, level) {
            let max = used.max + (used.level ? level : 0);
            return (used.disable != 'notCheck' && used.state >= max);
        }

        // Generate dialog content for psionics
        let filteredItems = getFilteredPsionicsItems(agent, timing, currentEP, targets);

        function createDialogContent(filteredItems) {
            let content = "";
            filteredItems.forEach((item) => {
                let limit = Number(item.system.limit);
                if (isNaN(limit) || item.system.limit === "-") {
                    limit = 0;
                }
                let hp = item.system.hp.value;

                let isDisabled = false;
                let style = "";

                // Apply usedFull logic for effect items
                if (isItemFullyUsed(item.system.used, item.system.level.value)) {
                    isDisabled = true;
                }

                if (isDisabled) {
                    style = 'style="background-color: black; color: white;"';
                }

                let itemName = item.name;
                let hpText = hp ? ` (${game.i18n.localize("DX3rd.HP")}: ${hp})` : "";
                let limitText = limit !== 0 ? ` (${limit}%)` : "";
                content += `<button class="macro-button" data-item-id="${item.id}" ${style}>${itemName}${hpText}${limitText}</button>`;
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

                    // Disable button click for fully used items
                    if (ev.currentTarget.style.backgroundColor === "black") {
                        ev.preventDefault(); // Do nothing if the item is fully used
                        return;
                    }

                    if (ev.currentTarget.id === "reactivate-button") {
                        callDialog.close();
                        this.excutePsionics(agent, timing);  // Reopen the dialog
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

    // excute spell dialog
    async excuteSpells(agent, type) {
        let targets = Array.from(game.user.targets || []);

        function parseDiceValue(value) {
            if (!value) return 0;

            const dicePattern = /(\d+)[dD]10/g;
            let totalValue = 0;

            let diceValue = value.replace(dicePattern, (match, diceCount) => {
                return diceCount * 10;
            });

            totalValue = eval(diceValue);

            return totalValue;
        }

        // Function for filtering items based on spelltype
        function getFilteredItems(agent, type, targets) {
            return agent.items
                .filter((item) => {
                    const matchesType = item.system.spelltype === type
                        || item.system.spelltype === "NormalKeep" && type === "NormalSpell"
                        || item.system.spelltype === "RitualKeep" && type === "Ritual"
                        || item.system.spelltype === "RitualCurse" && type === "Ritual"
                        || item.system.spelltype === "SummonRitual" && (type === "Summon" || type === "Ritual")
                        || item.system.spelltype === "EvocationRitual" && (type === "Evocation" || type === "Ritual");
                    const isSpell = item.data.type === "spell";
                    if (targets.length > 0) {
                        return matchesType && isSpell && item.system.getTarget;
                    } else {
                        return matchesType && isSpell && !item.system.getTarget;
                    }
                })
                .sort((a, b) => {
                    let encroachA = parseDiceValue(a.system.encroach.value);
                    let encroachB = parseDiceValue(b.system.encroach.value);
                    return encroachA - encroachB;
                });
        }

        let filteredItems = getFilteredItems(agent, type, targets);

        function createDialogContent(filteredItems) {
            let content = "";

            // Create buttons for NormalSpell
            if (type === "NormalSpell") {
                let normalSpellItems = filteredItems.filter(item => item.system.spelltype === "NormalSpell");
                let normalKeepItems = filteredItems.filter(item => item.system.spelltype === "NormalKeep");

                // Add buttons for each category
                normalSpellItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.NormalSpell")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if (normalSpellItems.length > 0 && normalKeepItems.length > 0) {
                    content += `<hr>`;
                }

                normalKeepItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.NormalKeep")}: ${item.name}${encroachText}</button><br/>`;
                });
            }

            // Create buttons for SignSpell
            else if (type === "SignSpell") {
                let signSpellItems = filteredItems.filter(item => item.system.spelltype === "SignSpell");

                signSpellItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.SignSpell")}: ${item.name}${encroachText}</button><br/>`;
                });
            }

            // Create buttons for Summon
            else if (type === "Summon") {
                let summonItems = filteredItems.filter(item => item.system.spelltype === "Summon");
                let summonRitualItems = filteredItems.filter(item => item.system.spelltype === "SummonRitual");

                summonItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.Summon")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if (summonItems.length > 0 && summonRitualItems.length > 0) {
                    content += `<hr>`;
                }

                summonRitualItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.SummonRitual")}: ${item.name}${encroachText}</button><br/>`;
                });
            }

            // Create buttons for Evocation
            else if (type === "Evocation") {
                let evocationItems = filteredItems.filter(item => item.system.spelltype === "Evocation");
                let evocationRitualItems = filteredItems.filter(item => item.system.spelltype === "EvocationRitual");

                evocationItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.Evocation")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if (evocationItems.length > 0 && evocationRitualItems.length > 0) {
                    content += `<hr>`;
                }

                evocationRitualItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.EvocationRitual")}: ${item.name}${encroachText}</button><br/>`;
                });
            }

            // Create buttons for Ritual
            else {
                let ritualItems = filteredItems.filter(item => item.system.spelltype === "Ritual");
                let curseItems = filteredItems.filter(item => item.system.spelltype === "RitualCurse");
                let ritualKeepItems = filteredItems.filter(item => item.system.spelltype === "RitualKeep");
                let summonRitualItems = filteredItems.filter(item => item.system.spelltype === "SummonRitual");
                let evocationRitualItems = filteredItems.filter(item => item.system.spelltype === "EvocationRitual");

                ritualItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.Ritual")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if ((curseItems.length > 0 || ritualKeepItems.length > 0 || summonRitualItems.length > 0 || evocationRitualItems.length > 0) && ritualItems.length > 0) {
                    content += `<hr>`;
                }

                curseItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.RitualCurse")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if ((ritualKeepItems.length > 0 || summonRitualItems.length > 0 || evocationRitualItems.length > 0) && curseItems.length > 0) {
                    content += `<hr>`;
                }

                ritualKeepItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.RitualKeep")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if ((summonRitualItems.length > 0 || evocationRitualItems.length > 0) && ritualKeepItems.length > 0) {
                    content += `<hr>`;
                }

                summonRitualItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.SummonRitual")}: ${item.name}${encroachText}</button><br/>`;
                });

                // Separator
                if ((evocationRitualItems.length > 0) && summonRitualItems.length > 0) {
                    content += `<hr>`;
                }

                evocationRitualItems.forEach(item => {
                    let encroach = item.system.encroach.value;
                    let encroachText = encroach ? ` (${game.i18n.localize("DX3rd.Encroach")}: ${encroach})` : "";

                    content += `<button class="spell-btn" data-item-id="${item.id}">${game.i18n.localize("DX3rd.EvocationRitual")}: ${item.name}${encroachText}</button><br/>`;
                });
            }

            return content;
        }

        let dialogContent = createDialogContent(filteredItems);

        if (!dialogContent) {
            ui.notifications.info("There are no items with the selected spell type.");
            return;
        }

        let spellDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.${type}`),
            content: dialogContent,
            buttons: {},
            render: (html) => {
                html.find(".spell-btn").click((ev) => {
                    let itemId = ev.currentTarget.dataset.itemId;
                    let item = agent.items.get(itemId);
                    if (item) {
                        item.toMessage();
                        spellDialog.close();
                    }
                });
            }
        });
        spellDialog.render(true);
    }

    // excute item dialog
    async excuteItems(agent, type) {
        // Function for filtering items based on item type(weapon, protect, vehicle, connection, book, etc, once)
        function getFilteredItems(agent) {
            return agent.items
                .filter((item) => {
                    const matchesType = item.data.type === type ||
                        (["book", "etc", "once"].includes(type) && item.data.type === "item" && item.system.type === type);  // 추가 필터링

                    return matchesType;
                });
        }

        // Generate dialog content for items
        let filteredItems = getFilteredItems(agent);

        function createDialogContent(filteredItems) {
            let content = "";
            filteredItems.forEach((item) => {
                let itemName = item.name;
                content += `<button class="macro-button" data-item-id="${item.id}">${itemName}</button>`;
            });
            return content;
        }

        let dialogContent = createDialogContent(filteredItems);
        if (!dialogContent) {
            let message = "There are no items items with the selected type.";
            ui.notifications.info(message);
            return;
        }

        let callDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.${type.charAt(0).toUpperCase() + type.slice(1)}`),
            content: dialogContent,
            buttons: {},
            close: () => { },
            render: (html) => {
                html.find(".macro-button").click((ev) => {
                    let itemId = ev.currentTarget.dataset.itemId;
                    let item = agent.items.get(itemId);
                    if (item) {
                        item.toMessage();
                        callDialog.close();
                    }
                });
            }
        });
        callDialog.render(true);
    }

    // excute rois dialog
    async excuteRois(agent) {
        // Function for filtering items based on item type(rois, memory)
        function getFilteredItems(agent) {
            return agent.items
                .filter((item) => {
                    const matchesType = item.data.type === "rois";
                    return matchesType;
                });
        }

        // Generate dialog content for items
        let filteredItems = getFilteredItems(agent);

        function createDialogContent(filteredItems) {
            let content = "";
            let descriptedItems = filteredItems.filter(item => item.system.type === "D");
            let superierItems = filteredItems.filter(item => item.system.type === "S");
            let justItems = filteredItems.filter(item => item.system.type === "-");
            let memoryItems = filteredItems.filter(item => item.system.type === "M");

            function generateButton(item, label) {
                // Check for titus and sublimation
                if (item.system.sublimation) {
                    return ""; // Don't display the button if sublimation exists
                }
                let style = "";
                if (item.system.titus) {
                    style = 'style="background-color: black; color: white;"'; // Black button with white text if titus exists
                }

                let itemName = item.name;
                return `<button class="macro-button" data-item-id="${item.id}" ${style}>${label}: ${itemName}</button>`;
            }

            let activeDescriptedItems = descriptedItems.filter(item => !item.system.sublimation);
            let activeSuperierItems = superierItems.filter(item => !item.system.sublimation);
            let activeJustItems = justItems.filter(item => !item.system.sublimation);
            let activeMemoryItems = memoryItems.filter(item => !item.system.sublimation);

            // Descripted items
            descriptedItems.forEach((item) => {
                content += generateButton(item, game.i18n.localize("DX3rd.Descripted"));
            });

            // Separator
            if ((activeSuperierItems.length > 0 || activeJustItems.length > 0 || activeMemoryItems.length > 0) && activeDescriptedItems.length > 0) {
                content += `<hr>`;
            }

            // Superier items
            superierItems.forEach((item) => {
                content += generateButton(item, game.i18n.localize("DX3rd.Superier"));
            });

            // Separator
            if ((activeJustItems.length > 0 || activeMemoryItems.length > 0) && activeSuperierItems.length > 0) {
                content += `<hr>`;
            }

            // Just items
            justItems.forEach((item) => {
                content += generateButton(item, game.i18n.localize("DX3rd.Rois"));
            });

            // Separator
            if (activeMemoryItems.length > 0 && activeJustItems.length > 0) {
                content += `<hr>`;
            }

            // Memory items
            memoryItems.forEach((item) => {
                content += generateButton(item, game.i18n.localize("DX3rd.Memory"));
            });

            return content;
        }

        let dialogContent = createDialogContent(filteredItems);
        if (!dialogContent.trim()) {
            let message = "There are no items with the selected type.";
            ui.notifications.info(message);
            return;
        }

        let callDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.Rois`),
            content: dialogContent,
            buttons: {},
            close: () => { },
            render: (html) => {
                html.find(".macro-button").click((ev) => {
                    let itemId = ev.currentTarget.dataset.itemId;
                    let item = agent.items.get(itemId);
                    if (item) {
                        item.toMessage();
                        callDialog.close();
                    }
                });
            }
        });
        callDialog.render(true);
    }

    // excute backtrack dialog
    async excuteBackTrack(agent) {

        // Generating Dialog HTML
        let content = `
            <div style="display: grid; grid-template: column: grid-gap: 5px;">
                <button class="back-track-button" data-action="1">Yes</button>
                <button class="back-track-button" data-action="2">No</button>
            </div>
        `;

        // Show dialog
        let backtrackDialog = new Dialog({
            title: game.i18n.localize(`DX3rd.BackTrack`),
            content: content,
            buttons: {},
            render: (html) => {
                html.find(".back-track-button").click(async (ev) => {
                    let action = parseInt(ev.currentTarget.dataset.action);

                    switch (action) {
                        case 1:
                            // Yes button clicked, call rollBackTrack from actor-sheet.js
                            await agent.sheet.rollBackTrack();
                            break;
                        case 2:
                            // No action needed for No button
                            break;
                        default:
                            break;
                    }
                    backtrackDialog.close();
                });
            }
        });
        backtrackDialog.render(true);
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
                    key: "psionic",
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
                        { name: `${game.i18n.localize("DX3rd.NormalSpell")}`, key: "NormalSpell" },
                        { name: `${game.i18n.localize("DX3rd.SignSpell")}`, key: "SignSpell" },
                        { name: `${game.i18n.localize("DX3rd.Summon")}`, key: "Summon" },
                        { name: `${game.i18n.localize("DX3rd.Evocation")}`, key: "Evocation" },
                        { name: `${game.i18n.localize("DX3rd.Ritual")}`, key: "Ritual" }
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
                    key: "rois"
                }, // This button has no subbuttons
                {
                    name: `${game.i18n.localize("DX3rd.BackTrack")}`,
                    key: "backtrack"
                } // This button has no subbuttons
            ]

        }
    }

    // Function to get the item corresponding to the sub-button
    getItemsForSubButton(baseButtonKey, subButtonKey) {
        let selectedTokens = canvas.tokens.controlled;
        if (selectedTokens.length !== 1) return [];

        let token = selectedTokens[0];
        let agent = token.actor;

        if (baseButtonKey === "combo" || baseButtonKey === "effect" || baseButtonKey === "psionic") {
            const timing = subButtonKey;
            let items = agent.items.filter(item => item.system.timing === timing && item.data.type === baseButtonKey);
            return items;
        }

        if (baseButtonKey === "spell") {
            const spelltype = subButtonKey;
            let items = agent.items.filter(item => item.system.spelltype === spelltype
                || item.system.spelltype === "NormalKeep" && spelltype === "NormalSpell"
                || item.system.spelltype === "RitualKeep" && spelltype === "Ritual"
                || item.system.spelltype === "RitualCurse" && spelltype === "Ritual"
                || item.system.spelltype === "SummonRitual" && (spelltype === "Summon" || spelltype === "Ritual")
                || item.system.spelltype === "EvocationRitual" && (spelltype === "Evocation" || spelltype === "Ritual") && item.data.type === baseButtonKey);
            return items;
        }

        if (baseButtonKey === "item") {
            const type = subButtonKey;
            let items = agent.items.filter(item => item.data.type === type ||
                (["book", "etc", "once"].includes(type) && item.data.type === "item" && item.system.type === type));
            return items;
        }

        return [];
    }

    setPosition() {
        this.element[0].style.left = "60px";
        this.element[0].style.top = "80px";
    }
}