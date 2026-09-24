/*
 * Custom Decap CMS widget "focuspoint".
 *
 * Lets an editor pick which vertical part of an already-uploaded image stays
 * visible, by dragging directly on the photo — instead of guessing between
 * "oben/mitte/unten". Shows a live, correctly-cropped preview for every
 * place that image is actually used on the site (a field can declare several
 * `previews`, since e.g. a Tagesimpuls photo is cropped both as a square
 * tile and as a 4:3 detail image).
 *
 * Stored value is a plain number 0–100 (percent from the top), which the
 * templates feed straight into `object-position: center <value>%`.
 *
 * Config (per field):
 *   widget: "focuspoint"
 *   image_field: "image"       // name of the sibling image field to preview (default "image")
 *   default: 50
 *   previews:                  // one box per place this image is cropped on the site
 *     - { label: "Kachel", aspect: "1/1" }
 *     - { label: "Detailseite", aspect: "4/3" }
 *
 * Only works for fields at the top level of an entry (not inside a "list"
 * widget) since that's the only place Decap lets a custom widget reliably
 * read a sibling field's value.
 */
(function () {
  function clampPct(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function toNumber(value, fallback) {
    if (typeof value === "number" && !isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) return Number(value);
    if (value === "top") return 0;
    if (value === "bottom") return 100;
    if (value === "center") return 50;
    return fallback;
  }

  var FocuspointControl = createClass({
    getDefaultPct: function () {
      var field = this.props.field;
      return toNumber(field.get("default"), 50);
    },
    getPct: function () {
      return clampPct(toNumber(this.props.value, this.getDefaultPct()));
    },
    getImageUrl: function () {
      var field = this.props.field;
      var imageFieldName = field.get("image_field") || "image";
      var entry = this.props.getEntry ? this.props.getEntry() : this.props.entry;
      if (!entry) return null;
      var imagePath = entry.getIn(["data", imageFieldName]);
      if (!imagePath) return null;
      try {
        var asset = this.props.getAsset(imagePath, field);
        return asset ? asset.toString() : null;
      } catch (e) {
        return null;
      }
    },
    setFromClientY: function (clientY) {
      var el = this._dragArea;
      if (!el) return;
      var rect = el.getBoundingClientRect();
      if (rect.height === 0) return;
      var pct = ((clientY - rect.top) / rect.height) * 100;
      this.props.onChange(clampPct(pct));
    },
    handleMouseDown: function (e) {
      e.preventDefault();
      this.setFromClientY(e.clientY);
      this._onMove = this.handleMouseMove.bind(this);
      this._onUp = this.handleMouseUp.bind(this);
      window.addEventListener("mousemove", this._onMove);
      window.addEventListener("mouseup", this._onUp);
    },
    handleMouseMove: function (e) {
      this.setFromClientY(e.clientY);
    },
    handleMouseUp: function () {
      window.removeEventListener("mousemove", this._onMove);
      window.removeEventListener("mouseup", this._onUp);
    },
    handleTouchStart: function (e) {
      if (e.touches && e.touches[0]) this.setFromClientY(e.touches[0].clientY);
    },
    handleTouchMove: function (e) {
      if (e.touches && e.touches[0]) {
        e.preventDefault();
        this.setFromClientY(e.touches[0].clientY);
      }
    },
    handleSlider: function (e) {
      this.props.onChange(clampPct(Number(e.target.value)));
    },
    componentWillUnmount: function () {
      if (this._onMove) window.removeEventListener("mousemove", this._onMove);
      if (this._onUp) window.removeEventListener("mouseup", this._onUp);
    },
    render: function () {
      var self = this;
      var pct = this.getPct();
      var imageUrl = this.getImageUrl();
      var field = this.props.field;
      var previewsRaw = field.get("previews");
      var previews = previewsRaw && previewsRaw.toJS ? previewsRaw.toJS() : [];

      var wrapperStyle = { border: "1px solid #4a4a55", borderRadius: "4px", padding: "14px", background: "#1e1e29" };
      var labelStyle = { fontSize: "12px", color: "#b3b3c0", marginBottom: "8px" };

      if (!imageUrl) {
        return h(
          "div",
          { style: wrapperStyle },
          h("div", { style: labelStyle }, "Bitte zuerst oben ein Bild hochladen — danach kannst du hier den Bildausschnitt festlegen.")
        );
      }

      var dragArea = h(
        "div",
        {
          ref: function (el) { self._dragArea = el; },
          onMouseDown: this.handleMouseDown,
          onTouchStart: this.handleTouchStart,
          onTouchMove: this.handleTouchMove,
          style: {
            position: "relative",
            width: "100%",
            maxWidth: "420px",
            cursor: "row-resize",
            userSelect: "none",
            touchAction: "none",
            overflow: "hidden",
            borderRadius: "3px",
          },
        },
        h("img", { src: imageUrl, draggable: false, style: { width: "100%", display: "block", pointerEvents: "none" } }),
        h("div", {
          style: {
            position: "absolute",
            left: 0,
            right: 0,
            top: pct + "%",
            height: "0",
            borderTop: "2px solid #ff6a3d",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.4)",
            transform: "translateY(-1px)",
            pointerEvents: "none",
          },
        }),
        h("div", {
          style: {
            position: "absolute",
            left: "8px",
            top: pct + "%",
            transform: pct > 85 ? "translateY(-100%)" : "translateY(4px)",
            background: "#ff6a3d",
            color: "#160a04",
            fontSize: "11px",
            fontWeight: "bold",
            padding: "2px 6px",
            borderRadius: "3px",
            pointerEvents: "none",
          },
        }, pct + "%")
      );

      var previewBoxes = previews.length
        ? h(
            "div",
            { style: { display: "flex", flexWrap: "wrap", gap: "16px", marginTop: "14px" } },
            previews.map(function (p, i) {
              return h(
                "div",
                { key: i, style: { width: "150px" } },
                h("div", { style: labelStyle }, p.label || "Vorschau"),
                h(
                  "div",
                  { style: { width: "100%", aspectRatio: p.aspect || "4/3", overflow: "hidden", borderRadius: "3px", background: "#000" } },
                  h("img", {
                    src: imageUrl,
                    style: { width: "100%", height: "100%", objectFit: "cover", objectPosition: "center " + pct + "%" },
                  })
                )
              );
            })
          )
        : null;

      return h(
        "div",
        { style: wrapperStyle },
        h("div", { style: labelStyle }, "Auf dem Foto ziehen, um den sichtbaren Ausschnitt festzulegen:"),
        dragArea,
        h("input", {
          type: "range",
          min: 0,
          max: 100,
          value: pct,
          onChange: this.handleSlider,
          style: { width: "100%", maxWidth: "420px", marginTop: "10px" },
        }),
        previewBoxes
      );
    },
  });

  var FocuspointPreview = createClass({
    render: function () {
      var pct = clampPct(toNumber(this.props.value, 50));
      return h("div", {}, "Bildausschnitt: " + pct + "% von oben");
    },
  });

  CMS.registerWidget("focuspoint", FocuspointControl, FocuspointPreview);
})();
