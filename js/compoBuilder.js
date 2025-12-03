/**
 * Gestionnaire du builder de composition
 */

const compoBuilder = {
    monsters: [null, null, null],
    
    /**
     * Retourne le HTML du builder
     */
    getCompoHTML() {
        return `
            <div class="compo-builder">
                <h2>Créer une Composition</h2>
                <p style="color: var(--text-secondary); margin-bottom: 20px;">Sélectionnez 3 monstres pour créer votre composition</p>
                
                <div class="compo-search-section">
                    ${[0, 1, 2].map(i => `
                        <div class="compo-slot" id="slot-${i}">
                            <div class="slot-label">Monstre ${i + 1}</div>
                            <input type="text" class="monster-search" placeholder="Chercher un monstre..." data-slot="${i}">
                            <div class="search-results" id="results-${i}"></div>
                            <div id="selected-${i}"></div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="compo-display" id="compo-display">
                    <div class="compo-display-monsters" id="compo-monsters-display"></div>
                </div>
            </div>
        `;
    },
    
    /**
     * Attache les événements aux éléments
     */
    attachEventListeners() {
        document.querySelectorAll('.monster-search').forEach(input => {
            input.addEventListener('input', (e) => this.handleSearch(e));
            input.addEventListener('focus', (e) => {
                if (e.target.value.length > 0) {
                    document.getElementById(`results-${e.target.dataset.slot}`).classList.add('show');
                }
            });
        });
        
        document.querySelectorAll('.clear-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const slot = parseInt(e.target.dataset.slot);
                this.clearSlot(slot);
            });
        });
    },
    
    /**
     * Gère la recherche de monstres
     */
    async handleSearch(event) {
        const query = event.target.value.trim();
        const slot = parseInt(event.target.dataset.slot);
        const resultsDiv = document.getElementById(`results-${slot}`);
        
        if (query.length < 1) {
            resultsDiv.classList.remove('show');
            return;
        }
        
        try {
            const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                resultsDiv.innerHTML = data.results
                    .map((m, idx) => {
                        const dataJson = JSON.stringify({
                            name: m.name,
                            image: m.image,
                            element: m.element,
                            archetype: m.archetype
                        });
                        return `
                            <div class="search-result-item" data-monster='${dataJson}' onclick="compoBuilder.selectMonsterFromResult(${slot}, this)">
                                <strong>${escapeHtml(m.name)}</strong> 
                                <span style="font-size: 12px; color: #999;">
                                    ${m.element} - ${m.archetype}
                                    ${m.awaken_level === 2 ? ' (2A)' : ''}
                                </span>
                            </div>
                        `;
                    }).join('');
                resultsDiv.classList.add('show');
            } else {
                resultsDiv.innerHTML = '<div class="search-result-item" style="color: #999;">Aucun résultat</div>';
                resultsDiv.classList.add('show');
            }
        } catch (error) {
            console.error('Erreur recherche:', error);
        }
    },
    
    /**
     * Sélectionne un monstre à partir du résultat de recherche
     */
    async selectMonsterFromResult(slot, element) {
        try {
            const data = JSON.parse(element.dataset.monster);
            console.log('Données du monstre:', data);
            await this.selectMonster(slot, data.name, data.image, data.element, data.archetype);
        } catch (error) {
            console.error('Erreur parsing monstre:', error);
        }
    },
    
    /**
     * Sélectionne un monstre pour un slot
     */
    async selectMonster(slot, name, image, element, archetype) {
        console.log(`Sélection monstre: ${name}, image: ${image}`);
        
        this.monsters[slot] = { name, image, element, archetype };
        
        document.querySelector(`input[data-slot="${slot}"]`).value = name;
        document.getElementById(`results-${slot}`).classList.remove('show');
        
        const selectedDiv = document.getElementById(`selected-${slot}`);
        selectedDiv.innerHTML = `
            <div class="selected-monster">
                <img src="${image || ''}" alt="${escapeHtml(name)}" onerror="console.log('Image load error for: ${escapeHtml(name)}')">
                <div class="selected-monster-info">
                    <div class="selected-monster-name">${escapeHtml(name)}</div>
                    <div class="selected-monster-type">${element} - ${archetype}</div>
                </div>
                <button class="clear-button" data-slot="${slot}" onclick="compoBuilder.clearSlot(${slot})">✕</button>
            </div>
        `;
        
        // Réattacher les événements des boutons clear
        this.attachEventListeners();
        this.updateCompoDisplay();
    },
    
    /**
     * Vide un slot
     */
    clearSlot(slot) {
        this.monsters[slot] = null;
        document.querySelector(`input[data-slot="${slot}"]`).value = '';
        document.getElementById(`selected-${slot}`).innerHTML = '';
        this.updateCompoDisplay();
    },
    
    /**
     * Met à jour l'affichage de la composition
     */
    updateCompoDisplay() {
        const filledSlots = this.monsters.filter(m => m !== null).length;
        const display = document.getElementById('compo-display');
        
        if (filledSlots > 0) {
            display.classList.add('active');
            
            // Section des monstres sélectionnés (à droite, en haut)
            const monstersSection = document.createElement('div');
            monstersSection.className = 'compo-display-section monsters-section';
            
            let monstersHtml = `
                <div class="compo-display-title">Votre Composition</div>
                <div class="compo-display-monsters">
            `;
            
            monstersHtml += this.monsters
                .filter(m => m !== null)
                .map(m => `
                    <div class="compo-monster">
                        <img src="${m.image}" alt="${escapeHtml(m.name)}">
                        <div class="compo-monster-name">${escapeHtml(m.name)}</div>
                    </div>
                `).join('');
            
            monstersHtml += '</div>';
            monstersSection.innerHTML = monstersHtml;
            
            // Section des joueurs (à droite, en bas)
            const playersSection = document.createElement('div');
            playersSection.className = 'compo-display-section players-section';
            
            const playersWithCompo = findPlayersWithCompo(this.monsters);
            playersSection.innerHTML = generatePlayersListHTML(playersWithCompo, this.monsters);
            
            // Vider et remplir le container
            const monstersDisplay = document.getElementById('compo-monsters-display');
            monstersDisplay.innerHTML = '';
            monstersDisplay.appendChild(monstersSection);
            monstersDisplay.appendChild(playersSection);
        } else {
            display.classList.remove('active');
        }
    }
};
