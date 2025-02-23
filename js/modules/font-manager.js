import TextBoxManager from './textbox.js';

export default class FontManager {
  constructor() {
    this.fonts = new Map();
    this.fontListElement = document.getElementById('font-list');
    this.fontInfoElement = document.getElementById('font-info');
    this.init();
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
      const buffer = await response.arrayBuffer();
      const font = opentype.parse(buffer);

      // Extract font info similar to FontDrop
      const fontInfo = {
        name: this.getFontName(font, 'fullName'),
        style: this.getFontName(font, 'preferredSubfamily') || this.getFontName(font, 'fontSubfamily'),
        version: this.getFontName(font, 'version'),
        designer: this.getFontName(font, 'designer'),
        manufacturer: this.getFontName(font, 'manufacturer'),
        copyright: this.getFontName(font, 'copyright'),
        license: this.getFontName(font, 'license'),
        
        tables: {
          os2: font.tables.os2,
          head: font.tables.head,
          hhea: font.tables.hhea,
          maxp: font.tables.maxp,
          post: font.tables.post
        },
        
        features: this.getOpenTypeFeatures(font),
        source: fontPath
      };

      // Add tables info
      fontInfo.isMonospaced = font.tables.post.isFixedPitch === 1;
      fontInfo.glyphCount = font.tables.maxp.numGlyphs;
      
      // Add metrics
      fontInfo.metrics = {
        ascender: font.tables.os2.sTypoAscender,
        descender: font.tables.os2.sTypoDescender,
        lineGap: font.tables.os2.sTypoLineGap,
        xHeight: font.tables.os2.sxHeight,
        capHeight: font.tables.os2.sCapHeight
      };

      return fontInfo;
    } catch (error) {
      console.error('Error loading font:', error);
      return null;
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
    
    card.addEventListener('click', () => {
      this.showFontInfo(fontInfo);
      this.updateSettingsPanel(fontInfo);
      document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      
      // Apply font to selected textbox
      if (TextBoxManager.selectedTextBox) {
        TextBoxManager.selectedTextBox.css('font-family', fontInfo.name);
      }
    });
    
    this.fontListElement.appendChild(card);
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
    const settingsContent = document.querySelector('#settings-panel .panel__content-wrapper');
    if (!settingsContent) return;

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
    // Apply feature to selected textbox if it exists
    if (TextBoxManager.selectedTextBox) {
      const features = {};
      features[tag] = enabled ? '1' : '0';
      
      // Get existing font features
      const currentStyle = TextBoxManager.selectedTextBox.get(0).style.fontFeatureSettings;
      const existingFeatures = {};
      if (currentStyle && currentStyle !== 'normal') {
        currentStyle.split(',').forEach(feat => {
          const [t, v] = feat.trim().replace(/['"]/g, '').split(' ');
          existingFeatures[t] = v;
        });
      }

      // Merge with new feature
      Object.assign(existingFeatures, features);

      // Apply all features
      const fontFeatureSettings = Object.entries(existingFeatures)
        .map(([t, v]) => `"${t}" ${v}`)
        .join(', ');

      TextBoxManager.selectedTextBox.css('fontFeatureSettings', fontFeatureSettings);
    }
  }
}