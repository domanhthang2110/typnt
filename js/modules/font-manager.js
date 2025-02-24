import TextBoxManager from './textbox.js';

export default class FontManager {
  constructor(textBoxManager) {  // Accept textBoxManager as parameter
    this.fonts = new Map();
    this.fontListElement = document.getElementById('font-list');
    this.fontInfoElement = document.getElementById('font-info');
    this.textBoxManager = textBoxManager;  // Store the reference
    
    this.setupEventListeners();
    this.init();
  }

  setupEventListeners() {
    // Listen for textbox state/font updates
    document.addEventListener('textbox-updated', (e) => {
      const { font, state } = e.detail;
      
      // Only update UI if textbox is selected or being edited
      if (state === 'default') return;

      // Scroll to active font in font list
      if (font.family !== 'inherit') {
        this.scrollToFont(font.family);
      }

      // Update feature toggles with current settings
      this.updateFeatureToggles(font.features);

      // Show font info if available
      const fontInfo = this.fonts.get(font.family);
      if (fontInfo) {
        this.showFontInfo(fontInfo);
      }
    });
  }

  init() {
    this.loadFontsFromDirectory('/fonts/');
  }

  async loadFontsFromDirectory(directory) {
    try {
      const response = await fetch(directory);
      const dirList = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(dirList, 'text/html');
      
      const fontFiles = Array.from(doc.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href.match(/\.(ttf|otf|woff|woff2)$/i));

      for (const fontUrl of fontFiles) {
        const fontInfo = await this.loadFont(fontUrl);
        if (fontInfo) {
          this.createFontCard(fontInfo);
        }
      }
    } catch (error) {
      console.error('Error loading fonts directory:', error);
    }
  }

  async loadFont(fontPath) {
    try {
        const response = await fetch(fontPath);
        const arrayBuffer = await response.arrayBuffer();
        const font = opentype.parse(arrayBuffer);
        
        const fontInfo = {
            name: this.getFontName(font, 'fontFamily'),
            source: fontPath,
            style: this.getFontName(font, 'fontSubfamily'),
            font: font  // Store the parsed font object
        };

        this.fonts.set(fontInfo.name, fontInfo);
        this.createFontCard(fontInfo);
        
    } catch (error) {
        console.error('Failed to load font:', error);
    }
  }

  getFontName(font, name) {
    if (!font.names[name]) return null;
    return (
      font.names[name].en ||
      font.names[name]['en-US'] ||
      font.names[name]['en-GB'] ||
      Object.values(font.names[name])[0]
    );
  }

  getOpenTypeFeatures(font) {
    if (!font) return [];
    
    const features = new Set();

    // Get GSUB features
    if (font.tables.gsub) {
      const gsub = font.tables.gsub;
      if (gsub.features) {
        for (let feature of Object.values(gsub.features)) {
          if (feature.tag) {
            features.add(feature.tag);
          }
        }
      }
    }

    // Get GPOS features
    if (font.tables.gpos) {
      const gpos = font.tables.gpos;
      if (gpos.features) {
        for (let feature of Object.values(gpos.features)) {
          if (feature.tag) {
            features.add(feature.tag);
          }
        }
      }
    }

    console.log('Found features:', Array.from(features)); // Debug output
    return Array.from(features);
  }

  createFontCard(fontInfo) {
    const card = document.createElement('div');
    card.className = 'font-card';
    
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-family: "${fontInfo.name}";
        src: url("${fontInfo.source}");
      }
    `;
    document.head.appendChild(style);
    
    const nameEl = document.createElement('div');
    nameEl.className = 'font-card__name';
    nameEl.textContent = fontInfo.name;
    nameEl.style.fontFamily = fontInfo.name;
    
    const infoEl = document.createElement('div');
    infoEl.className = 'font-card__info';
    infoEl.innerHTML = `
      <span>${fontInfo.style}</span>
      ${fontInfo.isMonospaced ? '<span>Monospaced</span>' : ''}
      <span>${fontInfo.glyphCount} glyphs</span>
    `;
    
    const previewEl = document.createElement('div');
    previewEl.className = 'font-card__preview';
    previewEl.textContent = 'AaBbCc 123';
    previewEl.style.fontFamily = fontInfo.name;
    
    card.appendChild(nameEl);
    card.appendChild(infoEl);
    card.appendChild(previewEl);
    
    card.addEventListener('click', (e) => {
      // Prevent event from bubbling up to playground
      e.stopPropagation();
      
      if (!this.textBoxManager) return;

      // Update the active textbox with new font settings
      this.textBoxManager.updateActiveTextBoxFont({
        name: fontInfo.name,
        features: this.getOpenTypeFeatures(fontInfo.font)
      });

      // Update UI state without affecting textbox selection
      this.updateFontCardSelection(card);
    });
    
    this.fontListElement.appendChild(card);
  }

  scrollToFont(fontFamily) {
    const fontCard = Array.from(this.fontListElement.querySelectorAll('.font-card'))
      .find(card => card.querySelector('.font-card__name').textContent === fontFamily);
      
    if (fontCard) {
      fontCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  updateFontCardSelection(selectedCard) {
    document.querySelectorAll('.font-card').forEach(card => 
      card.classList.toggle('active', card === selectedCard)
    );
  }

  showFontInfo(fontInfo) {
    this.fontInfoElement.innerHTML = `
      <div class="font-info__name">
        <h2>${fontInfo.name}</h2>
        ${fontInfo.style ? `<h3>${fontInfo.style}</h3>` : ''}
      </div>

      <div class="font-info__meta">
        ${fontInfo.version ? `<p>Version ${fontInfo.version}</p>` : ''}
        ${fontInfo.designer ? `<p>Designed by ${fontInfo.designer}</p>` : ''}
        ${fontInfo.manufacturer ? `<p>Published by ${fontInfo.manufacturer}</p>` : ''}
      </div>

      <div class="font-info__details">
        <div class="font-info__metrics">
          <h3>Metrics</h3>
          <dl>
            <dt>Ascender</dt><dd>${fontInfo.metrics.ascender}</dd>
            <dt>Descender</dt><dd>${fontInfo.metrics.descender}</dd>
            <dt>Line Gap</dt><dd>${fontInfo.metrics.lineGap}</dd>
            <dt>x-Height</dt><dd>${fontInfo.metrics.xHeight}</dd>
            <dt>Cap Height</dt><dd>${fontInfo.metrics.capHeight}</dd>
          </dl>
        </div>

        <div class="font-info__features">
          <h3>OpenType Features (${fontInfo.features.length})</h3>
          <div class="feature-tags">
            ${fontInfo.features.map(f => `<span class="feature-tag">${f}</span>`).join('')}
          </div>
        </div>
      </div>

      ${fontInfo.copyright ? `
        <div class="font-info__legal">
          <p class="copyright">${fontInfo.copyright}</p>
          ${fontInfo.license ? `<p class="license">${fontInfo.license}</p>` : ''}
        </div>
      ` : ''}
    `;
  }

  updateSettingsPanel(fontInfo) {
    console.log('Updating settings panel with:', fontInfo); // Debug log
    const settingsContent = document.querySelector('#settings-panel .panel__content-wrapper');
    if (!settingsContent) {
        console.error('Settings panel content wrapper not found');
        return;
    }

    settingsContent.innerHTML = ''; // Clear existing content
    
    if (!fontInfo || !fontInfo.features || !fontInfo.features.length) {
        settingsContent.innerHTML = '<p>No OpenType features available</p>';
        return;
    }

    const featureSection = document.createElement('div');
    featureSection.className = 'feature-toggles';
    
    const title = document.createElement('h3');
    title.className = 'settings__title';
    title.textContent = `OpenType Features (${fontInfo.features.length})`;
    featureSection.appendChild(title);

    // Sort features alphabetically
    const sortedFeatures = [...fontInfo.features].sort();

    // Create toggles for each feature
    sortedFeatures.forEach(tag => {
      const toggle = document.createElement('div');
      toggle.className = 'feature-toggle';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `feature-${tag}`;
      checkbox.className = 'feature-toggle__input';
      
      const label = document.createElement('label');
      label.htmlFor = `feature-${tag}`;
      label.className = 'feature-toggle__label';
      label.innerHTML = `
        <div class="feature-toggle__info">
          <span class="feature-toggle__text">${tag}</span>
        </div>
      `;
      
      toggle.appendChild(checkbox);
      toggle.appendChild(label);
      featureSection.appendChild(toggle);
      
      checkbox.addEventListener('change', (e) => {
        this.toggleFeature(tag, e.target.checked);
      });
    });

    settingsContent.innerHTML = '';
    settingsContent.appendChild(featureSection);
  }

  toggleFeature(tag, enabled) {
    if (!this.textBoxManager) return;
    
    this.textBoxManager.updateActiveTextBoxFont({
      features: {
        [tag]: enabled ? 1 : 0
      }
    });
  }

  updateUIForTextbox(settings) {
    if (!settings) return;
    console.log('Updating UI for textbox settings:', settings);

    // Select the correct font card
    document.querySelectorAll('.font-card').forEach(card => {
      const fontName = card.querySelector('.font-card__name').textContent;
      card.classList.toggle('active', fontName === settings.name);
    });

    // Update feature toggles based on stored settings
    document.querySelectorAll('.feature-toggle__input').forEach(toggle => {
      const featureTag = toggle.id.replace('feature-', '');
      toggle.checked = settings.features && featureTag in settings.features;
    });
  }
}