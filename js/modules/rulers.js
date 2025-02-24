export default class RulerManager {
  constructor() {
    this.playground = document.querySelector(".playground");
    this.rulerColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--tblack2').trim();
    this.textColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--white").trim();
    this.dpr = Math.max(2, window.devicePixelRatio || 1); // Force minimum 2x scaling
    this.setupRulers();
    this.drawRulers();
  }

  setupRulers() {
    // Create rulers if they don't exist
    if (!document.getElementById("horizontal-ruler")) {
      const hRuler = document.createElement("canvas");
      hRuler.id = "horizontal-ruler";
      hRuler.className = "ruler ruler--horizontal";
      this.playground.appendChild(hRuler);
    }

    if (!document.getElementById("vertical-ruler")) {
      const vRuler = document.createElement("canvas");
      vRuler.id = "vertical-ruler";
      vRuler.className = "ruler ruler--vertical";
      this.playground.appendChild(vRuler);
    }

    if (!document.querySelector(".ruler__corner")) {
      const corner = document.createElement("div");
      corner.className = "ruler__corner";
      this.playground.appendChild(corner);
    }

    // Setup resize observer
    this.resizeObserver = new ResizeObserver(() => this.drawRulers());
    this.resizeObserver.observe(this.playground);
  }

  drawRulers() {
    this.drawHorizontalRuler();
    this.drawVerticalRuler();
  }

  drawHorizontalRuler() {
    const canvas = document.getElementById("horizontal-ruler");
    const ctx = canvas.getContext("2d", { alpha: false });
    const width = this.playground.clientWidth - 25;

    // Set canvas size accounting for device pixel ratio
    canvas.width = width * this.dpr;
    canvas.height = 25 * this.dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = "25px";

    // Scale context for crisp text
    ctx.scale(this.dpr, this.dpr);
    
    // Enable font smoothing
    ctx.imageSmoothingEnabled = false;
    
    // Draw background
    ctx.fillStyle = this.rulerColor;
    ctx.fillRect(1, 0, width, 25);

    // Draw ticks and numbers with proper font
    ctx.fillStyle = this.textColor;
    ctx.font = '10px inherit'; // Fixed font size
    ctx.textBaseline = "middle";

    for (let i = 0; i < width; i += 50) {
      // Draw main notch
      ctx.fillRect(i + 1, 15, 1, 8);

      // Handle text alignment differently for 0
      if (i === 0) {
        ctx.textAlign = "left";
        ctx.fillText(i.toString(), 4, 10);
      } else {
        ctx.textAlign = "center";
        ctx.fillText(i.toString(), i + 1, 10);
      }

      // Draw small notch at midpoint
      if (i + 25 < width) {
        ctx.fillRect(i + 26, 18, 1, 5); // Shorter and slightly lower
      }
    }
  }

  drawVerticalRuler() {
    const canvas = document.getElementById("vertical-ruler");
    const ctx = canvas.getContext("2d", { alpha: false });
    const height = this.playground.clientHeight - 25;

    // Set canvas size accounting for device pixel ratio
    canvas.width = 25 * this.dpr;
    canvas.height = height * this.dpr;
    canvas.style.width = "25px";
    canvas.style.height = `${height}px`;

    // Scale context for crisp text
    ctx.scale(this.dpr, this.dpr);
    
    // Enable font smoothing
    ctx.imageSmoothingEnabled = false;
    
    // Draw background
    ctx.fillStyle = this.rulerColor;
    ctx.fillRect(0, 1, 25, height);

    // Draw ticks and numbers with proper font
    ctx.fillStyle = this.textColor;
    ctx.font = '10px inherit'; // Fixed font size
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < height; i += 50) {
      // Draw main notch
      ctx.fillRect(17, i + 1, 6, 1);
      
      // Draw rotated number
      ctx.save();
      ctx.translate(12, i + 1);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(i.toString(), 0, 0);
      ctx.restore();

      // Draw small notch at midpoint
      if (i + 25 < height) {
        ctx.fillRect(19, i + 26, 4, 1); // Shorter and more inward
      }
    }
  }
}
